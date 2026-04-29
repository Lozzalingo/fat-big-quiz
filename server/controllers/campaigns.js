/**
 * Email Campaigns Controller
 * Compose, preview, and send bulk emails to subscribers
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendEmail } = require('../services/email');
const { buildEmailTemplate } = require('@lozzalingo/email/server/templates');

async function getAllCampaigns(req, res) {
  try {
    console.log("[Campaign] Fetching all campaigns");
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(campaigns);
  } catch (error) {
    console.error("[Campaign] Error fetching:", error.message);
    return res.status(500).json({ error: 'Error fetching campaigns' });
  }
}

async function getCampaign(req, res) {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    return res.json(campaign);
  } catch (error) {
    console.error("[Campaign] Error fetching:", error.message);
    return res.status(500).json({ error: 'Error fetching campaign' });
  }
}

async function createCampaign(req, res) {
  try {
    const { subject, heading, body, ctaUrl, ctaText } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    console.log("[Campaign] Creating:", subject);

    const campaign = await prisma.campaign.create({
      data: {
        subject,
        heading: heading || subject,
        body,
        ctaUrl: ctaUrl || null,
        ctaText: ctaText || null,
        status: 'draft',
        sentCount: 0,
      },
    });

    console.log("[Campaign] Created:", campaign.id);
    return res.status(201).json(campaign);
  } catch (error) {
    console.error("[Campaign] Error creating:", error.message);
    return res.status(500).json({ error: 'Error creating campaign' });
  }
}

async function updateCampaign(req, res) {
  try {
    const { id } = req.params;
    const { subject, heading, body, ctaUrl, ctaText } = req.body;

    console.log("[Campaign] Updating:", id);

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { subject, heading, body, ctaUrl, ctaText },
    });

    return res.json(campaign);
  } catch (error) {
    console.error("[Campaign] Error updating:", error.message);
    return res.status(500).json({ error: 'Error updating campaign' });
  }
}

async function deleteCampaign(req, res) {
  try {
    const { id } = req.params;
    console.log("[Campaign] Deleting:", id);
    await prisma.campaign.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    console.error("[Campaign] Error deleting:", error.message);
    return res.status(500).json({ error: 'Error deleting campaign' });
  }
}

async function previewCampaign(req, res) {
  try {
    const { subject, heading, body, ctaUrl, ctaText } = req.body;

    let content = `<h2>${heading || subject}</h2>${body}`;
    if (ctaUrl && ctaText) {
      content += `
        <p style="text-align: center; margin-top: 24px;">
          <a href="${ctaUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">${ctaText}</a>
        </p>`;
    }

    const html = buildEmailTemplate({
      title: subject,
      body: content,
      brandName: 'Fat Big Quiz',
      style: { primary: '#7c3aed', headerBg: '#7c3aed' },
    });

    return res.json({ html });
  } catch (error) {
    console.error("[Campaign] Preview error:", error.message);
    return res.status(500).json({ error: 'Error generating preview' });
  }
}

async function sendTestEmail(req, res) {
  try {
    const { email, subject, heading, body, ctaUrl, ctaText } = req.body;

    if (!email) return res.status(400).json({ error: 'Test email address required' });

    console.log("[Campaign] Sending test to:", email);

    let content = `<h2>${heading || subject}</h2><p style="color:#6b7280;font-size:12px;">[TEST EMAIL]</p>${body}`;
    if (ctaUrl && ctaText) {
      content += `
        <p style="text-align: center; margin-top: 24px;">
          <a href="${ctaUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">${ctaText}</a>
        </p>`;
    }

    const html = buildEmailTemplate({
      title: subject,
      body: content,
      brandName: 'Fat Big Quiz',
      style: { primary: '#7c3aed', headerBg: '#7c3aed' },
    });

    const sent = await sendEmail({ to: email, subject: `[TEST] ${subject}`, html });
    return res.json({ success: sent });
  } catch (error) {
    console.error("[Campaign] Test send error:", error.message);
    return res.status(500).json({ error: 'Error sending test email' });
  }
}

async function sendCampaign(req, res) {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'sent') return res.status(400).json({ error: 'Campaign already sent' });

    console.log("[Campaign] Sending campaign:", campaign.subject);

    // Get all opted-in subscribers
    const subscribers = await prisma.subscriber.findMany({
      where: { optIn: true },
      select: { email: true },
    });

    console.log(`[Campaign] Sending to ${subscribers.length} subscribers`);

    let content = `<h2>${campaign.heading || campaign.subject}</h2>${campaign.body}`;
    if (campaign.ctaUrl && campaign.ctaText) {
      content += `
        <p style="text-align: center; margin-top: 24px;">
          <a href="${campaign.ctaUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">${campaign.ctaText}</a>
        </p>`;
    }

    const html = buildEmailTemplate({
      title: campaign.subject,
      body: content,
      brandName: 'Fat Big Quiz',
      style: { primary: '#7c3aed', headerBg: '#7c3aed' },
    });

    // Send in batches of 10 with 1s delay between batches (Resend rate limit)
    let sentCount = 0;
    const batchSize = 10;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(sub => sendEmail({ to: sub.email, subject: campaign.subject, html }))
      );
      sentCount += results.filter(r => r.status === 'fulfilled' && r.value).length;

      // Rate limit delay between batches
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date(), sentCount },
    });

    console.log(`[Campaign] Sent to ${sentCount}/${subscribers.length} subscribers`);
    return res.json({ success: true, sentCount, totalSubscribers: subscribers.length });
  } catch (error) {
    console.error("[Campaign] Send error:", error.message);
    return res.status(500).json({ error: 'Error sending campaign' });
  }
}

module.exports = {
  getAllCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  previewCampaign,
  sendTestEmail,
  sendCampaign,
};
