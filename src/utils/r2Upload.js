/**
 * Zero-Dependency Cloudflare R2 Uploader & Deletion Service for I 4 You Matrimony
 * 
 * Features:
 * 1. Automatic client-side WebP compression (max 1000px, quality 0.75)
 * 2. Pure browser-native AWS Signature Version 4 (AWS4-HMAC-SHA256 via Web Crypto API crypto.subtle)
 * 3. Direct PUT upload to ${VITE_R2_ENDPOINT}/${VITE_R2_BUCKET_NAME}/${filePath}
 * 4. Permanent public URL return: ${VITE_R2_PUBLIC_URL}/${filePath}
 * 5. Direct DELETE request from Cloudflare R2 via AWS SigV4
 * 6. Zero uploads to Supabase Storage avatars bucket (strictly Cloudflare R2)
 */

import { compressImageToWebP } from './imageOptimizer';
import { addCacheBuster } from './cacheBuster';

export const PUBLIC_R2_DOMAIN = 'https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev';

/**
 * Formats/sanitizes any photo URL to strictly use the public R2 domain:
 * https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev/<objectKey>
 *
 * Rules:
 * 1. Do NOT save/render private S3 endpoint URLs (https://60ba75772b194956aea9a7080138d7e0.r2.cloudflarestorage.com/i4youmatrimony/...)
 * 2. Do NOT include /i4youmatrimony in the public .r2.dev URL
 * 3. Ensure no double slashes
 */
export function formatR2PublicUrl(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== 'string') return '';
  let clean = urlOrKey.trim();
  if (!clean) return '';

  // Preserve Supabase storage URLs
  if (clean.includes('supabase.co/storage/')) {
    return clean;
  }

  // Preserve data URLs and blob URLs
  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  // Handle query params e.g. ?t=123
  const [baseWithoutQuery, query] = clean.split('?');
  let path = baseWithoutQuery;

  // Replace any private Cloudflare R2 S3 endpoint with public domain
  if (path.includes('.r2.cloudflarestorage.com/')) {
    const parts = path.split('.r2.cloudflarestorage.com/');
    let sub = parts[1] || '';
    if (sub.startsWith('i4youmatrimony/')) {
      sub = sub.substring('i4youmatrimony/'.length);
    }
    path = `${PUBLIC_R2_DOMAIN}/${sub.replace(/^\/+/, '')}`;
  } else if (path.includes('pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev/')) {
    // Remove /i4youmatrimony if present
    path = path.replace('pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev/i4youmatrimony/', 'pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev/');
  } else if (!path.startsWith('http://') && !path.startsWith('https://')) {
    // Relative key e.g. avatars/profile_...jpg or family/family_...jpg
    let key = path.replace(/^\/+/, '');
    if (key.startsWith('i4youmatrimony/')) {
      key = key.substring('i4youmatrimony/'.length);
    }
    path = `${PUBLIC_R2_DOMAIN}/${key}`;
  }

  return query ? `${path}?${query}` : path;
}

/**
 * Reads environment variables safely in Vite and Node/test environments
 */
function getEnv(viteKey, reactKey) {
  let val = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      val = import.meta.env[viteKey] || (reactKey ? import.meta.env[reactKey] : '');
    }
  } catch (e) {}

  if (!val && typeof process !== 'undefined' && process.env) {
    val = process.env[viteKey] || (reactKey ? process.env[reactKey] : '');
  }

  return typeof val === 'string' ? val.trim() : '';
}

/**
 * Returns the configured Cloudflare R2 credentials with robust verified defaults
 */
export function getR2Config() {
  const endpoint = (getEnv('VITE_R2_ENDPOINT', 'REACT_APP_R2_ENDPOINT') || 'https://60ba75772b194956aea9a7080138d7e0.r2.cloudflarestorage.com').replace(/\/+$/, '');
  const accessKeyId = getEnv('VITE_R2_ACCESS_KEY_ID', 'REACT_APP_R2_ACCESS_KEY_ID') || '4eb0c79fe5884a7df815017ee19f7171';
  const secretAccessKey = getEnv('VITE_R2_SECRET_ACCESS_KEY', 'REACT_APP_R2_SECRET_ACCESS_KEY') || 'f33f804f8d0858ce476bcc6a72ddd54a1a577a7d3072da11672af6b4edb33486';
  const bucketName = getEnv('VITE_R2_BUCKET_NAME', 'REACT_APP_R2_BUCKET_NAME') || 'i4youmatrimony';
  let publicUrl = (getEnv('VITE_R2_PUBLIC_URL', 'REACT_APP_R2_PUBLIC_URL') || 'https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev').replace(/\/+$/, '');

  if (publicUrl.includes('dash.cloudflare.com')) {
    publicUrl = 'https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev';
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
    region: 'auto'
  };
}

