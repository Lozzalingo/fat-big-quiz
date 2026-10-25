"use client";

import { createContext, useContext, useRef, ReactNode, useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type ScrollContextType = {
  scrollToProducts: () => void;
  productsSectionRef: React.RefObject<HTMLDivElement>;
};

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

/**
 * Inner component that reads useSearchParams inside a Suspense boundary.
 * This avoids the "useSearchParams() should be wrapped in a suspense boundary"
 * error that breaks static prerendering of every page when ScrollProvider
 * is mounted in the root layout.
 */
function ScrollParamsWatcher({
  onScrollRequested,
}: {
  onScrollRequested: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname === "/" && searchParams.get("scrollTo") === "products") {
      onScrollRequested();
    }
  }, [pathname, searchParams, onScrollRequested]);

  return null;
}

export const ScrollProvider = ({ children }: { children: ReactNode }) => {
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const scrollToProducts = () => {
    if (pathname !== "/") {
      setIsNavigating(true);
      router.push("/?scrollTo=products", { scroll: false });
    } else {
      productsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollRequested = useCallback(() => {
    let scrollAttempts = 0;
    const maxAttempts = 10;

    const attemptScroll = () => {
      if (productsSectionRef.current) {
        setTimeout(() => {
          productsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
          router.replace("/", { scroll: false });
          setIsNavigating(false);
        }, 100);
      } else if (scrollAttempts < maxAttempts) {
        scrollAttempts++;
        setTimeout(attemptScroll, 100 * scrollAttempts);
      }
    };

    setTimeout(attemptScroll, 200);
  }, [router]);

  // Also trigger scroll when navigating state changes
  useEffect(() => {
    if (isNavigating && pathname === "/") {
      handleScrollRequested();
    }
  }, [isNavigating, pathname, handleScrollRequested]);

  return (
    <ScrollContext.Provider value={{ scrollToProducts, productsSectionRef }}>
      <Suspense fallback={null}>
        <ScrollParamsWatcher onScrollRequested={handleScrollRequested} />
      </Suspense>
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
