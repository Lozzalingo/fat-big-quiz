"use client";

import { DashboardSidebar } from "@/components";
import React, { useState } from "react";
import { FaEnvelope, FaPaperPlane, FaCheck, FaTimes, FaEye } from "react-icons/fa";

const emailTypes = [
  { id: "purchase", name: "Purchase Confirmation", description: "Sent after digital download purchase" },
  { id: "order", name: "Order Confirmation", description: "Sent for events/physical orders" },
  { id: "welcome", name: "Welcome Email", description: "Sent when a new user signs up" },
  { id: "password-reset", name: "Password Reset", description: "Sent when user requests password reset" },
];

const TestEmailsPage = () => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [previewType, setPreviewType] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  const sendTestEmail = async (type: string) => {
    if (!email) {
      alert("Please enter an email address");
      return;
    }

    setSending(type);
    setResults((prev) => ({ ...prev, [type]: { success: false, message: "Sending..." } }));

    try {
      const res = await fetch(`${API_BASE}/api/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResults((prev) => ({ ...prev, [type]: { success: true, message: "Sent!" } }));
      } else {
        setResults((prev) => ({ ...prev, [type]: { success: false, message: data.error || "Failed" } }));
      }
    } catch (error) {
      setResults((prev) => ({ ...prev, [type]: { success: false, message: "Network error" } }));
    } finally {
      setSending(null);
    }
  };

  const sendAllEmails = async () => {
    for (const emailType of emailTypes) {
      await sendTestEmail(emailType.id);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  // Email preview HTML templates
  const getPreviewHtml = (type: string) => {
    const baseStyles = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
      .container { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
      .header { background: #7c3aed; color: #fff; padding: 32px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
      .content { padding: 32px; }
      .content h2 { margin: 0 0 16px 0; font-size: 20px; color: #1f2937; }
      .content p { margin: 16px 0; color: #4b5563; }
      .summary { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #7c3aed; }
      .button { display: inline-block; background: #7c3aed; color: #fff; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; }
      .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e5e5; }
    `;

    switch (type) {
      case "purchase":
        return `
          <style>${baseStyles}</style>
          <div class="container">
            <div class="header"><h1>Thanks for your purchase!</h1></div>
            <div class="content">
              <h2>Your download is ready</h2>
              <p>Thank you for purchasing from Fat Big Quiz. Your quiz pack is ready to download.</p>
              <div class="summary">
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e5e5">
                  <span>Product:</span><span><strong>Sample Quiz Pack</strong></span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0">
                  <span>Amount Paid:</span><span>£4.99</span>
                </div>
              </div>
              <p style="text-align:center"><a href="#" class="button">Download Your Quiz Pack</a></p>
            </div>
            <div class="footer"><p><strong>Fat Big Quiz</strong></p></div>
          </div>
        `;
      case "order":
        return `
          <style>${baseStyles}</style>
          <div class="container">
            <div class="header"><h1>Order Confirmed!</h1></div>
            <div class="content">
              <h2>Thank you for your order!</h2>
              <p>We've received your order and are processing it now.</p>
              <div class="summary" style="border-left-color:#10b981">
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e5e5">
                  <span>Product:</span><span><strong>Fat Big Quiz On Stage</strong></span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0">
                  <span>Amount Paid:</span><span>£19.99</span>
                </div>
              </div>
              <p>We'll be in touch with further details soon.</p>
            </div>
            <div class="footer"><p><strong>Fat Big Quiz</strong></p></div>
          </div>
        `;
      case "welcome":
        return `
          <style>${baseStyles}</style>
          <div class="container">
            <div class="header"><h1>Welcome to Fat Big Quiz!</h1></div>
            <div class="content">
              <h2>Thanks for signing up!</h2>
              <p>Your account has been created. You're now ready to browse and purchase our quiz packs.</p>
              <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:20px 0">
                <strong>What we offer:</strong>
                <ul style="margin:10px 0;padding-left:20px;color:#4b5563">
                  <li>Printable quiz packs for any occasion</li>
                  <li>Instant digital downloads</li>
                  <li>Full-colour and low-ink options</li>
                </ul>
              </div>
              <p style="text-align:center"><a href="#" class="button">Browse Quiz Packs</a></p>
            </div>
            <div class="footer"><p><strong>Fat Big Quiz</strong></p></div>
          </div>
        `;
      case "password-reset":
        return `
          <style>${baseStyles}
            .header { background: #1f2937; }
            .warning { background: #fef3c7; padding: 12px 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; color: #92400e; font-size: 13px; }
          </style>
          <div class="container">
            <div class="header"><h1>Password Reset</h1></div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align:center"><a href="#" class="button">Reset Password</a></p>
              <div class="warning">This link will expire in 1 hour. If you didn't request this, you can ignore this email.</div>
            </div>
            <div class="footer"><p><strong>Fat Big Quiz</strong></p></div>
          </div>
        `;
      default:
        return "";
    }
  };

  return (
    <div className="bg-gray-50 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <FaEnvelope className="text-2xl text-gray-600" />
            <h1 className="text-2xl font-semibold text-gray-800">Email Templates</h1>
          </div>

          {/* Email Input */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send test emails to:
            </label>
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendAllEmails}
                disabled={!email || sending !== null}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send All
              </button>
            </div>
          </div>

          {/* Email Type Cards */}
          <div className="space-y-3 mb-6">
            {emailTypes.map((emailType) => (
              <div
                key={emailType.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">{emailType.name}</h3>
                    <p className="text-sm text-gray-500">{emailType.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {results[emailType.id] && (
                      <span
                        className={`flex items-center gap-1 text-sm ${
                          results[emailType.id].success ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {results[emailType.id].success ? <FaCheck /> : <FaTimes />}
                        {results[emailType.id].message}
                      </span>
                    )}
                    <button
                      onClick={() => setPreviewType(previewType === emailType.id ? null : emailType.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <FaEye />
                      Preview
                    </button>
                    <button
                      onClick={() => sendTestEmail(emailType.id)}
                      disabled={!email || sending !== null}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        sending === emailType.id
                          ? "bg-gray-100 text-gray-400"
                          : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <FaPaperPlane className={sending === emailType.id ? "animate-pulse" : ""} />
                      {sending === emailType.id ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>

                {/* Preview Section */}
                {previewType === emailType.id && (
                  <div className="mt-4 border-t pt-4">
                    <div className="bg-gray-100 rounded-lg p-4 overflow-auto max-h-[500px]">
                      <div
                        dangerouslySetInnerHTML={{ __html: getPreviewHtml(emailType.id) }}
                        className="bg-white rounded shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Emails are sent via Resend. Make sure RESEND_API_KEY is configured in your environment variables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestEmailsPage;