/**
 * Checks whether all required Cloudflare R2 variables are set
 */
export function isR2Configured() {
  const cfg = getR2Config();
  return Boolean(cfg.endpoint && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucketName);
}

/**
 * Converts ArrayBuffer to lowercase hex string
 */
function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Computes SHA-256 hash using the Web Crypto API
 */
async function sha256Hex(data) {
  const enc = new TextEncoder();
  const buffer = typeof data === 'string' ? enc.encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hash);
}

/**
 * Computes HMAC-SHA256 signature using the Web Crypto API
 */
async function hmacSha256(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = typeof key === 'string'
    ? await crypto.subtle.importKey(
        'raw',
        enc.encode(key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
    : await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

  const msgBuffer = typeof message === 'string' ? enc.encode(message) : message;
  return await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
}

/**
 * Uploads a photo (File, Blob, or base64 data URL) strictly to Cloudflare R2
 * with automatic WebP compression and AWS SigV4 authorization.
 * 
 * @param {File|Blob|string} file - The raw photo to upload
 * @param {string} userId - User or candidate ID
 * @param {string} folder - Target folder prefix ('profiles' | 'family')
 * @returns {Promise<{
 *   success: boolean,
 *   publicUrl: string,
 *   filePath?: string,
 *   sizeKB?: number,
 *   error?: string
 * }>}
 */
export async function uploadPhotoToR2(file, userId = 'user', folder = 'profiles') {
  if (!file) {
    return { success: false, error: 'No image provided for upload' };
  }

  // If already an authentic live remote URL, return as-is
  if (typeof file === 'string' && file.startsWith('http')) {
    return { success: true, publicUrl: file };
  }

  // 1. Client-Side Compression (1000px max, quality 0.75)
  let compressed;
  try {
    compressed = await compressImageToWebP(file, {
      maxDimension: 1000,
      quality: 0.75,
      fillBackground: false
    });
  } catch (compErr) {
    console.warn('[r2Upload] Compression notice:', compErr);
    compressed = { dataUrl: file, sizeKB: 0 };
  }

  const { endpoint, accessKeyId, secretAccessKey, bucketName, region } = getR2Config();

  // 2. Unique timestamped filename conforming to Step-2 paths
  const cleanUserId = String(userId || 'user').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFolder = String(folder || 'profile').trim().toLowerCase();
  const isFamily = cleanFolder.includes('family');
  const timestamp = Date.now();
  const filePath = isFamily
    ? `family/family_${cleanUserId}_${timestamp}.jpg`
    : `avatars/profile_${cleanUserId}_${timestamp}.jpg`;

  try {
    // 3. Extract ArrayBuffer from WebP Blob or DataURL
    let bodyBuffer;
    if (compressed.blob) {
      bodyBuffer = await compressed.blob.arrayBuffer();
    } else if (compressed.dataUrl) {
      const byteString = atob(compressed.dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      bodyBuffer = ab;
    }

    if (!bodyBuffer) {
      throw new Error('Could not convert compressed image to ArrayBuffer');
    }

    // 4. Build AWS Signature Version 4 PUT Request
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const contentType = 'image/jpeg';

    const urlObj = new URL(endpoint);
    const host = urlObj.host;

    // Direct PUT upload to ${endpoint}/${bucketName}/${filePath}
    const uploadUrl = `${endpoint}/${bucketName}/${filePath}`;
    const canonicalUri = `/${encodeURIComponent(bucketName)}/${filePath.split('/').map(encodeURIComponent).join('/')}`;
    const canonicalQuery = '';

    const payloadHash = await sha256Hex(bodyBuffer);

    const canonicalHeaders = 
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = 
      `PUT\n` +
      `${canonicalUri}\n` +
      `${canonicalQuery}\n` +
      `${canonicalHeaders}\n` +
      `${signedHeaders}\n` +
      `${payloadHash}`;

    const canonicalReqHash = await sha256Hex(canonicalRequest);

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = 
      `AWS4-HMAC-SHA256\n` +
      `${amzDate}\n` +
      `${credentialScope}\n` +
      `${canonicalReqHash}`;

    // Derive AWS SigV4 signing key
    const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, 's3');
    const kSigning = await hmacSha256(kService, 'aws4_request');

    const signature = bufferToHex(await hmacSha256(kSigning, stringToSign));
    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // 5. Perform browser fetch PUT strictly to Cloudflare R2
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authHeader
      },
      body: bodyBuffer
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Cloudflare R2 PUT failed (${res.status}): ${errText || res.statusText}`);
    }

    // 6. Return the permanent public R2 URL (strictly public domain: pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev/<objectKey>)
    const cleanObjectKey = filePath.replace(/^\/+/, '').replace(/^i4youmatrimony\//, '');
    const rawPublicUrl = `${PUBLIC_R2_DOMAIN}/${cleanObjectKey}`;
    const publicUrl = addCacheBuster(rawPublicUrl, timestamp);

    console.info(`[r2Upload] Uploaded to Cloudflare R2: ${publicUrl} (${compressed.sizeKB} KB)`);

    return {
      success: true,
      publicUrl,
      rawPublicUrl,
      filePath: cleanObjectKey,
      sizeKB: compressed.sizeKB,
      isFallback: false
    };
  } catch (err) {
    console.error('[r2Upload] Cloudflare R2 upload error:', err.message);
    throw err;
  }
}

/**
 * Uploads a Status Story image directly to Cloudflare R2:
 * 1. Compresses in browser using WebP compressor (max 1080px, image/webp, quality 0.75 -> ~60KB - 100KB)
 * 2. Dedicated Cloudflare R2 path: stories/${currentUser.id}/${Date.now()}.webp
 * 3. Returns permanent public URL: ${PUBLIC_R2_DOMAIN}/stories/${currentUser.id}/${timestamp}.webp
 */
export async function uploadStoryToR2(file, userId = 'user') {
  if (!file) {
    return { success: false, error: 'No image provided for story upload' };
  }

  // If already an authentic live remote URL, return as-is
  if (typeof file === 'string' && file.startsWith('http')) {
    return { success: true, publicUrl: file };
  }

  // 1. Client-Side WebP Compression (max 1080px, quality 0.75, image/webp)
  let compressed;
  try {
    compressed = await compressImageToWebP(file, {
      maxDimension: 1080,
      quality: 0.75,
      fillBackground: false
    });
  } catch (compErr) {
    console.warn('[r2Upload] Story WebP compression notice:', compErr);
    compressed = { dataUrl: file, sizeKB: 0 };
  }

  const { endpoint, accessKeyId, secretAccessKey, bucketName, region } = getR2Config();

  // 2. Dedicated Cloudflare R2 path: stories/${currentUser.id}/${Date.now()}.webp
  const cleanUserId = String(userId || 'user').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const filePath = `stories/${cleanUserId}/${timestamp}.webp`;
  const contentType = 'image/webp';

  try {
    // 3. Extract ArrayBuffer from WebP Blob or DataURL
    let bodyBuffer;
    if (compressed.blob) {
      bodyBuffer = await compressed.blob.arrayBuffer();
    } else if (compressed.dataUrl) {
      const byteString = atob(compressed.dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      bodyBuffer = ab;
    }

    if (!bodyBuffer) {
      throw new Error('Could not convert compressed story to ArrayBuffer');
    }

    // 4. Build AWS Signature Version 4 PUT Request
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const urlObj = new URL(endpoint);
    const host = urlObj.host;

    const uploadUrl = `${endpoint}/${bucketName}/${filePath}`;
    const canonicalUri = `/${encodeURIComponent(bucketName)}/${filePath.split('/').map(encodeURIComponent).join('/')}`;
    const canonicalQuery = '';

    const payloadHash = await sha256Hex(bodyBuffer);

    const canonicalHeaders = 
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = 
      `PUT\n` +
      `${canonicalUri}\n` +
      `${canonicalQuery}\n` +
      `${canonicalHeaders}\n` +
      `${signedHeaders}\n` +
      `${payloadHash}`;

    const canonicalReqHash = await sha256Hex(canonicalRequest);

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = 
      `AWS4-HMAC-SHA256\n` +
      `${amzDate}\n` +
      `${credentialScope}\n` +
      `${canonicalReqHash}`;

    const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, 's3');
    const kSigning = await hmacSha256(kService, 'aws4_request');

    const signature = bufferToHex(await hmacSha256(kSigning, stringToSign));
    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authHeader
      },
      body: bodyBuffer
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Cloudflare R2 Story PUT failed (${res.status}): ${errText || res.statusText}`);
    }

    const cleanObjectKey = filePath.replace(/^\/+/, '').replace(/^i4youmatrimony\//, '');
    const rawPublicUrl = `${PUBLIC_R2_DOMAIN}/${cleanObjectKey}`;
    const publicUrl = addCacheBuster(rawPublicUrl, timestamp);

    console.info(`[r2Upload] Uploaded story to Cloudflare R2: ${publicUrl} (${compressed.sizeKB || Math.round(bodyBuffer.byteLength / 1024)} KB)`);

    return {
      success: true,
      publicUrl,
      rawPublicUrl,
      filePath: cleanObjectKey,
      sizeKB: compressed.sizeKB || Math.round(bodyBuffer.byteLength / 1024)
    };
  } catch (err) {
    console.error('[r2Upload] Cloudflare R2 story upload error:', err.message);
    throw err;
  }
}

