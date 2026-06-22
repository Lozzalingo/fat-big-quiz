"use client";

import { adminFetch } from "@/utils/adminFetch";
import React, { useState, useEffect } from "react";

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({ subject: "", heading: "", body: "", ctaUrl: "", ctaText: "" });
  const [sending, setSending] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  console.log("[CampaignsAdmin] Component rendered");

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await adminFetch(`${API_BASE}/api/campaigns`);
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[CampaignsAdmin] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const url = editing?.id
        ? `${API_BASE}/api/campaigns/${editing.id}`
        : `${API_BASE}/api/campaigns`;
      const method = editing?.id ? "PUT" : "POST";

      await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setEditing(null);
      setForm({ subject: "", heading: "", body: "", ctaUrl: "", ctaText: "" });
      fetchCampaigns();
    } catch (error) {
      console.error("[CampaignsAdmin] Save error:", error);
    }
  };

  const handlePreview = async () => {
    try {
      const res = await adminFetch(`${API_BASE}/api/campaigns/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setPreview(data.html || "");
    } catch (error) {
      console.error("[CampaignsAdmin] Preview error:", error);
    }
  };

  const handleTestSend = async () => {
    const email = prompt("Enter test email address:");
    if (!email) return;
    try {
      const res = await adminFetch(`${API_BASE}/api/campaigns/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email }),
      });
      const data = await res.json();
      alert(data.success ? "Test email sent!" : "Failed to send test email");
    } catch (error) {
      console.error("[CampaignsAdmin] Test send error:", error);
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm("Send this campaign to ALL subscribers? This cannot be undone.")) return;
    setSending(true);
    try {
      const res = await adminFetch(`${API_BASE}/api/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json();
      alert(`Sent to ${data.sentCount}/${data.totalSubscribers} subscribers`);
      fetchCampaigns();
    } catch (error) {
      console.error("[CampaignsAdmin] Send error:", error);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await adminFetch(`${API_BASE}/api/campaigns/${id}`, { method: "DELETE" });
      fetchCampaigns();
    } catch (error) {
      console.error("[CampaignsAdmin] Delete error:", error);
    }
  };

  const startEdit = (campaign?: any) => {
    if (campaign) {
      setForm({
        subject: campaign.subject,
        heading: campaign.heading || "",
        body: campaign.body,
        ctaUrl: campaign.ctaUrl || "",
        ctaText: campaign.ctaText || "",
      });
      setEditing(campaign);
    } else {
      setForm({ subject: "", heading: "", body: "", ctaUrl: "", ctaText: "" });
      setEditing({});
    }
    setPreview("");
  };

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Email Campaigns</h1>
          <button onClick={() => startEdit()} data-action="campaign_new" className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm">
            New Campaign
          </button>
        </div>

        {editing !== null && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{editing.id ? "Edit" : "New"} Campaign</h2>
            <div className="space-y-3">
              <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Subject line" className="w-full px-4 py-2 border rounded-lg" />
              <input type="text" value={form.heading} onChange={e => setForm(f => ({ ...f, heading: e.target.value }))}
                placeholder="Email heading (optional)" className="w-full px-4 py-2 border rounded-lg" />
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Email body (HTML supported)" rows={8} className="w-full px-4 py-2 border rounded-lg font-mono text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.ctaUrl} onChange={e => setForm(f => ({ ...f, ctaUrl: e.target.value }))}
                  placeholder="CTA URL (optional)" className="px-4 py-2 border rounded-lg" />
                <input type="text" value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                  placeholder="CTA button text" className="px-4 py-2 border rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} data-action="campaign_save" className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm">Save Draft</button>
              <button onClick={handlePreview} data-action="campaign_preview" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Preview</button>
              <button onClick={handleTestSend} data-action="campaign_test" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">Send Test</button>
              <button onClick={() => { setEditing(null); setPreview(""); }} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
            </div>
            {preview && (
              <div className="mt-4 border rounded-lg overflow-hidden">
                <div className="bg-gray-200 px-3 py-1 text-xs text-gray-600">Email Preview</div>
                <iframe srcDoc={preview} className="w-full h-96 border-0" title="Preview" />
              </div>
            )}
          </div>
        )}

        {loading ? <p>Loading...</p> : (
          <div className="space-y-3">
            {campaigns.length === 0 ? <p className="text-gray-400">No campaigns yet</p> : campaigns.map((c: any) => (
              <div key={c.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.subject}</p>
                  <p className="text-sm text-gray-400">
                    {c.status === "sent"
                      ? `Sent to ${c.sentCount} on ${new Date(c.sentAt).toLocaleDateString()}`
                      : `Draft — ${new Date(c.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.status === "draft" && (
                    <>
                      <button onClick={() => startEdit(c)} data-action="campaign_edit" className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Edit</button>
                      <button onClick={() => handleSend(c.id)} disabled={sending} data-action="campaign_send"
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
                        {sending ? "Sending..." : "Send"}
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete(c.id)} data-action="campaign_delete" className="px-3 py-1 text-sm text-red-500 border border-red-200 rounded hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default CampaignsPage;
