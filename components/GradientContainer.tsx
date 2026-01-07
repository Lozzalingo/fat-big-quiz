// components/GradientContainer.tsx
import React, { ReactNode, forwardRef } from "react";

type GradientContainerProps = {
  children: ReactNode;
  className?: string;
};

const GradientContainer = forwardRef<HTMLDivElement, GradientContainerProps>(
  ({ children, className = "" }, ref) => {
    return (
      <div className="bg-gradient-to-r from-primary via-primary-dark to-primary shadow-lg">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
          <div className={`max-w-screen-2xl mx-auto ${className}`} ref={ref}>
            {children}
          </div>
        </div>
      </div>
    );
  }
);

GradientContainer.displayName = "GradientContainer";

export default GradientContainer;