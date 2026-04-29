'use client';

/**
 * VisitorTracker - Re-exports from shared @lozzalingo/analytics package
 * Configured for fat-big-quiz with prefix "fbq"
 */
import { VisitorTracker as SharedVisitorTracker, createEcommerceTracker } from '@lozzalingo/analytics/client';

export default function VisitorTracker() {
  return (
    <SharedVisitorTracker
      apiBaseUrl={process.env.NEXT_PUBLIC_API_BASE_URL || ''}
      prefix="fbq"
      excludePaths={['/admin']}
      enableEcommerce={true}
    />
  );
}

// E-commerce tracking functions (re-exported for backward compatibility)
const ecommerce = createEcommerceTracker(process.env.NEXT_PUBLIC_API_BASE_URL || '');

export const trackProductView = ecommerce.trackProductView;
export const trackAddToCart = ecommerce.trackAddToCart;
export const trackCheckoutStart = ecommerce.trackCheckoutStart;
export const trackPurchase = ecommerce.trackPurchase;
export const trackButtonClick = ecommerce.trackButtonClick;
