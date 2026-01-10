/**
 * Email Service using Resend API
 * Fat Big Quiz
 */

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Send an HTML email using Resend
 */
async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@fatbigquiz.com";
  const replyTo = process.env.RESEND_REPLY_TO || "support@fatbigquiz.com";

  if (!apiKey) {
    console.error("[Email] RESEND_API_KEY not configured");
    return false;
  }

  try {
    const payload = {
      from: fromEmail,
      to: [to],
      reply_to: replyTo,
      subject,
      html,
    };

    if (text) {
      payload.text = text;
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.id) {
      console.log(`[Email] Sent to ${to} (ID: ${data.id})`);
      return true;
    } else {
      console.error(`[Email] Failed: ${response.status}`, data);
      return false;
    }
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return false;
  }
}

/**
 * Send purchase confirmation email with download link
 */
async function sendPurchaseConfirmationEmail(email, { productName, price, downloadUrl, sessionId, expiresInDays = 7 }) {
  const appName = "Fat Big Quiz";
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3002";
  const fullDownloadUrl = downloadUrl || `${baseUrl}/download/${sessionId}`;
  const priceDisplay = `£${parseFloat(price).toFixed(2)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
    .header { background: #7c3aed; color: #fff; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 32px; }
    .content h2 { margin: 0 0 16px 0; font-size: 20px; color: #1f2937; }
    .content p { margin: 16px 0; color: #4b5563; }
    .summary { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #7c3aed; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
    .summary-row:last-child { border-bottom: none; font-weight: 600; padding-top: 12px; }
    .button { display: inline-block; background: #000; color: #fff; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; font-size: 16px; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e5e5; }
    .tips { background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0; }
    .tips h4 { margin: 0 0 8px 0; color: #374151; font-size: 14px; }
    .tips ul { margin: 0; padding-left: 20px; color: #4b5563; font-size: 13px; }
    .tips li { padding: 2px 0; }
    .expiry-notice { background: #fef3c7; padding: 12px 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .expiry-notice p { margin: 0; color: #92400e; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thanks for your purchase!</h1>
    </div>
    <div class="content">
      <h2>Your download is ready</h2>
      <p>Hi there! Thank you for purchasing from ${appName}. Your quiz pack is ready to download.</p>

      <div class="summary">
        <div class="summary-row">
          <span>Product: </span>
          <span><strong>${productName}</strong></span>
        </div>
        <div class="summary-row">
          <span>Amount Paid: </span>
          <span>${priceDisplay}</span>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${fullDownloadUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; font-size: 16px;">Download Your Quiz Pack</a>
      </p>

      <div class="expiry-notice">
        <p><strong>Download now!</strong> This link expires in ${expiresInDays} days. After that, sign in or create an account with this email (${email}) to access your downloads anytime.</p>
      </div>

      <div class="tips">
        <h4>Download Tips:</h4>
        <ul>
          <li>Click the button above to access your files</li>
          <li>Files are in PDF format, ready to print</li>
          <li>Includes full-colour and low-ink versions</li>
          <li>Create an account to access your purchases forever</li>
        </ul>
      </div>

      <p style="font-size: 13px; color: #6b7280;">If you have any issues with your download, just reply to this email and we'll help you out!</p>
    </div>
    <div class="footer">
      <p><strong>${appName}</strong></p>
      <p>Printable quiz packs for every occasion</p>
      <p style="margin-top: 16px;"><a href="${baseUrl}/shop" style="color: #7c3aed;">Browse more quiz packs</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Thanks for your purchase!

Your download is ready.

Product: ${productName}
Amount Paid: ${priceDisplay}

Download your quiz pack here:
${fullDownloadUrl}

IMPORTANT: Download now! This link expires in ${expiresInDays} days.
After that, sign in or create an account with this email (${email}) to access your downloads anytime.

Download Tips:
- Click the link above to access your files
- Files are in PDF format, ready to print
- Includes full-colour and low-ink versions
- Create an account to access your purchases forever

If you have any issues, just reply to this email.

${appName}
  `;

  return sendEmail({
    to: email,
    subject: `${appName} - Your download is ready!`,
    html,
    text,
  });
}

/**
 * Send order confirmation email (for physical products/events)
 */
