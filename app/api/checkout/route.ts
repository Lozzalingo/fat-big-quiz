import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getProductImageUrl } from "@/utils/cdn";

const PAYMENTS_URL = process.env.PAYMENTS_SERVICE_URL || 'https://payments.laurence.computer';
const PAYMENTS_KEY = process.env.PAYMENTS_API_KEY || '';

const prisma = new PrismaClient();

// Cart item shape sent from the frontend
interface CartItem {
  id: string;
  amount: number;
  slug?: string;
}

// DB product shape from Prisma select
interface DbProduct {
  id: string;
  title: string;
  price: number;
  mainImage: string | null;
  productType: string | null;
  slug: string;
}

// In-memory rate limiter (10 requests per minute per IP)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  rateLimits.forEach((entry, ip) => {
    if (now > entry.resetAt) rateLimits.delete(ip);
  });
}, 60 * 1000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  entry.count++;
  return entry.count <= 10;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      console.log("[Payments] Checkout rate limit exceeded for IP:", ip);
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Support both single-product and multi-product (cart) checkout
    const items: CartItem[] = body.items || [];
    const email: string | undefined = body.email;

    // Legacy single-product payload fallback
    if (items.length === 0 && body.productId) {
      items.push({
        id: body.productId,
        amount: 1,
        slug: body.slug,
      });
    }

    if (items.length === 0) {
      console.log("[Payments] Checkout rejected - no items");
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

    // Look up all products from the database (never trust client-supplied prices)
    const productIds = items.map((item) => item.id);
    const dbProducts: DbProduct[] = await (prisma as any).product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, price: true, mainImage: true, productType: true, slug: true },
    });

    const productMap = new Map<string, DbProduct>(dbProducts.map((p) => [p.id, p]));

    // Validate all products exist
    const missingIds = productIds.filter((id) => !productMap.has(id));
    if (missingIds.length > 0) {
      console.log("[Payments] Checkout rejected - invalid product IDs:", missingIds);
      return NextResponse.json(
        { error: "One or more products not found" },
        { status: 400 }
      );
    }

    console.log("[Payments] Checkout request:", {
      itemCount: items.length,
      email: email ? "provided" : "guest",
    });

    // Look up userId if email provided
    let userId: string | null = null;
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      userId = user?.id || null;
    }

    // Determine if any item is a digital download (for success URL)
    const hasDigitalDownload = items.some((item) => {
      const product = productMap.get(item.id)!;
      return product.productType === "DIGITAL_DOWNLOAD";
    });

    // Build line items using DB prices only
    const lineItems = items.map((item) => {
      const product = productMap.get(item.id)!;

      const productData: Record<string, any> = {
        name: product.title,
        metadata: {
          productId: product.id,
          productType: product.productType || "DIGITAL_DOWNLOAD",
        },
      };

      // Add image if available (requires HTTPS URLs)
      const imageUrl = product.mainImage
        ? getProductImageUrl(product.mainImage)
        : undefined;
      if (imageUrl && imageUrl.startsWith("https://")) {
        productData.images = [imageUrl];
      }

      return {
        price_data: {
          currency: "gbp",
          product_data: productData,
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.amount,
      };
    });

    // For single product, use product-specific URLs. For cart, use generic ones.
    const isSingleProduct = items.length === 1;
    const firstItem = items[0];
    const firstProduct = productMap.get(firstItem.id)!;

    const successUrl = hasDigitalDownload
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/download/{CHECKOUT_SESSION_ID}`
      : `${process.env.NEXT_PUBLIC_BASE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = isSingleProduct && firstProduct.slug
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/product/${firstProduct.slug}?canceled=true`
      : `${process.env.NEXT_PUBLIC_BASE_URL}/cart`;

    // Store product IDs as JSON in metadata for the webhook
    const productSlugs = items
      .map((item) => productMap.get(item.id)?.slug || "")
      .filter(Boolean);

    const response = await fetch(`${PAYMENTS_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pay-Key': PAYMENTS_KEY,
      },
      body: JSON.stringify({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email || undefined,
        metadata: {
          productIds: JSON.stringify(productIds),
          productSlugs: JSON.stringify(productSlugs),
          productType: firstProduct.productType || "DIGITAL_DOWNLOAD",
          userId: userId || "",
          // Legacy single-product fields for backward compatibility
          ...(isSingleProduct && {
            productId: firstItem.id,
            slug: firstProduct.slug || "",
          }),
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Payments] Checkout service error:", response.status, errData);
      throw new Error(errData.error || `Payments service returned ${response.status}`);
    }

    const data = await response.json();

    console.log("[Payments] Checkout session created:", data.session_id || data.sessionId, `(${items.length} items)`);
    return NextResponse.json({ sessionId: data.session_id || data.sessionId, url: data.checkout_url || data.url });
  } catch (error: any) {
    console.error("[Payments] Checkout error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error creating checkout session" },
      { status: 500 }
    );
  }
}
