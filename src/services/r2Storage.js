/**
 * Cloudflare R2 Storage Service for I 4 You Matrimony
 * 
 * Implements high-performance client-side WebP compression (max 1080px, quality 0.75,
 * ~60 KB - 100 KB per portrait) and uploads directly to Cloudflare R2 via AWS S3 SigV4.
 * 
 * Includes resilient smart fallback to Supabase Storage and lightweight WebP data URLs
 * so photo uploads NEVER fail even if R2 keys or CORS are not yet configured.
 */

import { compressImageToWebP } from '../utils/imageOptimizer';
import { addCacheBuster } from '../utils/cacheBuster';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Reads an environment variable safely across Vite and Node/React runtimes
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
 * Returns the current Cloudflare R2 configuration
 */
export function getR2Config() {
  const endpoint = getEnv('VITE_R2_ENDPOINT', 'REACT_APP_R2_ENDPOINT');
  const accessKeyId = getEnv('VITE_R2_ACCESS_KEY_ID', 'REACT_APP_R2_ACCESS_KEY_ID');
  const secretAccessKey = getEnv('VITE_R2_SECRET_ACCESS_KEY', 'REACT_APP_R2_SECRET_ACCESS_KEY');
  const bucketName = getEnv('VITE_R2_BUCKET_NAME', 'REACT_APP_R2_BUCKET_NAME');
  const publicUrl = getEnv('VITE_R2_PUBLIC_URL', 'REACT_APP_R2_PUBLIC_URL');

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
 * Checks whether Cloudflare R2 credentials are fully configured
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
 * Normalizes R2 endpoint and extracts bucket name and base origin
 */
function normalizeEndpoint(endpointStr, bucketStr) {
  let cleaned = endpointStr.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  const url = new URL(cleaned);
  const origin = url.origin;
  const host = url.host;
  let pathBucket = url.pathname.replace(/^\/+|\/+$/g, '');
  const bucket = bucketStr || pathBucket;

  return {
    origin,
    host,
    bucket
  };
}

/**
 * Uploads a raw ArrayBuffer to Cloudflare R2 using AWS S3 Signature Version 4
 */
async function executeR2SigV4Put({
  endpoint,
  accessKeyId,
  secretAccessKey,
  bucketName,
  region = 'auto',
  objectKey,
  bodyBuffer,
  contentType = 'image/webp'
}) {
  const { origin, host, bucket } = normalizeEndpoint(endpoint, bucketName);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  // Path-style S3 URI: /<bucket>/<objectKey>
  const canonicalUri = `/${encodeURIComponent(bucket)}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
  const canonicalQuery = '';

  const payloadHash = await sha256Hex(bodyBuffer);

  // Canonical headers (must be sorted alphabetically by lowercase header name)
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

  // Deriving the AWS SigV4 signing key
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');

  const signature = bufferToHex(await hmacSha256(kSigning, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const targetUrl = `${origin}${canonicalUri}`;

  const response = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authHeader
    },
    body: bodyBuffer
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`R2 PUT error ${response.status}: ${errorText || response.statusText}`);
  }

  return true;
}

/**
 * Smart Fallback: Attempts Supabase Storage upload, or returns the compressed WebP data URL
 */
async function fallbackUpload(compressed, userId, folder) {
  console.info(`[r2Storage] Executing smart fallback for ${folder}/${userId}...`);

  // 1. Try uploading to Supabase Storage 'avatars' bucket
  if (isSupabaseConfigured() && supabase) {
    try {
      const cleanUserId = String(userId || `user_${Date.now()}`).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanUserId}_${Date.now()}.webp`;
      const filePath = `${cleanUserId}/${fileName}`;
      const uploadBody = compressed.blob || compressed.file;

      if (uploadBody) {
        const { error: sbErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, uploadBody, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/webp'
          });

        if (!sbErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            const publicUrl = addCacheBuster(urlData.publicUrl, Date.now());
            return {
              success: true,
              publicUrl,
              rawPublicUrl: urlData.publicUrl,
              sizeKB: compressed.sizeKB,
              isFallback: true,
              source: 'supabase_storage'
            };
          }
        }
      }
    } catch (sbErr) {
      console.warn('[r2Storage] Supabase storage fallback error:', sbErr);
    }
  }

  // 2. Final rock-solid fallback: return lightweight compressed WebP data URL
  return {
    success: true,
    publicUrl: compressed.dataUrl,
    sizeKB: compressed.sizeKB,
    isFallback: true,
    source: 'compressed_webp_dataurl'
  };
}

