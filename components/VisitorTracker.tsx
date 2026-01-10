'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { collectAnalyticsData, getPageLoadTime } from '@/utils/analytics';

export default function VisitorTracker() {
  const hasTracked = useRef(false);
  const pageStartTime = useRef(Date.now());
  const pathname = usePathname();
  const currentVisitorId = useRef<string | null>(null);

  // Track page view
  useEffect(() => {
    // Skip admin pages
    if (pathname?.includes('admin')) {
      return;
    }

    // Reset for new page
    hasTracked.current = false;
    pageStartTime.current = Date.now();

    const trackPageView = async () => {
      if (hasTracked.current) return;
      hasTracked.current = true;

      try {
        // Wait a moment for page to fully load
        await new Promise(resolve => setTimeout(resolve, 100));

        const analyticsData = await collectAnalyticsData();

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analyticsData),
        });

        const result = await response.json();
        if (result.visitorId) {
          currentVisitorId.current = result.visitorId;
        }
      } catch (err) {
        console.error('Error tracking visitor:', err);
      }
    };

    trackPageView();
  }, [pathname]);

  // Track time on page when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentVisitorId.current && !pathname?.includes('admin')) {
        const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
        const pageLoadTime = getPageLoadTime();

        // Use sendBeacon for reliable delivery during page unload
        const data = JSON.stringify({
          visitorId: currentVisitorId.current,
          timeOnPage,
          pageLoadTime,
          eventType: 'page_exit',
        });

        navigator.sendBeacon(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/update`,
          new Blob([data], { type: 'application/json' })
        );
      }
    };

    // Also track on visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBeforeUnload();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  // Auto-track button clicks with data-track-button attribute
  useEffect(() => {
    if (pathname?.includes('admin')) return;

    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-track-button]') as HTMLElement;

      if (button) {
        const buttonName = button.getAttribute('data-track-button') ||
                           button.textContent?.trim() ||
                           'Unknown Button';

        // Track the button click
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'button_click',
            path: pathname,
            eventData: { buttonName },
          }),
        }).catch(err => console.error('Error tracking button click:', err));
      }
    };

    document.addEventListener('click', handleButtonClick);
    return () => document.removeEventListener('click', handleButtonClick);
  }, [pathname]);

  return null;
}

// E-commerce tracking functions (exported for use in other components)
export async function trackProductView(productId: string, productSlug: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'product_view',
        productViewed: productId,
        path: `/product/${productSlug}`,
      }),
    });
  } catch (err) {
    console.error('Error tracking product view:', err);
  }
}

export async function trackAddToCart(productId: string, quantity: number = 1) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'add_to_cart',
        productViewed: productId,
        eventData: { quantity },
        addedToCart: true,
      }),
    });
  } catch (err) {
    console.error('Error tracking add to cart:', err);
  }
}

export async function trackCheckoutStart(cartValue: number) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'checkout_start',
        checkoutStarted: true,
        orderValue: cartValue,
      }),
    });
  } catch (err) {
    console.error('Error tracking checkout start:', err);
  }
}

export async function trackPurchase(orderId: string, orderValue: number) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'purchase',
        purchaseComplete: true,
        orderValue,
        eventData: { orderId },
      }),
    });
  } catch (err) {
    console.error('Error tracking purchase:', err);
  }
}

export async function trackButtonClick(buttonId: string, buttonText: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'button_click',
        eventData: { buttonId, buttonText },
      }),
    });
  } catch (err) {
    console.error('Error tracking button click:', err);
  }
}
