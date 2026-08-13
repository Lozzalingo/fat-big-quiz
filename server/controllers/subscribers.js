const prisma = require("../utils/prisma");
const crypto = require('crypto');
const { sendWelcomeEmail, sendEmail, sendAdminListNotification } = require('../services/email');
const { buildEmailTemplate } = require('@lozzalingo/email/server/templates');

const DOUBLE_OPT_IN = process.env.SUBSCRIBER_DOUBLE_OPT_IN === 'true';
const WEBSITE_URL = process.env.NEXTAUTH_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

// Simple email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function updateSubscriberByEmail(req, res) {
  try {
    const { email } = req.params;
    const normalisedEmail = email.toLowerCase().trim();
    const { optIn } = req.body;

    console.log("[Subscriber] Updating by email:", normalisedEmail);

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: normalisedEmail },
    });

    if (!subscriber) {
      console.log("[Subscriber] Not found:", normalisedEmail);
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const updatedSubscriber = await prisma.subscriber.update({
      where: { email: normalisedEmail },
      data: {
        optIn: optIn !== undefined ? optIn : subscriber.optIn
      },
    });

    console.log("[Subscriber] Updated:", normalisedEmail, "optIn:", updatedSubscriber.optIn);
    return res.status(200).json(updatedSubscriber);
  } catch (error) {
    console.error('[Subscriber] Error updating by email:', error.message);
    return res.status(500).json({ error: 'Error updating subscriber' });
  }
}

async function deleteSubscriberByEmail(req, res) {
  try {
    const { email } = req.params;
    const normalisedEmail = email.toLowerCase().trim();

    console.log("[Subscriber] Deleting by email:", normalisedEmail);

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: normalisedEmail },
    });

    if (!subscriber) {
      console.log("[Subscriber] Not found for delete:", normalisedEmail);
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    await prisma.subscriber.delete({
      where: { email: normalisedEmail },
    });

    console.log("[Subscriber] Deleted:", normalisedEmail);
    return res.status(204).send();
  } catch (error) {
    console.error('[Subscriber] Error deleting by email:', error.message);
    return res.status(500).json({ error: 'Error deleting subscriber' });
  }
}

async function updateSubscriberOptIn(request, response) {
  try {
    const { email, optIn } = request.body;
    const normalisedEmail = email.toLowerCase().trim();

    console.log("[Subscriber] Updating opt-in for:", normalisedEmail, "to:", optIn);

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: normalisedEmail },
    });

    if (!subscriber) {
      console.log("[Subscriber] Not found for opt-in update:", normalisedEmail);
      return response.status(404).json({ error: 'Subscriber not found' });
    }

    const updatedSubscriber = await prisma.subscriber.update({
      where: { email: normalisedEmail },
      data: { optIn },
    });

    console.log("[Subscriber] Opt-in updated:", normalisedEmail);
    return response.status(200).json({ message: 'Subscriber updated', subscriber: updatedSubscriber });
  } catch (error) {
    console.error('[Subscriber] Error updating opt-in:', error.message);
    return response.status(500).json({ error: 'Error updating subscriber' });
  }
}

