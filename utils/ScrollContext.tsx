"use client";

import { createContext, useContext, useRef, ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type ScrollContextType = {
  scrollToProducts: () => void;
  productsSectionRef: React.RefObject<HTMLDivElement>;
};

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const ScrollProvider = ({ children }: { children: ReactNode }) => {
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  const scrollToProducts = () => {
    if (pathname !== "/") {
      // Navigate to homepage with query param to trigger scroll
      setIsNavigating(true);
      router.push("/?scrollTo=products", { scroll: false });
    } else {
      // Already on homepage, scroll directly
      productsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle scroll after navigation
  useEffect(() => {
    if ((pathname === "/" && searchParams.get("scrollTo") === "products") || isNavigating) {
      // Use a more robust approach with multiple attempts
      let scrollAttempts = 0;
      const maxAttempts = 10;
      
      const attemptScroll = () => {
        if (productsSectionRef.current) {
          // Give the DOM a moment to fully render before scrolling
          setTimeout(() => {
            productsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
            // Clear query param and navigation state
            router.replace("/", { scroll: false });
            setIsNavigating(false);
          }, 100);
        } else if (scrollAttempts < maxAttempts) {
          // Retry with increasing delays if the ref isn't ready
          scrollAttempts++;
          setTimeout(attemptScroll, 100 * scrollAttempts);
        }
      };
      
      // Start the attempt process with a slight delay after page transition
      setTimeout(attemptScroll, 200);
    }
  }, [pathname, searchParams, router, isNavigating]);

  return (
    <ScrollContext.Provider value={{ scrollToProducts, productsSectionRef }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error("useScroll must be used within a ScrollProvider");
  }
  return context;
};