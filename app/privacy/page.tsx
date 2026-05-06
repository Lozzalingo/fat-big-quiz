import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Fat Big Quiz",
  description: "Fat Big Quiz privacy policy. Learn how we collect, use, and protect your personal data in compliance with GDPR and UK data protection law.",
  openGraph: {
    title: "Privacy Policy | Fat Big Quiz",
    description: "Learn how Fat Big Quiz collects, uses, and protects your personal data in compliance with GDPR.",
  },
};

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary-dark to-primary-light text-white overflow-hidden">
        <div className="relative max-w-screen-xl mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight font-poppins">
            Privacy Policy
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
                Fat Big Quiz Ltd (&quot;Fat Big Quiz,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is committed to protecting
                your privacy. This Privacy Policy explains how we collect, use, store, and share your
                personal data when you use our website (fatbigquiz.com), purchase our products, book
                our events, or interact with us.
              </p>
              <p>
                We comply with the UK General Data Protection Regulation (UK GDPR), the Data Protection
                Act 2018, and the Privacy and Electronic Communications Regulations (PECR).
              </p>

              <h2>2. Data Controller</h2>
              <p>
                Fat Big Quiz Ltd is the data controller for the personal data collected through this
                website. If you have any questions about how we handle your data, contact us at:
              </p>
              <ul>
                <li>Email: <a href="mailto:info@fatbigquiz.com" data-action="privacy_email">info@fatbigquiz.com</a></li>
                <li>Address: London, United Kingdom</li>
              </ul>

              <h2>3. What Data We Collect</h2>
              <p>We may collect the following personal data:</p>

              <h3>Information you provide to us:</h3>
              <ul>
                <li><strong>Account information:</strong> Name, email address, and password when you register for an account.</li>
                <li><strong>Purchase information:</strong> Name, email address, and payment details when you buy a product or subscribe.</li>
                <li><strong>Booking information:</strong> Name, email address, phone number, company name, group size, event date, and any special requirements for event bookings.</li>
                <li><strong>Newsletter subscriptions:</strong> Email address, name, and marketing preferences.</li>
                <li><strong>Payment information:</strong> Processed securely via Stripe. We do not store your full card details on our servers.</li>
              </ul>

              <h3>Information collected automatically:</h3>
              <ul>
                <li><strong>Website analytics:</strong> IP address, browser type, operating system, device type, screen resolution, pages visited, time spent, and referral source.</li>
                <li><strong>Cookies:</strong> We use cookies and similar technologies as described in Section 7 below.</li>
                <li><strong>Location data:</strong> Approximate location derived from IP address for analytics purposes.</li>
              </ul>

              <h2>4. How We Use Your Data</h2>
              <p>We use your personal data for the following purposes:</p>
              <ul>
                <li><strong>To process purchases:</strong> Delivering digital products, providing download links, and managing subscriptions.</li>
                <li><strong>To process event bookings:</strong> Confirming events, sending booking details, and communicating about your event.</li>
                <li><strong>To manage your account:</strong> Providing access to purchased products, download history, and preferences.</li>
                <li><strong>To send marketing communications:</strong> Newsletters, new quiz announcements, and promotions (only with your consent, and you can unsubscribe at any time).</li>
                <li><strong>To improve our services:</strong> Analysing website usage to improve the user experience and our products.</li>
                <li><strong>To comply with legal obligations:</strong> Tax records, fraud prevention, and regulatory compliance.</li>
              </ul>

              <h3>Legal Basis for Processing</h3>
              <p>We process your data based on the following legal grounds:</p>
              <ul>
                <li><strong>Contract:</strong> Processing necessary to fulfil your purchase, deliver products, or process your booking.</li>
                <li><strong>Consent:</strong> Marketing communications and non-essential cookies.</li>
                <li><strong>Legitimate interest:</strong> Website analytics, fraud prevention, and improving our services.</li>
                <li><strong>Legal obligation:</strong> Tax and regulatory compliance.</li>
              </ul>

              <h2>5. Data Sharing</h2>
              <p>
                We do not sell your personal data to third parties. We may share your data with the
                following service providers who help us operate our business:
              </p>
              <ul>
                <li><strong>Stripe:</strong> Payment processing (PCI-DSS compliant).</li>
                <li><strong>Resend:</strong> Email delivery for purchase confirmations, download links, and marketing.</li>
                <li><strong>DigitalOcean:</strong> Website, server, and file hosting.</li>
                <li><strong>Google Analytics:</strong> Anonymous website usage data.</li>
              </ul>
              <p>
                All third-party providers are contractually obligated to protect your data and process
                it only as instructed by us.
              </p>

              <h2>6. Data Retention</h2>
              <p>We retain your personal data for the following periods:</p>
              <ul>
                <li><strong>Purchase and account data:</strong> 6 years from the date of purchase (for tax and legal purposes).</li>
                <li><strong>Booking data:</strong> 6 years from the event date (for tax and legal purposes).</li>
                <li><strong>Newsletter subscribers:</strong> Until you unsubscribe.</li>
                <li><strong>Website analytics:</strong> Aggregated data retained indefinitely; identifiable data for up to 26 months.</li>
              </ul>

              <h2>7. Cookies</h2>
              <p>
                Our website uses cookies - small text files stored on your device - to enhance your
                browsing experience. We use the following types of cookies:
              </p>
              <ul>
                <li><strong>Essential cookies:</strong> Required for the website to function (e.g., session management, shopping cart). These cannot be disabled.</li>
                <li><strong>Analytics cookies:</strong> Help us understand how visitors use our website so we can improve it. These collect anonymous data.</li>
                <li><strong>Marketing cookies:</strong> Used to track the effectiveness of our advertising. Only set with your consent.</li>
              </ul>
              <p>
                You can manage your cookie preferences through your browser settings. Note that
                disabling certain cookies may affect the functionality of our website.
              </p>

              <h2>8. Your Rights</h2>
              <p>Under the UK GDPR, you have the following rights:</p>
              <ul>
                <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong>Right to erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;).</li>
                <li><strong>Right to restrict processing:</strong> Request that we limit how we use your data.</li>
                <li><strong>Right to data portability:</strong> Request your data in a portable, machine-readable format.</li>
                <li><strong>Right to object:</strong> Object to processing based on legitimate interest or direct marketing.</li>
                <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time for consent-based processing.</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:info@fatbigquiz.com" data-action="privacy_rights_email">info@fatbigquiz.com</a>.
                We will respond to your request within 30 days.
              </p>

              <h2>9. Data Security</h2>
              <p>
                We implement appropriate technical and organisational measures to protect your personal
                data, including:
              </p>
              <ul>
                <li>HTTPS encryption on all website pages.</li>
                <li>Secure server infrastructure hosted on DigitalOcean.</li>
                <li>Access controls restricting data access to authorised personnel only.</li>
                <li>Payment processing handled by PCI-DSS compliant Stripe.</li>
                <li>Regular security reviews and updates.</li>
              </ul>

              <h2>10. International Data Transfers</h2>
              <p>
                Some of our service providers operate outside the UK. Where data is transferred
                internationally, we ensure appropriate safeguards are in place, such as Standard
                Contractual Clauses or adequacy decisions, in compliance with UK GDPR requirements.
              </p>

              <h2>11. Children&apos;s Privacy</h2>
              <p>
                Our website is not directed at children under 16. We do not knowingly collect personal
                data from children without parental consent. If you believe we have collected data from
                a child under 16, please contact us immediately and we will delete it.
              </p>

              <h2>12. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this
                page with an updated &quot;Last updated&quot; date. We encourage you to review this page
                periodically. Continued use of our website after changes constitutes acceptance of the
                updated policy.
              </p>

              <h2>13. Complaints</h2>
              <p>
                If you are not satisfied with how we handle your personal data, you have the right to
                lodge a complaint with the Information Commissioner&apos;s Office (ICO):
              </p>
              <ul>
                <li>Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" data-action="privacy_ico_link">ico.org.uk</a></li>
                <li>Phone: 0303 123 1113</li>
              </ul>

              <h2>14. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or how we handle your data,
                please contact us:
              </p>
              <ul>
                <li>Email: <a href="mailto:info@fatbigquiz.com" data-action="privacy_contact_email">info@fatbigquiz.com</a></li>
                <li>Website: <a href="https://fatbigquiz.com" data-action="privacy_contact_website">fatbigquiz.com</a></li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
