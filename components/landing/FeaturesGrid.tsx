"use client";

import React from "react";
import { IconType } from "react-icons";
import {
  FaCheck,
  FaClock,
  FaDownload,
  FaUsers,
  FaTrophy,
  FaBook,
  FaGlobe,
  FaMobile,
} from "react-icons/fa";

interface Feature {
  title: string;
  description: string;
  icon?: IconType;
}

interface FeaturesGridProps {
  title?: string;
  subtitle?: string;
  features: Feature[] | string[]; // Can be array of objects or simple strings
  columns?: 2 | 3 | 4;
}

const defaultIcons: IconType[] = [
  FaCheck,
  FaClock,
  FaDownload,
  FaUsers,
  FaTrophy,
  FaBook,
  FaGlobe,
  FaMobile,
];

const FeaturesGrid: React.FC<FeaturesGridProps> = ({
  title,
  subtitle,
  features,
  columns = 3,
}) => {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  // Normalize features to always be objects
  const normalizedFeatures: Feature[] = features.map((feature, index) => {
    if (typeof feature === "string") {
      return {
        title: feature,
        description: "",
        icon: defaultIcons[index % defaultIcons.length],
      };
    }
    return {
      ...feature,
      icon: feature.icon || defaultIcons[index % defaultIcons.length],
    };
  });

  return (
    <div className="bg-white py-16 md:py-24">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className={`grid ${gridCols[columns]} gap-6`}>
          {normalizedFeatures.map((feature, index) => {
            const Icon = feature.icon!;
            return (
              <div
                key={index}
                className="bg-background p-6 rounded-xl text-center hover:shadow-lg transition-shadow border border-transparent hover:border-primary"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="text-2xl text-primary" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">
                  {feature.title}
                </h3>
                {feature.description && (
                  <p className="text-sm text-text-secondary">
                    {feature.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeaturesGrid;