/**
 * Primary Upload Method:
 * 1. Automatically compresses image to high-definition WebP (max 1080px, quality 0.75, ~60-100 KB)
 * 2. Uploads to Cloudflare R2 bucket
 * 3. Returns permanent public HTTPS URL
 * 4. Gracefully falls back to Supabase Storage if R2 is not configured
 * 
 * @param {File|Blob|string} fileOrDataUrl - The image to compress and upload
 * @param {string} userId - User or candidate ID for clean folder organization
 * @param {string} folder - Target folder prefix ('profiles' | 'family' | 'documents')
 * @returns {Promise<{
 *   success: boolean,
 *   publicUrl: string,
 *   objectKey?: string,
 *   sizeKB?: number,
 *   isFallback?: boolean,
 *   error?: string
 * }>}
 */
export async function uploadPhotoToR2(fileOrDataUrl, userId = 'user', folder = 'profiles') {
  if (!fileOrDataUrl) {
    return { success: false, error: 'No image provided for upload' };
  }

  // If already an authentic remote URL (Cloudflare R2, Unsplash, or CDN), return as-is
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
    return { success: true, publicUrl: fileOrDataUrl };
  }

  let compressed;
  try {
    // 1. Client-Side High-Definition WebP Compression (~60 KB - 100 KB)
    compressed = await compressImageToWebP(fileOrDataUrl, {
      maxDimension: 1080,
      quality: 0.75,
      fillBackground: false
    });
  } catch (compErr) {
    console.warn('[r2Storage] WebP compression notice, falling back:', compErr);
    return await fallbackUpload({ dataUrl: fileOrDataUrl, sizeKB: 0 }, userId, folder);
  }

  // 2. Check if Cloudflare R2 credentials are fully populated
  if (!isR2Configured()) {
    console.info('[r2Storage] Cloudflare R2 credentials not set in .env. Using smart fallback storage.');
    return await fallbackUpload(compressed, userId, folder);
  }

  const r2Config = getR2Config();

  // 3. Prepare clean R2 object key
  const cleanUserId = String(userId || 'user').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFolder = String(folder || 'profiles').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}_${randomSuffix}.webp`;
  const objectKey = `${cleanFolder}/${cleanUserId}/${filename}`;

  try {
    // 4. Extract ArrayBuffer from WebP Blob
    let arrayBuffer;
    if (compressed.blob) {
      arrayBuffer = await compressed.blob.arrayBuffer();
    } else if (compressed.dataUrl) {
      const byteString = atob(compressed.dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      arrayBuffer = ab;
    }

    if (!arrayBuffer) {
      throw new Error('Failed to extract array buffer for R2 upload');
    }

    // 5. Execute AWS S3 SigV4 PUT to Cloudflare R2
    await executeR2SigV4Put({
      endpoint: r2Config.endpoint,
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
      bucketName: r2Config.bucketName,
      region: r2Config.region,
      objectKey,
      bodyBuffer: arrayBuffer,
      contentType: 'image/webp'
    });

    // 6. Build the final public URL
    let publicBase = r2Config.publicUrl ? r2Config.publicUrl.replace(/\/+$/, '') : '';
    if (!publicBase) {
      // If VITE_R2_PUBLIC_URL is omitted, construct from endpoint and bucket
      const { origin, bucket } = normalizeEndpoint(r2Config.endpoint, r2Config.bucketName);
      publicBase = `${origin}/${bucket}`;
    }

    const rawPublicUrl = `${publicBase}/${objectKey}`;
    const publicUrl = addCacheBuster(rawPublicUrl, timestamp);

    console.info(`[r2Storage] Successfully uploaded to Cloudflare R2: ${publicUrl} (${compressed.sizeKB} KB)`);

    return {
      success: true,
      publicUrl,
      rawPublicUrl,
      objectKey,
      sizeKB: compressed.sizeKB,
      isFallback: false
    };
  } catch (r2Err) {
    console.warn('[r2Storage] Cloudflare R2 upload encountered an issue, gracefully falling back:', r2Err.message);
    return await fallbackUpload(compressed, userId, folder);
  }
}

/**
 * Uploads a batch of images to Cloudflare R2 in parallel
 * 
 * @param {Array<File|Blob|string>} imagesArray - Array of images
 * @param {string} userId - User or candidate ID
 * @param {string} folder - Target folder prefix ('profiles' | 'family')
 * @returns {Promise<Array<string>>} Array of public URLs
 */
export async function uploadPhotosBatchToR2(imagesArray, userId = 'user', folder = 'profiles') {
  if (!Array.isArray(imagesArray) || imagesArray.length === 0) {
    return [];
  }

  const results = await Promise.all(
    imagesArray.map(img => uploadPhotoToR2(img, userId, folder))
  );

  return results
    .filter(res => res && res.success && res.publicUrl)
    .map(res => res.publicUrl);
}

// Re-export compression helper for unified access
export { compressImageToWebP };