async function createSubscriber(request, response) {
  try {
    const { email, firstName, lastName, source, sourcePath } = request.body;

    if (!email) {
      console.log("[Subscriber] Create rejected - no email provided");
      return response.status(400).json({ error: 'Email is required' });
    }

    const normalisedEmail = email.toLowerCase().trim();

    if (!isValidEmail(normalisedEmail)) {
      console.log("[Subscriber] Create rejected - invalid email:", normalisedEmail);
      return response.status(400).json({ error: 'Invalid email address' });
    }

    console.log("[Subscriber] Creating subscriber:", normalisedEmail, "source:", source || 'unknown');

    // Check if email already exists
    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email: normalisedEmail },
    });

    if (existingSubscriber) {
      // If subscriber exists but optIn is false, reactivate
      if (existingSubscriber.optIn === false) {
        const updatedSubscriber = await prisma.subscriber.update({
          where: { email: normalisedEmail },
          data: { optIn: true },
        });
        console.log("[Subscriber] Reactivated:", normalisedEmail);

        // Notify admin of reactivation
        sendAdminListNotification({ email: normalisedEmail, firstName: existingSubscriber.firstName, lastName: existingSubscriber.lastName, source: source || existingSubscriber.source || 'subscriber' })
          .then((sent) => console.log("[Subscriber] Admin notification (reactivation) sent, success:", sent))
          .catch((err) => console.error("[Subscriber] Admin notification error:", err.message));

        return response.status(200).json({ message: 'Subscription reactivated', subscriber: updatedSubscriber });
      }
      console.log("[Subscriber] Already subscribed:", normalisedEmail);
      return response.status(400).json({ error: 'Email already subscribed' });
    }

    const subscriber = await prisma.subscriber.create({
      data: {
        email: normalisedEmail,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        source: source?.trim() || null,
        sourcePath: sourcePath?.trim() || null,
        subscribedAt: new Date(),
        optIn: DOUBLE_OPT_IN ? false : true,
      },
    });

    console.log("[Subscriber] Created successfully:", normalisedEmail, "optIn:", !DOUBLE_OPT_IN ? 'immediate' : 'pending confirmation');

    if (DOUBLE_OPT_IN) {
      // Send confirmation email
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.subscriberConfirmation.create({
        data: {
          subscriberId: subscriber.id,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      const confirmUrl = `${WEBSITE_URL}/confirm-subscription?token=${token}`;
      const html = buildEmailTemplate({
        title: 'Confirm your subscription',
        body: `
          <h2>Confirm your subscription</h2>
          <p>Thanks for subscribing to Fat Big Quiz! Please confirm your email address by clicking below:</p>
          <p style="text-align: center;">
            <a href="${confirmUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Confirm Subscription</a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">This link expires in 24 hours. If you didn't subscribe, ignore this email.</p>
        `,
        brandName: 'Fat Big Quiz',
        style: { primary: '#7c3aed', headerBg: '#7c3aed' },
      });

      sendEmail({ to: normalisedEmail, subject: 'Fat Big Quiz - Confirm your subscription', html })
        .then((sent) => console.log("[Subscriber] Confirmation email sent:", normalisedEmail, "success:", sent))
        .catch((err) => console.error("[Subscriber] Confirmation email error:", err.message));

      return response.status(201).json({ message: 'Please check your email to confirm your subscription', subscriber });
    }

    // Direct opt-in - send welcome email
    sendWelcomeEmail(normalisedEmail)
      .then((sent) => console.log("[Subscriber] Welcome email sent:", normalisedEmail, "success:", sent))
      .catch((err) => console.error("[Subscriber] Welcome email error:", err.message));

    // Notify admin of new signup
    sendAdminListNotification({ email: normalisedEmail, firstName: firstName?.trim(), lastName: lastName?.trim(), source: source || 'subscriber' })
      .then((sent) => console.log("[Subscriber] Admin notification sent, success:", sent))
      .catch((err) => console.error("[Subscriber] Admin notification error:", err.message));

    return response.status(201).json({ message: 'Subscribed successfully', subscriber });
  } catch (error) {
    console.error('[Subscriber] Error creating subscriber:', error.message);
    return response.status(500).json({ error: 'Error subscribing' });
  }
}

async function getAllSubscribers(request, response) {
  try {
    console.log("[Subscriber] Fetching all subscribers");
    const subscribers = await prisma.subscriber.findMany();
    console.log(`[Subscriber] Found ${subscribers.length} subscribers`);
    return response.json(subscribers);
  } catch (error) {
    console.error('[Subscriber] Error fetching subscribers:', error.message);
    return response.status(500).json({ error: 'Error fetching subscribers' });
  }
}

async function getSubscriberByEmail(request, response) {
  try {
    const { email } = request.params;
    const normalisedEmail = email.toLowerCase().trim();
    console.log("[Subscriber] Fetching by email:", normalisedEmail);

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: normalisedEmail },
    });

    if (!subscriber) {
      console.log("[Subscriber] Not found:", normalisedEmail);
      return response.status(404).json({ error: 'Subscriber not found' });
    }

    return response.status(200).json(subscriber);
  } catch (error) {
    console.error('[Subscriber] Error fetching subscriber:', error.message);
    return response.status(500).json({ error: 'Error fetching subscriber' });
  }
}

async function deleteSubscriber(request, response) {
  try {
    const { id } = request.params;
    console.log("[Subscriber] Deleting by ID:", id);

    const subscriber = await prisma.subscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      console.log("[Subscriber] Not found for delete:", id);
      return response.status(404).json({ error: 'Subscriber not found' });
    }

    await prisma.subscriber.delete({
      where: { id },
    });

    console.log("[Subscriber] Deleted:", id, subscriber.email);
    return response.status(204).send();
  } catch (error) {
    console.error('[Subscriber] Error deleting subscriber:', error.message);
    return response.status(500).json({ error: 'Error deleting subscriber' });
  }
}

async function unsubscribe(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalisedEmail = email.toLowerCase().trim();
    console.log("[Subscriber] Unsubscribe request:", normalisedEmail);

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: normalisedEmail },
    });

    if (!subscriber) {
      console.log("[Subscriber] Not found for unsubscribe:", normalisedEmail);
      // Don't reveal if email existed
      return res.json({ message: 'Unsubscribed successfully' });
    }

    await prisma.subscriber.update({
      where: { email: normalisedEmail },
      data: { optIn: false },
    });

    console.log("[Subscriber] Unsubscribed:", normalisedEmail);
    return res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('[Subscriber] Error unsubscribing:', error.message);
    return res.status(500).json({ error: 'Error processing unsubscribe' });
  }
}

async function confirmSubscription(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    console.log("[Subscriber] Confirmation attempt");

    const confirmation = await prisma.subscriberConfirmation.findUnique({
      where: { token },
      include: { subscriber: true },
    });

    if (!confirmation || confirmation.confirmed || new Date() > confirmation.expiresAt) {
      console.log("[Subscriber] Invalid or expired confirmation token");
      return res.status(400).json({ error: 'Invalid or expired confirmation link' });
    }

    // Activate subscriber
    await prisma.subscriber.update({
      where: { id: confirmation.subscriberId },
      data: { optIn: true },
    });

    await prisma.subscriberConfirmation.update({
      where: { id: confirmation.id },
      data: { confirmed: true },
    });

    console.log("[Subscriber] Confirmed:", confirmation.subscriber.email);

    // Send welcome email now that they've confirmed
    sendWelcomeEmail(confirmation.subscriber.email)
      .then((sent) => console.log("[Subscriber] Welcome email sent:", confirmation.subscriber.email, "success:", sent))
      .catch((err) => console.error("[Subscriber] Welcome email error:", err.message));

    return res.json({ message: 'Subscription confirmed! Welcome aboard.' });
  } catch (error) {
    console.error('[Subscriber] Confirmation error:', error.message);
    return res.status(500).json({ error: 'Error confirming subscription' });
  }
}

module.exports = {
  createSubscriber,
  getAllSubscribers,
  getSubscriberByEmail,
  updateSubscriberByEmail,
  deleteSubscriber,
  updateSubscriberOptIn,
  deleteSubscriberByEmail,
  unsubscribe,
  confirmSubscription,
};
