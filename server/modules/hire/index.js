/**
 * Hire Module - Fat Big Quiz
 *
 * Handles hire enquiry form submissions.
 * Migrated from Next.js API route (app/api/hire-enquiry/route.ts) to Express.
 *
 * Routes:
 *   POST /api/hire-enquiry - Submit a hire enquiry
 */

function registerRoutes(app) {

  app.post('/api/hire-enquiry', async (req, res) => {
    try {
      const body = req.body;
      console.log('[HireEnquiry] Received enquiry:', JSON.stringify(body));

      const {
        tier,
        frequency,
        preferredDay,
        preferredTime,
        duration,
        venueAddress,
        venueType,
        venueCapacity,
        message,
        contactName,
        contactEmail,
        contactPhone,
      } = body;

      // Validate required fields
      if (!tier || !frequency || !venueAddress || !contactName || !contactEmail) {
        console.error('[HireEnquiry] Missing required fields');
        return res.status(400).json({ error: 'Please fill in all required fields.' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        console.error('[HireEnquiry] Invalid email:', contactEmail);
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }

      // Store as a subscriber/lead via the internal subscribers API
      try {
        const subscriberRes = await fetch(`http://127.0.0.1:${process.env.PORT || 3001}/api/subscribers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: contactEmail,
            name: contactName,
            source: 'hire-enquiry',
            metadata: JSON.stringify({
              tier,
              frequency,
              preferredDay,
              preferredTime,
              duration,
              venueAddress,
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
          console.error('[HireEnquiry] Subscriber API error:', errText);
        } else {
          console.log('[HireEnquiry] Stored as subscriber lead');
        }
      } catch (subErr) {
        console.error('[HireEnquiry] Failed to store subscriber:', subErr.message);
      }

      console.log('[HireEnquiry] Enquiry processed successfully for:', venueAddress);

      return res.json({
        success: true,
        message: 'Enquiry received. We will be in touch within 24 hours.',
      });
    } catch (err) {
      console.error('[HireEnquiry] Unexpected error:', err);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  });

  console.log('[FBQ] Hire module registered');
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['email', 'auth'];
