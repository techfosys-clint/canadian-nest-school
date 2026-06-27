/**
 * GTM Data Layer Tracking Utility
 */

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

/**
 * Pushes data to the global dataLayer array safely.
 */
export const pushToDataLayer = (data: any) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
};

/**
 * Generates a unique event ID (UUID v4) for GTM CAPI deduplication.
 */
export const generateEventId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback if crypto.randomUUID is not available (e.g. older browsers / non-HTTPS)
  return 'evt_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};
