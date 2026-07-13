import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[HireEnquiry] Received enquiry:", JSON.stringify(body));

    const {
      tier,
      frequency,
      preferredDay,
      preferredTime,
      duration,
      venueName,
      venueType,
      venueCapacity,
      message,
      contactName,
      contactEmail,
      contactPhone,
    } = body;

    // Validate required fields
    if (!tier || !frequency || !venueName || !contactName || !contactEmail) {
      console.error("[HireEnquiry] Missing required fields");
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      console.error("[HireEnquiry] Invalid email:", contactEmail);
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Forward to Express server as a subscriber/lead
    // For now, store as a subscriber with hire metadata
    try {
      const subscriberRes = await fetch(`${API_BASE}/api/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contactEmail,
          name: contactName,
          source: "hire-enquiry",
          metadata: JSON.stringify({
            tier,
            frequency,
            preferredDay,
            preferredTime,
            duration,
            venueName,
            venueType,
            venueCapacity,
            message,
            contactPhone,
            submittedAt: new Date().toISOString(),
          }),
        }),
      });

      if (!subscriberRes.ok) {
        const errText = await subscriberRes.text();
        console.error("[HireEnquiry] Subscriber API error:", errText);
        // Don't fail the whole request if subscriber storage fails
      } else {
        console.log("[HireEnquiry] Stored as subscriber lead");
      }
    } catch (subErr: any) {
      console.error("[HireEnquiry] Failed to store subscriber:", subErr.message);
      // Non-critical - continue
    }

    // TODO: Send notification email to hire@fatbigquiz.com
    // TODO: Send confirmation email to the enquirer
    console.log("[HireEnquiry] Enquiry processed successfully for:", venueName);

    return NextResponse.json({
      success: true,
      message: "Enquiry received. We will be in touch within 24 hours.",
    });
  } catch (err: any) {
    console.error("[HireEnquiry] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