async function sendOrderConfirmationEmail(email, { productName, price, orderType }) {
  const appName = "Fat Big Quiz";
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3002";
  const priceDisplay = `£${parseFloat(price).toFixed(2)}`;

  const typeText = orderType === "EVENT" ? "Event Booking" : "Order";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
    .header { background: #7c3aed; color: #fff; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 32px; }
    .content h2 { margin: 0 0 16px 0; font-size: 20px; color: #1f2937; }
    .content p { margin: 16px 0; color: #4b5563; }
    .summary { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
    .summary-row:last-child { border-bottom: none; font-weight: 600; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e5e5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${typeText} Confirmed!</h1>
    </div>
    <div class="content">
      <h2>Thank you for your ${typeText.toLowerCase()}!</h2>
      <p>We've received your ${typeText.toLowerCase()} and are processing it now.</p>

      <div class="summary">
        <div class="summary-row">
          <span>Product:</span>
          <span><strong>${productName}</strong></span>
        </div>
        <div class="summary-row">
          <span>Amount Paid:</span>
          <span>${priceDisplay}</span>
        </div>
      </div>

      <p>We'll be in touch with further details soon. If you have any questions, just reply to this email.</p>
    </div>
    <div class="footer">
      <p><strong>${appName}</strong></p>
      <p><a href="${baseUrl}" style="color: #7c3aed;">Visit our website</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
${typeText} Confirmed!

Thank you for your ${typeText.toLowerCase()}!

Product: ${productName}
Amount Paid: ${priceDisplay}

We'll be in touch with further details soon.

${appName}
  `;

  return sendEmail({
    to: email,
    subject: `${appName} - ${typeText} Confirmed!`,
    html,
    text,
  });
}

/**
 * Send welcome email to new user
 */
async function sendWelcomeEmail(email) {
  const appName = "Fat Big Quiz";
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3002";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
    .header { background: #7c3aed; color: #fff; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 32px; }
    .content h2 { margin: 0 0 16px 0; font-size: 20px; color: #1f2937; }
    .content p { margin: 16px 0; color: #4b5563; }
    .button { display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 16px 0; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e5e5; }
    .features { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .features ul { margin: 0; padding-left: 20px; }
    .features li { padding: 4px 0; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${appName}!</h1>
    </div>
    <div class="content">
      <h2>Thanks for signing up!</h2>
      <p>Your account has been created. You're now ready to browse and purchase our quiz packs.</p>

      <div class="features">
        <strong>What we offer:</strong>
        <ul>
          <li>Printable quiz packs for any occasion</li>
          <li>Instant digital downloads</li>
          <li>Full-colour and low-ink options</li>
          <li>Questions, answers, and score sheets included</li>
        </ul>
      </div>

      <p style="text-align: center;">
        <a href="${baseUrl}/shop" class="button">Browse Quiz Packs</a>
      </p>
    </div>
    <div class="footer">
      <p>${appName}</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Welcome to ${appName}!

Thanks for signing up! Your account has been created.

Browse our quiz packs: ${baseUrl}/shop

${appName}
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to ${appName}!`,
    html,
    text,
  });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, { resetUrl, expiresIn = "1 hour" }) {
  const appName = "Fat Big Quiz";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
    .header { background: #1f2937; color: #fff; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 32px; }
    .content h2 { margin: 0 0 16px 0; font-size: 20px; color: #1f2937; }
    .content p { margin: 16px 0; color: #4b5563; }
    .button { display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 16px 0; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e5e5; }
    .warning { background: #fef3c7; padding: 12px 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .warning p { margin: 0; color: #92400e; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset</h1>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>

      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>

      <div class="warning">
        <p>This link will expire in ${expiresIn}. If you didn't request a password reset, you can safely ignore this email.</p>
      </div>

      <p style="font-size: 12px; word-break: break-all; color: #6b7280;">Or copy this link: ${resetUrl}</p>
    </div>
    <div class="footer">
      <p>${appName}</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Password Reset

We received a request to reset your password.

Click here to reset: ${resetUrl}

This link will expire in ${expiresIn}.

${appName}
  `;

  return sendEmail({
    to: email,
    subject: `${appName} - Reset Your Password`,
    html,
    text,
  });
}

/**
 * Send admin notification email for new sales
 */
async function sendAdminSaleNotification({ customerEmail, productName, price, productType, sessionId }) {
  const appName = "Fat Big Quiz";
  const adminEmail = process.env.ADMIN_EMAIL || "laurence.stephan@bucketrace.com";
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3002";
  const priceDisplay = `£${parseFloat(price).toFixed(2)}`;
  const timestamp = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "medium",
    timeStyle: "short"
  });

  const typeLabel = productType === "DIGITAL_DOWNLOAD" ? "Digital Download"
                  : productType === "EVENT" ? "Event Booking"
                  : "Order";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px;">
    <tr>
      <td style="background: #10b981; color: #fff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600;">New Sale!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 6px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; color: #6b7280; width: 120px;">Product:</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; font-weight: 500; color: #1f2937;">${productName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; color: #6b7280;">Amount:</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; font-weight: 500; color: #1f2937;">${priceDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; color: #6b7280;">Type:</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; font-weight: 500; color: #1f2937;">${typeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; color: #6b7280;">Customer:</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; font-weight: 500; color: #1f2937;">${customerEmail}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #6b7280;">Time:</td>
            <td style="padding: 12px 16px; font-weight: 500; color: #1f2937;">${timestamp}</td>
          </tr>
        </table>
        <p style="text-align: center; margin-top: 20px;">
          <a href="${baseUrl}/admin/orders" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 13px;">View Orders</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e5e5;">
        ${appName} Admin Notification
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
New Sale!

Product: ${productName}
Amount: ${priceDisplay}
Type: ${typeLabel}
Customer: ${customerEmail}
Time: ${timestamp}

View orders: ${baseUrl}/admin/orders
  `;

  return sendEmail({
    to: adminEmail,
    subject: `[${appName}] New Sale: ${productName} - ${priceDisplay}`,
    html,
    text,
  });
}

module.exports = {
  sendEmail,
  sendPurchaseConfirmationEmail,
  sendOrderConfirmationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAdminSaleNotification,
};
