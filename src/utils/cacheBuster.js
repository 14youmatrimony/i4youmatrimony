/**
 * Cache Buster Utility
 * 
 * Appends or updates a timestamp query parameter ('t') on profile and gallery image URLs
 * (including Cloudflare R2, Supabase Storage, CDN, and backend image streaming URLs).
 * Prevents web browsers and CDN edge caches from serving stale cached images when a user
 * updates their profile picture or name.
 */

/**
 * Appends or updates a cache-busting timestamp on an image URL.
 * 
 * @param {string} url - Image URL to bust cache for
 * @param {string|number|Date} [timestamp] - Optional custom timestamp/version (defaults to Date.now())
 * @returns {string} - Cache-busted URL, or original if data:/blob: URL
 */
export function addCacheBuster(url, timestamp = null) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();

  // Skip base64 data URLs and local blob URLs as they are local memory buffers
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Only apply to HTTP, HTTPS, or relative path URLs
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    return trimmed;
  }

  // Derive timestamp integer (epoch milliseconds)
  let tsValue;
  if (!timestamp) {
    tsValue = Date.now();
  } else if (typeof timestamp === 'number') {
    tsValue = timestamp;
  } else if (timestamp instanceof Date) {
    tsValue = timestamp.getTime();
  } else {
    const parsed = new Date(timestamp).getTime();
    tsValue = isNaN(parsed) ? Date.now() : parsed;
  }

  try {
    const [base, queryString] = trimmed.split('?');
    const params = new URLSearchParams(queryString || '');
    params.set('t', String(tsValue));
    return `${base}?${params.toString()}`;
  } catch {
    const sep = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${sep}t=${tsValue}`;
  }
}

/**
 * Strips cache buster parameter from a URL if clean canonical URL is required for storage/database keys.
 * 
 * @param {string} url 
 * @returns {string}
 */
export function removeCacheBuster(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const [base, queryString] = url.split('?');
    if (!queryString) return base;
    const params = new URLSearchParams(queryString);
    params.delete('t');
    const rest = params.toString();
    return rest ? `${base}?${rest}` : base;
  } catch {
    return url;
  }
}
