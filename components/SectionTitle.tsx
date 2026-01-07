"use client"

import React, { useEffect, useRef } from 'react'

interface SectionTitleProps {
  title: string;
  path: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ title, path }) => {
  const titleRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    // Simple fade-in animation when component mounts
    if (titleRef.current) {
      titleRef.current.style.opacity = '0';
      setTimeout(() => {
        if (titleRef.current) {
          titleRef.current.style.opacity = '1';
          titleRef.current.style.transform = 'translateY(0)';
        }
      }, 100);
    }
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-gray-900 via-black to-gray-900 py-16 px-4 mb-8 shadow-xl h-64 flex flex-col justify-center items-center">
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
      
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMxLjIgMCAyIC44IDIgMnYyMmMwIDEuMi0uOCAyLTIgMkgxMmMtMS4yIDAtMi0uOC0yLTJWMjBjMC0xLjIuOC0yIDItMmgyNHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-20" />
      
      {/* Content with transitions */}
      <div 
        ref={titleRef}
        className="relative transition-all duration-700 transform translate-y-4"
        style={{ transitionProperty: 'opacity, transform' }}
      >
        <h1 className="text-6xl font-bold text-center mb-6 text-white tracking-tight uppercase">
          {title}
        </h1>
        
        <div className="flex items-center justify-center">
          <div className="h-px w-12 bg-white/40 mr-4"></div>
          <p className="text-xl text-white/90 font-light">
            {path}
          </p>
          <div className="h-px w-12 bg-white/40 ml-4"></div>
        </div>
      </div>
      
      {/* Bottom decorative accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-800 via-white/20 to-gray-800"></div>
    </div>
  )
}

export default SectionTitle