/**
 * Deletes an object directly from Cloudflare R2 using AWS SigV4 DELETE.
 * 
 * @param {string} urlOrKey - Full URL or relative object key
 * @returns {Promise<{ success: boolean, filePath?: string, error?: string }>}
 */
export async function deletePhotoFromR2(urlOrKey) {
  if (!urlOrKey) return { success: false, error: 'No URL or key provided' };

  let filePath = String(urlOrKey).split('?')[0].trim();
  if (filePath.includes('r2.dev/')) {
    filePath = filePath.split('r2.dev/')[1];
  } else if (filePath.includes('.r2.cloudflarestorage.com/')) {
    const parts = filePath.split('.r2.cloudflarestorage.com/')[1];
    const slashIdx = parts.indexOf('/');
    filePath = slashIdx !== -1 ? parts.substring(slashIdx + 1) : parts;
  }
  filePath = filePath.replace(/^\/+/, '');
  if (filePath.startsWith('i4youmatrimony/')) {
    filePath = filePath.substring('i4youmatrimony/'.length);
  }
  filePath = filePath.replace(/^\/+/, '');
  if (!filePath) return { success: false, error: 'Could not extract object key' };

  try {
    const { endpoint, accessKeyId, secretAccessKey, bucketName, region } = getR2Config();
    const urlObj = new URL(endpoint);
    const host = urlObj.host;
    const deleteUrl = `${endpoint}/${bucketName}/${filePath}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const emptyPayloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const canonicalUri = `/${encodeURIComponent(bucketName)}/${filePath.split('/').map(encodeURIComponent).join('/')}`;
    const canonicalQuery = '';

    const canonicalHeaders = 
      `host:${host}\n` +
      `x-amz-content-sha256:${emptyPayloadHash}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = 
      `DELETE\n` +
      `${canonicalUri}\n` +
      `${canonicalQuery}\n` +
      `${canonicalHeaders}\n` +
      `${signedHeaders}\n` +
      `${emptyPayloadHash}`;

    const canonicalReqHash = await sha256Hex(canonicalRequest);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = 
      `AWS4-HMAC-SHA256\n` +
      `${amzDate}\n` +
      `${credentialScope}\n` +
      `${canonicalReqHash}`;

    const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, 's3');
    const kSigning = await hmacSha256(kService, 'aws4_request');

    const signature = bufferToHex(await hmacSha256(kSigning, stringToSign));
    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'x-amz-date': amzDate,
        'x-amz-content-sha256': emptyPayloadHash,
        'Authorization': authHeader
      }
    });

    if (res.ok || res.status === 404) {
      console.info(`[r2Upload] Successfully deleted from Cloudflare R2: ${filePath}`);
      return { success: true, filePath };
    } else {
      const errText = await res.text().catch(() => '');
      throw new Error(`Cloudflare R2 DELETE failed (${res.status}): ${errText}`);
    }
  } catch (err) {
    console.error('[r2Upload] Cloudflare R2 delete error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Batch upload utility for multiple photos
 */
export async function uploadPhotosBatchToR2(filesArray, userId = 'user', folder = 'profiles') {
  if (!Array.isArray(filesArray) || filesArray.length === 0) return [];
  const results = await Promise.all(
    filesArray.map(f => uploadPhotoToR2(f, userId, folder))
  );
  return results.filter(r => r && r.success && r.publicUrl).map(r => r.publicUrl);
}

// Re-export compression helper for unified import
export { compressImageToWebP };
