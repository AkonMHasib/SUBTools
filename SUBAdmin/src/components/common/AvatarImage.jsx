// AvatarImage - Gravatar-aware smart avatar component
// Automatically fetches profile photo from Gravatar using email SHA-256 hash.
// Falls back to ui-avatars.com letter avatar if Gravatar has no photo set.
import { useEffect, useState } from 'react';

/**
 * Computes the SHA-256 hash of an email (lowercase + trimmed),
 * then returns a Gravatar URL. This uses the browser's native
 * crypto.subtle API — no external library needed.
 */
async function getGravatarUrl(email, size = 150) {
  if (!email) return null;
  try {
    const normalized = email.trim().toLowerCase();
    const encoded = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    // d=404 → returns HTTP 404 if no Gravatar (we catch with onError)
    // d=mp  → returns "mystery person" silhouette as fallback
    return `https://www.gravatar.com/avatar/${hashHex}?d=mp&s=${size}`;
  } catch {
    return null;
  }
}

/**
 * AvatarImage
 * Props:
 *  - photoURL  {string}  – Explicit photo URL (takes highest priority)
 *  - email     {string}  – Used to fetch Gravatar if photoURL not available
 *  - name      {string}  – Used for ui-avatars.com letter fallback
 *  - size      {number}  – Pixel size for Gravatar/ui-avatars request
 *  - className {string}  – img className
 *  - alt       {string}  – img alt text
 */
export const AvatarImage = ({ photo_url, photoURL, email, name, size = 150, className, alt }) => {
  const effectivePhoto = photo_url || photoURL;
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=3b82f6&color=fff&bold=true&size=${size}`;

  const [src, setSrc] = useState(effectivePhoto || fallbackUrl);

  useEffect(() => {
    // Priority 1: explicit photo_url or photoURL
    if (effectivePhoto) {
      setSrc(effectivePhoto);
      return;
    }
    // Priority 2: Gravatar derived from email
    if (email) {
      getGravatarUrl(email, size).then((url) => {
        if (url) setSrc(url);
      });
    }
  }, [effectivePhoto, email, size]);

  return (
    <img
      src={src}
      alt={alt || name || 'User avatar'}
      className={className}
      onError={() => setSrc(fallbackUrl)}
    />
  );
};

export default AvatarImage;
