"use client";

import React, { useState, useRef, useEffect } from "react";
import { getProductImageUrl, getQuizFormatExplainerUrl } from "@/utils/cdn";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface ProductImage {
  imageID: string;
  image: string;
}

interface QuizFormat {
  id: string;
  name: string;
  displayName: string;
  explainerImages?: string;
}

interface ProductImageGalleryProps {
  mainImage: string;
  images: ProductImage[];
  quizFormat?: QuizFormat;
  title: string;
}

export default function ProductImageGallery({
  mainImage,
  images,
  quizFormat,
  title,
}: ProductImageGalleryProps) {
  // Parse quiz format explainer images
  let explainerImages: string[] = [];
  if (quizFormat?.explainerImages) {
    try {
      explainerImages = JSON.parse(quizFormat.explainerImages);
    } catch (e) {
      console.error("Error parsing explainer images:", e);
    }
  }

  // Combine main image + additional images + quiz format explainer images
  const allImages = [
    { id: "main", src: getProductImageUrl(mainImage), type: "product" },
    ...images.map((img) => ({
      id: img.imageID,
      src: getProductImageUrl(img.image),
      type: "product",
    })),
    ...explainerImages.map((img, i) => ({
      id: `explainer-${i}`,
      src: getQuizFormatExplainerUrl(img),
      type: "explainer",
    })),
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mainImageHeight, setMainImageHeight] = useState<number | null>(null);
  const mainImageRef = useRef<HTMLImageElement>(null);

  // Update thumbnail container height when main image loads
  const handleImageLoad = () => {
    if (mainImageRef.current) {
      setMainImageHeight(mainImageRef.current.offsetHeight);
    }
  };

  // Reset height when image changes
  useEffect(() => {
    if (mainImageRef.current && mainImageRef.current.complete) {
      setMainImageHeight(mainImageRef.current.offsetHeight);
    }
  }, [selectedIndex]);

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  // Calculate thumbnail width as percentage (show ~6 thumbnails on mobile)
  const thumbCount = allImages.length;
  const mobileThumbWidth = `calc((100% - ${(Math.min(thumbCount, 6) - 1) * 8}px) / ${Math.min(thumbCount, 6)})`;

  return (
    <div className="w-full">
      {/* Desktop: Row layout with thumbnails left (lg and above) */}
      <div className="hidden lg:grid grid-cols-[10%_1fr] gap-3">
        {/* Thumbnail Sidebar - 10% of container width, same height as main image */}
        <div
          className="flex flex-col gap-2 overflow-y-auto"
          style={{ height: mainImageHeight ? `${mainImageHeight}px` : "auto" }}
        >
          {allImages.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(index)}
              className={`aspect-square border-2 overflow-hidden transition-all flex-shrink-0 ${
                selectedIndex === index
                  ? "border-primary"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <img
                src={img.src}
                alt={`${title} - Image ${index + 1}`}
                className="w-full h-full object-contain bg-gray-50"
              />
            </button>
          ))}
        </div>

        {/* Main Image - remaining width */}
        <div className="relative">
          <div className="border border-gray-200 overflow-hidden bg-gray-50">
            <img
              ref={mainImageRef}
              src={allImages[selectedIndex]?.src}
              alt={title}
              className="w-full h-auto"
              onLoad={handleImageLoad}
            />
          </div>

          {/* Navigation Arrows */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white border border-gray-200 flex items-center justify-center transition-all hover:border-primary"
                aria-label="Previous image"
              >
                <FaChevronLeft className="text-gray-600" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white border border-gray-200 flex items-center justify-center transition-all hover:border-primary"
                aria-label="Next image"
              >
                <FaChevronRight className="text-gray-600" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1">
              {selectedIndex + 1} / {allImages.length}
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Tablet: Column layout with thumbnails below (below lg) */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Main Image */}
        <div className="relative">
          <div className="border border-gray-200 overflow-hidden bg-gray-50">
            <img
              src={allImages[selectedIndex]?.src}
              alt={title}
              className="w-full h-auto"
            />
          </div>

          {/* Navigation Arrows */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white border border-gray-200 flex items-center justify-center transition-all hover:border-primary"
                aria-label="Previous image"
              >
                <FaChevronLeft className="text-gray-600" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white border border-gray-200 flex items-center justify-center transition-all hover:border-primary"
                aria-label="Next image"
              >
                <FaChevronRight className="text-gray-600" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1">
              {selectedIndex + 1} / {allImages.length}
            </div>
          )}
        </div>

        {/* Thumbnails Row - sized relative to container width */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(thumbCount, 6)}, 1fr)` }}>
          {allImages.slice(0, 6).map((img, index) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(index)}
              className={`aspect-square border-2 overflow-hidden transition-all ${
                selectedIndex === index
                  ? "border-primary"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <img
                src={img.src}
                alt={`${title} - Image ${index + 1}`}
                className="w-full h-full object-contain bg-gray-50"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
