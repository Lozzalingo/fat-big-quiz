"use client";

import Image from "next/image";
import React from "react";
import { FaArrowDown } from "react-icons/fa";

interface MainHeaderProps {
  onShopClick?: () => void;
}

export default function MainHeader({ onShopClick }: MainHeaderProps) {
  const handleScrollClick = () => {
    if (onShopClick) {
      onShopClick();
    } else {
      // Fallback: scroll to #products
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary via-primary-dark to-primary text-white">
      <div className="max-w-screen-xl mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Logo */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-white flex items-center justify-center">
            <Image
              src="/Fat Biq Quiz On Stage Logo No Background.png"
              width={120}
              height={120}
              alt="Fat Big Quiz"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight max-w-3xl">
            Everything You Need for{" "}
            <span className="text-gold">Amazing Quiz Nights</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/80 max-w-2xl">
            Live events, digital downloads, weekly packs, and a free quiz app.
            Find your perfect quiz solution below.
          </p>

          {/* Scroll CTA */}
          <button
            onClick={handleScrollClick}
            data-track-button="MainHeader:Explore Products"
            className="mt-4 flex flex-col items-center gap-2 text-white/70 hover:text-white transition group"
          >
            <span className="text-sm font-medium">Explore Our Products</span>
            <FaArrowDown className="text-xl animate-bounce" />
          </button>
        </div>
      </div>
    </div>
  );
}
