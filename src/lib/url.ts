/**
 * URL utilities for shareable links.
 * Generates both internal (intoss://) and external (https://) URLs.
 */

/**
 * Get the web base URL from environment.
 * Returns empty string if not configured (will use relative paths).
 */
export function getWebBaseUrl(): string {
  const base = import.meta.env.VITE_WEB_BASE_URL as string | undefined;
  if (!base?.trim()) return '';
  // Remove trailing slash for consistent concatenation
  return base.replace(/\/$/, '');
}

/**
 * Check if web sharing is configured (has base URL).
 */
export function isWebSharingEnabled(): boolean {
  return getWebBaseUrl().length > 0;
}

/**
 * Build a shareable web URL from a path and query params.
 * @param path - Route path (e.g., '/chemistry')
 * @param params - Query parameters as URLSearchParams or object
 * @returns Full https:// URL or relative path if base not configured
 */
export function buildWebUrl(
  path: string,
  params?: URLSearchParams | Record<string, string>
): string {
  const base = getWebBaseUrl();
  const queryString =
    params instanceof URLSearchParams
      ? params.toString()
      : params
        ? new URLSearchParams(params).toString()
        : '';

  const pathWithQuery = queryString ? `${path}?${queryString}` : path;

  return base ? `${base}${pathWithQuery}` : pathWithQuery;
}

/**
 * Convert an intoss:// deep link to a web URL.
 * Extracts path and query params from deep link.
 *
 * @example
 * deepLinkToWebUrl('intoss://soul-lab/chemistry?from=abc&d=20250101&sig=xyz')
 * // => 'https://example.com/chemistry?from=abc&d=20250101&sig=xyz'
 */
export function deepLinkToWebUrl(deepLink: string): string {
  // Parse: intoss://soul-lab/chemistry?from=...&d=...&sig=...
  const match = deepLink.match(/^intoss:\/\/soul-lab(\/[^?]*)(\?.*)?$/);
  if (!match) {
    console.warn('[url] Invalid deep link format:', deepLink);
    return deepLink; // Return as-is if can't parse
  }

  const [, path, queryString] = match;
  const params = queryString ? new URLSearchParams(queryString.slice(1)) : undefined;

  return buildWebUrl(path, params);
}
