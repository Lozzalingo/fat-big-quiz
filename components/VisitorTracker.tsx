'use client';

import { useEffect, useRef } from 'react';

export default function VisitorTracker() {
  // Use a ref to track if we've already sent a request for this page load
  const hasTracked = useRef(false);

  useEffect(() => {
    // Skip if we've already tracked this page view or if it's an admin page
    const currentPath = window.location.pathname;
    if (hasTracked.current || currentPath.includes('admin')) {
      return;
    }
    
    // Mark as tracked to prevent duplicate requests
    hasTracked.current = true;
    
    // Use the full URL including the server address
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer: document.referrer,
        path: currentPath,
      }),
    }).catch((err) => console.error('Error tracking visitor:', err));
  }, []); // Empty dependency array ensures this runs once per page load

  return null; // No UI needed
}