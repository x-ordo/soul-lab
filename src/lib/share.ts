/**
 * Unified sharing service.
 * Handles both Toss internal sharing and external platform sharing.
 */
import { makeShareLink as makeTossShareLink, shareMessage } from './toss';
import { deepLinkToWebUrl, isWebSharingEnabled } from './url';

export type ShareContext = 'toss' | 'external' | 'auto';

export interface ShareOptions {
  /** The intoss:// deep link to share */
  deepLink: string;
  /** Optional OG image URL for social previews */
  imageUrl?: string;
  /** Optional message text (defaults to link) */
  message?: string;
  /** Force context: 'toss' | 'external' | 'auto' (default) */
  context?: ShareContext;
}

/**
 * Detect if running inside Toss WebView.
 * Uses user agent and environment hints.
 */
export function isTossWebView(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();
  // Toss app typically includes 'toss' in UA
  if (ua.includes('toss')) return true;

  // Check build-time flag
  if (import.meta.env.VITE_USE_TOSS_SDK === 'true') return true;

  // Not mocked = likely in real Toss environment
  // When mocked (VITE_USE_TOSS_SDK is undefined/false), we're in web mode
  return false;
}

/**
 * Generate a shareable link based on context.
 * - In Toss: Uses Toss SDK for tracking
 * - External: Uses direct web URL
 */
export async function getShareableLink(options: ShareOptions): Promise<string> {
  const { deepLink, imageUrl, context = 'auto' } = options;

  const effectiveContext =
    context === 'auto' ? (isTossWebView() ? 'toss' : 'external') : context;

  if (effectiveContext === 'toss') {
    // Use Toss SDK for tracking
    return makeTossShareLink(deepLink, imageUrl);
  }

  // External sharing: use web URL directly
  // Only convert if web sharing is enabled (has base URL)
  if (isWebSharingEnabled()) {
    return deepLinkToWebUrl(deepLink);
  }

  // Fallback: return deep link as-is (relative paths work in Toss)
  return deepLink;
}

/**
 * Share content with appropriate method based on platform.
 * Returns true if sharing succeeded, false otherwise.
 */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  const link = await getShareableLink(options);
  const message = options.message ?? link;

  // Use Toss share in WebView
  if (isTossWebView()) {
    return shareMessage(message);
  }

  // External: try native Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Soul Lab',
        text: message,
        url: link,
      });
      return true;
    } catch (e) {
      // User cancelled or API failed
      console.warn('[share] Native share failed:', e);
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch (e) {
    console.error('[share] Clipboard copy failed:', e);
    return false;
  }
}
