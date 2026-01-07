import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

// Lazy initialization to avoid build-time errors
let stripe: Stripe;
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia",
    });
  }
  return stripe;
}

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, productName, price, email, productType, slug, imageUrl } = body;

    if (!productId || !productName || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If email provided (logged-in user), look up their userId
    let userId: string | null = null;
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      userId = user?.id || null;
    }

    // Determine success URL based on product type
    const successUrl =
      productType === "DIGITAL_DOWNLOAD"
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/download/{CHECKOUT_SESSION_ID}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`;

    // Build product data with optional image and description
    const productData: any = {
      name: productName,
      metadata: {
        productId,
        productType,
        slug,
      },
    };

    // Add image if provided (Stripe requires HTTPS URLs)
    if (imageUrl && imageUrl.startsWith("https://")) {
      productData.images = [imageUrl];
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: productData,
            unit_amount: Math.round(price * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/product/${slug}?canceled=true`,
      customer_email: email || undefined,
      metadata: {
        productId,
        productType,
        slug,
        userId: userId || "", // Include userId in metadata for webhook
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Error creating checkout session" },
      { status: 500 }
    );
  }
}
