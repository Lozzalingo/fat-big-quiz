"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useScroll } from "@/utils/ScrollContext";
import { FaRocket, FaInstagram, FaTwitter, FaEnvelope } from "react-icons/fa";

const Footer = () => {
  const { scrollToProducts } = useScroll();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-primary-dark to-primary text-white" aria-labelledby="footer-heading">
      <div className="mx-auto max-w-screen-2xl px-6 py-12 lg:px-8">
        <h2 id="footer-heading" className="sr-only">Footer</h2>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Fat Big Quiz"
                width={40}
                height={40}
                className="object-contain"
              />
              <span className="font-bold text-xl">Fat Big Quiz</span>
            </Link>
            <p className="text-white/70 text-sm text-center md:text-left">
              The ultimate pub quiz experience. Create, host, and play amazing quiz nights.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center gap-4">
            <h3 className="font-semibold text-lg">Quick Links</h3>
            <nav className="flex flex-col items-center gap-2 text-sm">
              <button
                onClick={scrollToProducts}
                data-track-button="Footer:Browse Quizzes"
                className="text-white/80 hover:text-white transition bg-transparent border-none p-0 m-0 cursor-pointer"
              >
                Browse Quizzes
              </button>
              <Link href="/blog" className="text-white/80 hover:text-white transition">
                Quiz Blog
              </Link>
              <a
                href="https://app.fatbigquiz.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/80 hover:text-white transition"
              >
                <FaRocket className="text-xs" />
                Launch App
              </a>
            </nav>
          </div>

          {/* Contact & Social */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <h3 className="font-semibold text-lg">Connect</h3>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/laurencedothow/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href="https://twitter.com/fatbigquiz"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                aria-label="Twitter"
              >
                <FaTwitter />
              </a>
              <a
                href="mailto:contact@fatbigquiz.com"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                aria-label="Email"
              >
                <FaEnvelope />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 pt-6 text-center">
          <p className="text-white/60 text-sm">
            © {currentYear} BucketRace Ltd. 'Fat Big Quiz' is a trading name of BucketRace.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;