import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Fat Big Quiz",
  description: "Read the terms and conditions for Fat Big Quiz, including digital download policies, event bookings, cancellations, liability, and quiz participation guidelines.",
  openGraph: {
    title: "Terms & Conditions | Fat Big Quiz",
    description: "Terms and conditions for Fat Big Quiz, including digital download policies, event bookings, and liability.",
  },
};

export default function TermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary-dark to-primary-light text-white overflow-hidden">
        <div className="relative max-w-screen-xl mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight font-poppins">
            Terms &amp; Conditions
          </h1>
          <p className="text-lg text-white/70">
            Last updated: May 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-background py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 border border-border">
            <div className="prose prose-lg max-w-none prose-headings:text-text-primary prose-p:text-text-secondary prose-li:text-text-secondary prose-a:text-primary prose-a:no-underline hover:prose-a:underline">

              <h2>1. Introduction</h2>
              <p>
                These Terms and Conditions (&quot;Terms&quot;) govern your use of the Fat Big Quiz website
                (fatbigquiz.com), the purchase of digital products, and participation in Fat Big Quiz
                events. By purchasing a product, booking an event, or using our website, you agree to
                be bound by these Terms. Fat Big Quiz is operated by Fat Big Quiz Ltd, a company
                registered in England and Wales.
              </p>

              <h2>2. Definitions</h2>
              <ul>
                <li><strong>&quot;Fat Big Quiz,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;</strong> refers to Fat Big Quiz Ltd.</li>
                <li><strong>&quot;You,&quot; &quot;your,&quot; &quot;customer&quot;</strong> refers to the person making a purchase, booking, or using the website.</li>
                <li><strong>&quot;Product&quot;</strong> refers to any digital download, quiz pack, subscription, or other item available for purchase on our website.</li>
                <li><strong>&quot;Event&quot;</strong> refers to any quiz night, game show, or live experience provided by Fat Big Quiz.</li>
                <li><strong>&quot;Booking&quot;</strong> refers to a confirmed reservation for an event.</li>
              </ul>

              <h2>3. Digital Products &amp; Downloads</h2>
              <p>
                All digital products (quiz packs, question sets, music rounds, picture quizzes, etc.)
                are available for immediate download after purchase. Once a download link has been
                accessed, the product is considered delivered and is non-refundable, except where
                required by law.
              </p>
              <p>
                Download links are valid for a limited time and number of downloads as specified at
                the time of purchase. You are responsible for downloading and storing your files
                within this window.
              </p>
              <p>
                Digital products are licensed for personal or single-venue use unless otherwise stated.
                You may not redistribute, resell, or share purchased products without written permission
                from Fat Big Quiz.
              </p>

              <h2>4. Event Bookings</h2>
              <p>
                All event bookings are subject to availability. A booking is only confirmed once you
                receive written confirmation (via email) from Fat Big Quiz. For private events, a
                deposit may be required to secure your date. The booking holder is responsible for
                ensuring all participants are made aware of these Terms.
              </p>
              <p>
                By making a booking, you confirm that all information provided is accurate and complete.
                Fat Big Quiz reserves the right to cancel or refuse bookings at our discretion.
              </p>

              <h2>5. Pricing &amp; Payment</h2>
              <p>
                All prices displayed on our website are in British Pounds (GBP) and include VAT where
                applicable. Prices are subject to change without notice, but confirmed bookings and
                completed purchases will be honoured at the agreed price.
              </p>
              <p>
                Payment is processed securely via Stripe. For digital products, payment must be made
                in full at the time of purchase. For private events, payment terms will be outlined
                in your booking confirmation.
              </p>

              <h2>6. Cancellation &amp; Refund Policy</h2>
              <h3>Digital Products</h3>
              <p>
                Due to the nature of digital products, downloads are non-refundable once the download
                link has been accessed. If you experience technical issues with a product, please
                contact us and we will work to resolve the issue or provide a replacement.
              </p>
              <h3>Event Bookings</h3>
              <ul>
                <li><strong>More than 14 days before the event:</strong> Full refund minus deposit.</li>
                <li><strong>7 to 14 days before the event:</strong> 50% of the total booking fee is payable.</li>
                <li><strong>Less than 7 days before the event:</strong> Full booking fee is payable.</li>
              </ul>
              <p>
                Fat Big Quiz may, at its sole discretion, offer date transfers in lieu of refunds.
                All cancellations must be made in writing to{" "}
                <a href="mailto:info@fatbigquiz.com" data-action="terms_email">info@fatbigquiz.com</a>.
              </p>

              <h3>Cancellation by Fat Big Quiz</h3>
              <p>
                In the unlikely event that Fat Big Quiz needs to cancel an event (due to extreme weather,
                safety concerns, or other circumstances beyond our control), you will be offered a full
                refund or the option to reschedule at no additional cost.
              </p>

              <h2>7. Event Participation</h2>
              <p>
                Participants must behave responsibly during all events. Fat Big Quiz reserves the right
                to remove any participant whose behaviour is deemed dangerous, disruptive, or
                inappropriate, without refund.
              </p>
              <p>
                For virtual events, participants are responsible for ensuring they have a stable
                internet connection and compatible device. Fat Big Quiz is not responsible for
                technical issues on the participant&apos;s end.
              </p>

              <h2>8. Subscriptions</h2>
              <p>
                If you purchase a subscription product (e.g., weekly quiz packs), the subscription will
                renew automatically at the end of each billing period unless cancelled. You may cancel
                your subscription at any time through your account or by contacting us. Cancellation
                takes effect at the end of the current billing period.
              </p>

              <h2>9. Liability</h2>
              <p>
                Fat Big Quiz takes reasonable steps to ensure the quality and accuracy of all products
                and events. However, to the fullest extent permitted by law:
              </p>
              <ul>
                <li>Fat Big Quiz is not liable for any personal injury, loss, or damage to property arising from participation in our events, except where caused by our negligence.</li>
                <li>Fat Big Quiz is not liable for any indirect, consequential, or incidental losses.</li>
                <li>Our total liability for any claim is limited to the amount paid for the product or booking.</li>
              </ul>
              <p>
                Nothing in these Terms excludes or limits our liability for death or personal injury
                caused by our negligence, fraud, or any other liability that cannot be excluded under
                applicable law.
              </p>

              <h2>10. Intellectual Property</h2>
              <p>
                All content on the Fat Big Quiz website, including text, images, logos, quiz questions,
                round formats, and branding, is the property of Fat Big Quiz Ltd and is protected by
                copyright law. You may not reproduce, distribute, or use our content without written
                permission, except as part of a purchased product used in accordance with its licence.
              </p>

              <h2>11. Force Majeure</h2>
              <p>
                Fat Big Quiz is not liable for failure to perform obligations due to events beyond our
                reasonable control, including but not limited to: severe weather, natural disasters,
                pandemics, government restrictions, transport disruptions, or acts of terrorism.
              </p>

              <h2>12. Changes to These Terms</h2>
              <p>
                Fat Big Quiz reserves the right to update these Terms at any time. Changes will be posted
                on this page with an updated &quot;Last updated&quot; date. Continued use of our website or
                services after changes are posted constitutes acceptance of the revised Terms.
              </p>

              <h2>13. Governing Law</h2>
              <p>
                These Terms are governed by the laws of England and Wales. Any disputes arising from
                these Terms shall be subject to the exclusive jurisdiction of the courts of England
                and Wales.
              </p>

              <h2>14. Contact</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <ul>
                <li>Email: <a href="mailto:info@fatbigquiz.com" data-action="terms_contact_email">info@fatbigquiz.com</a></li>
                <li>Website: <a href="https://fatbigquiz.com" data-action="terms_contact_website">fatbigquiz.com</a></li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
