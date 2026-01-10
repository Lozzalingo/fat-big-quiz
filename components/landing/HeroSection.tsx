"use client";

import React from "react";
import Link from "next/link";
import { FaPlay } from "react-icons/fa";

interface CtaProps {
  text: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
}

interface HeroSectionProps {
  title: string;
  subtitle: string;
  description?: string;
  image?: string;
  backgroundImage?: string;
  videoUrl?: string;
  primaryCta?: CtaProps;
  secondaryCta?: CtaProps;
  badge?: string;
  price?: number;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  subtitle,
  description,
  image,
  backgroundImage,
  videoUrl,
  primaryCta,
  secondaryCta,
  badge,
  price,
}) => {
  const [showVideo, setShowVideo] = React.useState(false);

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  const videoId = videoUrl ? getYouTubeId(videoUrl) : null;
  const displayImage = backgroundImage || image;

  const renderCta = (cta: CtaProps, isPrimary: boolean) => {
    const className = isPrimary
      ? "flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-lg shadow-lg transform transition hover:scale-105 hover:shadow-xl"
      : "flex items-center gap-2 bg-white/20 text-white font-bold px-8 py-4 rounded-lg border-2 border-white/30 transform transition hover:bg-white/30";

    if (cta.href) {
      // Check if external link
      if (cta.href.startsWith("http")) {
        return (
          <a
            href={cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {cta.icon}
            {cta.text}
          </a>
        );
      }
      // Internal link
      return (
        <Link href={cta.href} data-track-button={`Hero:${cta.text}`} className={className}>
          {cta.icon}
          {cta.text}
        </Link>
      );
    }

    return (
      <button onClick={cta.onClick} data-track-button={`Hero:${cta.text}`} className={className}>
        {cta.icon}
        {cta.text}
      </button>
    );
  };

  return (
    <div className="bg-gradient-to-br from-primary via-primary-dark to-primary text-white py-16 md:py-24">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="flex flex-col gap-6">
            {badge && (
              <span className="inline-flex items-center bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold w-fit">
                {badge}
              </span>
            )}

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
              {title}
            </h1>

            <p className="text-xl md:text-2xl text-white/90 font-medium line-clamp-3">
              {subtitle}
            </p>

            {description && (
              <p className="text-lg text-white/70 max-w-xl">{description}</p>
            )}

            {price !== undefined && (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">£{price}</span>
                <span className="text-white/70">one-time purchase</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 mt-4">
              {primaryCta && renderCta(primaryCta, true)}
              {secondaryCta && renderCta(secondaryCta, false)}
            </div>
          </div>

          {/* Right Content - Image or Video */}
          <div className="relative">
            {videoId && !showVideo ? (
              <div
                className="relative cursor-pointer group"
                onClick={() => setShowVideo(true)}
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt={title}
                  className="w-full rounded-xl shadow-2xl aspect-video object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl group-hover:bg-black/40 transition">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                    <FaPlay className="text-primary text-2xl ml-1" />
                  </div>
                </div>
              </div>
            ) : videoId && showVideo ? (
              <div className="relative pt-[56.25%] rounded-xl overflow-hidden shadow-2xl">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : displayImage ? (
              <div className="relative">
                <img
                  src={displayImage}
                  alt={title}
                  className="w-full rounded-xl shadow-2xl aspect-video object-cover"
                />
              </div>
            ) : (
              <div className="relative bg-white/10 rounded-xl aspect-video flex items-center justify-center">
                <span className="text-white/50 text-lg">No preview available</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
