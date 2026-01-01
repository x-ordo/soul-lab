/**
 * API Request Signing Utility
 *
 * Provides HMAC signature generation for authenticated API requests.
 * In production, requests are signed with a shared secret to prevent tampering.
 * In development, signing is optional for easier testing.
 */

// Get signing secret from environment (set via build-time injection)
const SIGNING_SECRET = import.meta.env.VITE_SIGNING_SECRET || '';
const IS_DEV = import.meta.env.DEV;

/**
 * Generate HMAC-SHA256 signature
 */
async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get authentication headers for API request
 *
 * @param userKey - The user's unique identifier
 * @returns Headers object with authentication data
 */
export async function getAuthHeaders(userKey: string): Promise<Record<string, string>> {
  const timestamp = Date.now();

  // In development without secret, use simple header
  if (!SIGNING_SECRET) {
    if (IS_DEV) {
      return {
        'X-User-Key': userKey,
      };
    }
    console.warn('[API] VITE_SIGNING_SECRET not configured');
    return {
      'X-User-Key': userKey,
    };
  }

  // Generate signature
  const signature = await hmacSha256(`${userKey}:${timestamp}`, SIGNING_SECRET);

  return {
    'X-User-Key': userKey,
    'X-Timestamp': timestamp.toString(),
    'X-Signature': signature,
  };
}

/**
 * Create a fetch wrapper with authentication
 *
 * @param userKey - The user's unique identifier
 * @returns Wrapped fetch function that adds auth headers
 */
export function createAuthenticatedFetch(userKey: string) {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const authHeaders = await getAuthHeaders(userKey);

    const headers = new Headers(options.headers);
    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };
}

/**
 * Type-safe authenticated fetch with JSON response
 */
export async function fetchWithAuth<T>(
  url: string,
  userKey: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const authHeaders = await getAuthHeaders(userKey);

    const headers = new Headers(options.headers);
    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error || `HTTP ${response.status}` };
    }

    return { ok: true, data };
  } catch (e) {
    console.error('[API] Request failed:', e);
    return { ok: false, error: 'network_error' };
  }
}
