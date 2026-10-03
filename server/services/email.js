/**
 * Email Service - Fat Big Quiz
 * Calls the centralised Email Service via fetch().
 * Project-specific HTML templates built locally until SVC.1 is done.
 */

const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL;
const EMAIL_SERVICE_API_KEY = process.env.EMAIL_SERVICE_API_KEY;
const SITE_ID = 'fat-big-quiz';
const WEBSITE_URL = process.env.FRONTEND_URL || 'http://localhost:3002';

/**
 * Send an email via the Email Service.
 */
async function sendEmail({ to, subject, html, text }) {
  if (!EMAIL_SERVICE_URL) {
    console.error('[Email] EMAIL_SERVICE_URL not configured');
    return false;
  }
  try {
    const res = await fetch(EMAIL_SERVICE_URL + '/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Email-Service-Key': EMAIL_SERVICE_API_KEY || '',
      },
      body: JSON.stringify({ site_id: SITE_ID, to, subject, html, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[Email] Service returned', res.status, body);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Email] Failed to call Email Service:', error.message);
    return false;
  }
}

// Lightweight email template wrapper (kept locally until Email Service SVC.1)
function buildEmailTemplate({ title, body, brandName, style }) {
  const primary = style?.primary || '#7c3aed';
  const headerBg = style?.headerBg || primary;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;padding:0;background:#f4f4f5;font-family:arial,helvetica,sans-serif}
.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
.header{background:${headerBg};color:#fff;padding:24px;text-align:center;font-size:22px;font-weight:bold}
.body{padding:32px 24px;color:#333;line-height:1.6}
.summary{background:#f9fafb;border-radius:6px;padding:16px 20px;margin:16px 0}
.summary-row{display:flex;justify-content:space-between;padding:4px 0}
.warning{background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;margin:16px 0}
.footer{padding:16px 24px;text-align:center;color:#9a9a9a;font-size:12px;border-top:1px solid #e5e7eb}
</style></head><body>
<div class="container">
<div class="header">${brandName || 'Fat Big Quiz'}</div>
<div class="body">${body}</div>
<div class="footer">&copy; ${new Date().getFullYear()} ${brandName || 'Fat Big Quiz'}</div>
</div></body></html>`;
}

/**
 * Send welcome email (project-specific with quiz features)
 */
async function sendWelcomeEmail(email) {
  console.log('[Email] Sending welcome email to:', email);
  const html = buildEmailTemplate({
    title: 'Welcome to Fat Big Quiz!',
    body: `
      <h2>Welcome!</h2>
      <p>Thanks for signing up to Fat Big Quiz. Here's what you can look forward to:</p>
      <ul>
        <li>Printable quiz packs for any occasion</li>
        <li>Instant digital downloads</li>
        <li>Full-colour and low-ink options</li>
        <li>Questions, answers, and score sheets included</li>
      </ul>
      <p style="text-align: center;">
        <a href="${WEBSITE_URL}/shop" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Browse Quiz Packs</a>
      </p>
    `,
    brandName: 'Fat Big Quiz',
    style: { primary: '#7c3aed', headerBg: '#7c3aed' },
  });
  const text = 'Welcome to Fat Big Quiz!\n\nThanks for signing up. Browse our quiz packs at ' + WEBSITE_URL + '/shop\n\nFat Big Quiz';
  return sendEmail({ to: email, subject: 'Welcome to Fat Big Quiz!', html, text });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, { resetUrl, expiresIn = '1 hour' }) {
  console.log('[Email] Sending password reset email to:', email);
  const html = buildEmailTemplate({
    title: 'Reset Your Password',
    body: `
      <h2>Password Reset</h2>
      <p>We received a request to reset your password. Click the button below to set a new one:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">This link expires in ${expiresIn}. If you didn't request this, ignore this email.</p>
    `,
    brandName: 'Fat Big Quiz',
    style: { primary: '#7c3aed', headerBg: '#7c3aed' },
  });
  const text = `Reset your password: ${resetUrl}\n\nThis link expires in ${expiresIn}.\n\nFat Big Quiz`;
  return sendEmail({ to: email, subject: 'Fat Big Quiz - Reset Your Password', html, text });
}

/**
 * Send purchase confirmation email (project-specific)
 */
async function sendPurchaseConfirmationEmail(email, { productName, price, downloadUrl, sessionId, expiresInDays = 7 }) {
  console.log('[Email] Sending purchase confirmation to:', email);
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
  const fullDownloadUrl = downloadUrl || `${baseUrl}/download/${sessionId}`;
  const priceDisplay = `£${parseFloat(price).toFixed(2)}`;

  const html = buildEmailTemplate({
    title: 'Thanks for your purchase!',
    body: `
      <h2>Your download is ready</h2>
      <p>Thank you for purchasing from Fat Big Quiz. Your quiz pack is ready to download.</p>
      <div class="summary">
        <div class="summary-row"><span>Product:</span><span><strong>${productName}</strong></span></div>
        <div class="summary-row"><span>Amount Paid:</span><span>${priceDisplay}</span></div>
      </div>
      <p style="text-align: center;">
        <a href="${fullDownloadUrl}" style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Download Your Quiz Pack</a>
      </p>
      <div class="warning">
        <p><strong>Download now!</strong> This link expires in ${expiresInDays} days. After that, sign in or create an account with this email (${email}) to access your downloads anytime.</p>
      </div>
    `,
    brandName: 'Fat Big Quiz',
    style: { primary: '#7c3aed', headerBg: '#7c3aed' },
  });

  const text = `Thanks for your purchase!\n\nProduct: ${productName}\nAmount: ${priceDisplay}\n\nDownload: ${fullDownloadUrl}\n\nExpires in ${expiresInDays} days.\n\nFat Big Quiz`;

  return sendEmail({ to: email, subject: 'Fat Big Quiz - Your download is ready!', html, text });
}

/**
 * Send order confirmation email (project-specific)
 */
async function sendOrderConfirmationEmail(email, { productName, price, orderType }) {
  console.log('[Email] Sending order confirmation to:', email);
  const priceDisplay = `£${parseFloat(price).toFixed(2)}`;
  const typeText = orderType === 'EVENT' ? 'Event Booking' : 'Order';

  const html = buildEmailTemplate({
    title: `${typeText} Confirmed!`,
    body: `
      <h2>Thank you for your ${typeText.toLowerCase()}!</h2>
      <p>We've received your ${typeText.toLowerCase()} and are processing it now.</p>
      <div class="summary">
        <div class="summary-row"><span>Product:</span><span><strong>${productName}</strong></span></div>
        <div class="summary-row"><span>Amount Paid:</span><span>${priceDisplay}</span></div>
      </div>
      <p>We'll be in touch with further details soon.</p>
    `,
    brandName: 'Fat Big Quiz',
    style: { primary: '#10b981', headerBg: '#10b981' },
  });

  const text = `${typeText} Confirmed!\n\nProduct: ${productName}\nAmount: ${priceDisplay}\n\nFat Big Quiz`;

  return sendEmail({ to: email, subject: `Fat Big Quiz - ${typeText} Confirmed!`, html, text });
}

/**
 * Send admin sale notification (project-specific)
 */
async function sendAdminSaleNotification({ customerEmail, productName, price, productType, sessionId, productImages }) {
  console.log('[Email] Sending admin sale notification');
  const adminEmail = process.env.ADMIN_EMAIL || 'laurencedotcomputer@gmail.com';
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
  const cdnBase = process.env.DO_SPACES_CDN_ENDPOINT || 'https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com';
  const cdnFolder = process.env.DO_SPACES_FOLDER || 'fat-big-quiz';
  const priceDisplay = `£${parseFloat(price).toFixed(2)}`;
  const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' });
  const typeLabel = productType === 'DIGITAL_DOWNLOAD' ? 'Digital Download' : productType === 'EVENT' ? 'Event Booking' : 'Order';

  // Build product image URL (use first image if available)
  let imageUrl = '';
  if (productImages && productImages.length > 0) {
    const img = productImages[0];
    imageUrl = img.startsWith('http') ? img : `${cdnBase}/${cdnFolder}/products/images/${img}`;
  }

  // Etsy-style layout: thumbnail left, details right
  const productBlock = imageUrl
    ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0;">
        <tr>
          <td valign="top" width="90" style="padding-right: 16px;">
            <img src="${imageUrl}" alt="${productName}" width="90" height="90" style="display: block; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; object-fit: cover;" />
          </td>
          <td valign="top" style="font-family: arial, helvetica, sans-serif; color: #444; font-size: 14px; line-height: 22px;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${productName}</div>
            <div><strong>Amount:</strong> ${priceDisplay}</div>
            <div><strong>Type:</strong> ${typeLabel}</div>
            <div><strong>Customer:</strong> ${customerEmail}</div>
            <div style="color: #9a9a9a; font-size: 12px; margin-top: 4px;">${timestamp}</div>
          </td>
        </tr>
      </table>
    `
    : `
      <div style="background: #f9fafb; border-radius: 6px; border-left: 4px solid #10b981; margin: 16px 0; padding: 16px 20px; line-height: 2.2;">
        <strong>Product:</strong> ${productName}<br>
        <strong>Amount:</strong> ${priceDisplay}<br>
        <strong>Type:</strong> ${typeLabel}<br>
        <strong>Customer:</strong> ${customerEmail}<br>
        <strong>Time:</strong> ${timestamp}
      </div>
    `;

  const html = buildEmailTemplate({
    title: 'New Sale!',
    body: `
      ${productBlock}
      <p style="text-align: center; margin-top: 20px;">
        <a href="${baseUrl}/admin/orders" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 13px;">View Orders</a>
      </p>
    `,
    brandName: 'Fat Big Quiz Admin',
    style: { primary: '#10b981', headerBg: '#10b981' },
  });

  const text = `New Sale!\n\nProduct: ${productName}\nAmount: ${priceDisplay}\nType: ${typeLabel}\nCustomer: ${customerEmail}\nTime: ${timestamp}\n\nFat Big Quiz`;

  return sendEmail({ to: adminEmail, subject: `[Fat Big Quiz] New Sale: ${productName} - ${priceDisplay}`, html, text });
}

/**
 * Send admin notification when someone joins a list (subscriber, coming soon, etc.)
 */
async function sendAdminListNotification({ email, firstName, lastName, name, source }) {
  console.log('[Email] Sending admin list notification - source:', source, 'email:', email);
  const adminEmail = process.env.ADMIN_EMAIL || 'laurencedotcomputer@gmail.com';
  const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' });

  // Support both separate first/last name and combined name
  const first = firstName || (name ? name.split(' ')[0] : '');
  const last = lastName || (name ? name.split(' ').slice(1).join(' ') : '');

  const sourceLabels = {
    'subscriber': 'Newsletter Signup',
    'sign-up': 'Newsletter Signup',
    'popup': 'Newsletter Signup (Popup)',
    'quiz-pack': 'Quiz Pack (Coming Soon)',
    'quiz-database': 'Quiz Database (Coming Soon)',
    'quiz-app': 'Quiz App Beta Access',
    'app': 'Quiz App Beta Access',
  };
  const sourceLabel = sourceLabels[source] || source;

  const html = buildEmailTemplate({
    title: 'New List Signup!',
    body: `
      <h2>Someone joined a list</h2>
      <div style="background: #f9fafb; border-radius: 6px; border-left: 4px solid #7c3aed; margin: 16px 0; padding: 16px 20px; line-height: 2.2;">
        <strong>List:</strong> ${sourceLabel}<br>
        ${first ? `<strong>First Name:</strong> ${first}<br>` : ''}${last ? `<strong>Last Name:</strong> ${last}<br>` : ''}<strong>Email:</strong> ${email}<br>
        <strong>Time:</strong> ${timestamp}
      </div>
    `,
    brandName: 'Fat Big Quiz Admin',
    style: { primary: '#7c3aed', headerBg: '#7c3aed' },
  });

  const text = `New List Signup!\n\nList: ${sourceLabel}\n${first ? `First Name: ${first}\n` : ''}${last ? `Last Name: ${last}\n` : ''}Email: ${email}\nTime: ${timestamp}\n\nFat Big Quiz`;

  return sendEmail({ to: adminEmail, subject: `[FBQ] New signup: ${sourceLabel} - ${email}`, html, text });
}

module.exports = {
  buildEmailTemplate,
  sendEmail,
  sendPurchaseConfirmationEmail,
  sendOrderConfirmationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAdminSaleNotification,
  sendAdminListNotification,
};
