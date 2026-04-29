/**
 * Analytics Utility - Re-exports from shared @lozzalingo/analytics package
 * fat-big-quiz uses prefix "fbq" for backward compatibility
 */
export {
  detectDevice,
  detectBot,
  getHardwareInfo,
  getUTMParams,
  generateFingerprint,
  getPageLoadTime,
  categorizeReferrer,
} from '@lozzalingo/analytics/client';

import {
  getOrCreateSessionId as _getOrCreateSessionId,
  incrementSessionPageCount as _incrementSessionPageCount,
  isNewVisitor as _isNewVisitor,
  collectAnalyticsData as _collectAnalyticsData,
} from '@lozzalingo/analytics/client';

// Wrap with fbq prefix for backward compatibility
const FBQ_CONFIG = { prefix: 'fbq' };

export function getOrCreateSessionId(): string {
  return _getOrCreateSessionId(FBQ_CONFIG);
}

export function incrementSessionPageCount(): number {
  return _incrementSessionPageCount(FBQ_CONFIG);
}

export function isNewVisitor(): boolean {
  return _isNewVisitor(FBQ_CONFIG);
}

export async function collectAnalyticsData() {
  return _collectAnalyticsData(FBQ_CONFIG);
}
