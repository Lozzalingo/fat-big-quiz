import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { getProductImageUrl } from "@/utils/cdn";

// Lazy initialisation to avoid build-time errors
let stripe: Stripe;
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripe;
}

const prisma = new PrismaClient();

// Cart item shape sent from the frontend
interface CartItem {
  id: string;
  title: string;
  price: number;
  image?: string;
  amount: number;
  slug?: string;
  productType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both single-product and multi-product (cart) checkout
    const items: CartItem[] = body.items || [];
    const email: string | undefined = body.email;

    // Legacy single-product payload fallback
    if (items.length === 0 && body.productId) {
      items.push({
        id: body.productId,
        title: body.productName,
        price: body.price,
        image: body.imageUrl,
        amount: 1,
        slug: body.slug,
        productType: body.productType,
      });
    }

    if (items.length === 0) {
      console.log("[Stripe] Checkout rejected - no items");
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

    console.log("[Stripe] Checkout request:", {
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
    const hasDigitalDownload = items.some(
      (item) => item.productType === "DIGITAL_DOWNLOAD"
    );

    // Build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      items.map((item) => {
        const productData: any = {
          name: item.title,
          metadata: {
            productId: item.id,
            productType: item.productType || "DIGITAL_DOWNLOAD",
          },
        };

        // Add image if available (Stripe requires HTTPS URLs)
        const imageUrl = item.image
          ? getProductImageUrl(item.image)
          : undefined;
        if (imageUrl && imageUrl.startsWith("https://")) {
          productData.images = [imageUrl];
        }

        return {
          price_data: {
            currency: "gbp",
            product_data: productData,
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.amount,
        };
      });

    // For single product, use product-specific URLs. For cart, use generic ones.
    const isSingleProduct = items.length === 1;
    const firstItem = items[0];

    const successUrl = hasDigitalDownload
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/download/{CHECKOUT_SESSION_ID}`
      : `${process.env.NEXT_PUBLIC_BASE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = isSingleProduct && firstItem.slug
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/product/${firstItem.slug}?canceled=true`
      : `${process.env.NEXT_PUBLIC_BASE_URL}/cart`;

    // Store product IDs as JSON in metadata for the webhook
    const productIds = items.map((item) => item.id);
    const productSlugs = items.map((item) => item.slug || "").filter(Boolean);

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email || undefined,
      metadata: {
        productIds: JSON.stringify(productIds),
        productSlugs: JSON.stringify(productSlugs),
        productType: firstItem.productType || "DIGITAL_DOWNLOAD",
        userId: userId || "",
        // Legacy single-product fields for backward compatibility
        ...(isSingleProduct && {
          productId: firstItem.id,
          slug: firstItem.slug || "",
        }),
      },
    });

    console.log("[Stripe] Checkout session created:", session.id, `(${items.length} items)`);
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("[Stripe] Checkout error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error creating checkout session" },
      { status: 500 }
    );
  }
}
