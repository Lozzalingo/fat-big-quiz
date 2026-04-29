"use client";

import { useState } from "react";
import { Facebook, Twitter, Linkedin, Link2, Check } from "lucide-react";

interface SocialShareProps {
  title: string;
  slug: string;
  excerpt: string;
}

export default function SocialShare({ title, slug, excerpt }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const postUrl = `https://fatbigquiz.com/blog/${slug}`;

  // UTM-tagged URLs per platform
  function utmUrl(source: string) {
    return `${postUrl}?utm_source=${source}&utm_medium=social&utm_campaign=share`;
  }

  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: "facebook_share",
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(utmUrl("facebook"))}`,
      color: "hover:bg-[#1877F2] hover:text-white",
    },
    {
      name: "x_share",
      label: "X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(utmUrl("twitter"))}&text=${encodedTitle}`,
      color: "hover:bg-black hover:text-white",
    },
    {
      name: "linkedin_share",
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(utmUrl("linkedin"))}`,
      color: "hover:bg-[#0A66C2] hover:text-white",
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = postUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-xl border border-border shadow-sm">
      <p className="text-sm font-semibold text-text-primary mb-3">Share this quiz</p>
      <div className="flex items-center gap-3">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            data-action={link.name}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary text-sm font-medium transition-all ${link.color}`}
          >
            <link.icon size={16} />
            <span className="hidden sm:inline">{link.label}</span>
          </a>
        ))}
        <button
          onClick={copyLink}
          data-action="copy_link_share"
          name="copy_link_share"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary text-sm font-medium transition-all hover:bg-primary hover:text-white"
        >
          {copied ? <Check size={16} /> : <Link2 size={16} />}
          <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Link"}</span>
        </button>
      </div>
    </div>
  );
}
