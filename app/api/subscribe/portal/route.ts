import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const PAYMENTS_URL = process.env.PAYMENTS_SERVICE_URL || 'https://payments.laurence.computer';
const PAYMENTS_KEY = process.env.PAYMENTS_API_KEY || '';

const prisma = new PrismaClient();

/**
 * POST /api/subscribe/portal - redirect user to billing portal
 * to manage their subscription (cancel, update payment method, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 });
    }

    const response = await fetch(`${PAYMENTS_URL}/api/payments/billing-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pay-Key': PAYMENTS_KEY,
      },
      body: JSON.stringify({
        customer_id: user.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/quiz-database`,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Payments] Billing portal service error:", response.status, errData);
      throw new Error(errData.error || `Payments service returned ${response.status}`);
    }

    const data = await response.json();

    console.log("[Payments] Portal session created for:", session.user.email);
    return NextResponse.json({ url: data.portal_url || data.url });
  } catch (error: any) {
    console.error("[Payments] Portal error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error creating portal session" },
      { status: 500 }
    );
  }
}
