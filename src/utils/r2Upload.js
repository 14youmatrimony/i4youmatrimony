/**
 * Zero-Dependency Cloudflare R2 Uploader for I 4 You Matrimony
 * 
 * Features:
 * 1. Automatic client-side WebP compression (max 1080px, quality 0.75, ~60-100 KB)
 * 2. Pure browser-native AWS Signature Version 4 (AWS4-HMAC-SHA256 via Web Crypto API crypto.subtle)
 * 3. Direct PUT upload to ${VITE_R2_ENDPOINT}/${VITE_R2_BUCKET_NAME}/${filePath}
 * 4. Permanent public URL return: ${VITE_R2_PUBLIC_URL}/${filePath}
 * 5. Smart fallback to Supabase Storage and WebP data URL to guarantee zero upload breakage
 */

import { compressImageToWebP } from './imageOptimizer';
import { addCacheBuster } from './cacheBuster';
import { supabase, isSupabaseConfigured } from '../services/supabase';

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
 * Returns the configured Cloudflare R2 credentials from .env
 */
export function getR2Config() {
  const endpoint = getEnv('VITE_R2_ENDPOINT', 'REACT_APP_R2_ENDPOINT').replace(/\/+$/, '');
  const accessKeyId = getEnv('VITE_R2_ACCESS_KEY_ID', 'REACT_APP_R2_ACCESS_KEY_ID');
  const secretAccessKey = getEnv('VITE_R2_SECRET_ACCESS_KEY', 'REACT_APP_R2_SECRET_ACCESS_KEY');
  const bucketName = getEnv('VITE_R2_BUCKET_NAME', 'REACT_APP_R2_BUCKET_NAME');
  const publicUrl = getEnv('VITE_R2_PUBLIC_URL', 'REACT_APP_R2_PUBLIC_URL').replace(/\/+$/, '');

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
 * Smart Fallback: Attempts Supabase Storage upload or returns the compressed WebP data URL
 */
async function fallbackUpload(compressed, userId, folder) {
  console.info(`[r2Upload] Fallback handler activated for ${folder}/${userId}...`);

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
              filePath,
              sizeKB: compressed.sizeKB,
              isFallback: true,
              source: 'supabase_storage'
            };
          }
        }
      }
    } catch (sbErr) {
      console.warn('[r2Upload] Supabase storage fallback error:', sbErr);
    }
  }

  return {
    success: true,
    publicUrl: compressed.dataUrl,
    sizeKB: compressed.sizeKB,
    isFallback: true,
    source: 'compressed_webp_dataurl'
  };
}

/**
 * Uploads a photo (File, Blob, or base64 data URL) to Cloudflare R2
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
 *   isFallback?: boolean,
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

  // 1. Client-Side WebP Compression (1080px max, quality 0.75, ~60-100 KB)
  let compressed;
  try {
    compressed = await compressImageToWebP(file, {
      maxDimension: 1080,
      quality: 0.75,
      fillBackground: false
    });
  } catch (compErr) {
    console.warn('[r2Upload] WebP compression notice:', compErr);
    return await fallbackUpload({ dataUrl: file, sizeKB: 0 }, userId, folder);
  }

  // 2. Check if Cloudflare R2 credentials are fully populated
  if (!isR2Configured()) {
    console.info('[r2Upload] Cloudflare R2 credentials not fully populated. Using smart fallback.');
    return await fallbackUpload(compressed, userId, folder);
  }

  const { endpoint, accessKeyId, secretAccessKey, bucketName, publicUrl: basePublicUrl, region } = getR2Config();

  // 3. Format path: profiles/${userId || 'user'}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp
  const cleanUserId = String(userId || 'user').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFolder = String(folder || 'profiles').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const prefix = cleanFolder === 'family' ? 'family' : 'profile';
  const timestamp = Date.now();
  const fileName = `${prefix}_${cleanUserId}_${timestamp}.webp`;
  const filePath = `${cleanFolder}/${cleanUserId}/${fileName}`;

  try {
    // 4. Extract ArrayBuffer from WebP Blob
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
      throw new Error('Could not convert compressed WebP image to ArrayBuffer');
    }

    // 5. Build AWS Signature Version 4 PUT Request
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const contentType = 'image/webp';

    const urlObj = new URL(endpoint);
    const host = urlObj.host;

    // Direct PUT upload to ${VITE_R2_ENDPOINT}/${VITE_R2_BUCKET_NAME}/${filePath}
    const uploadUrl = `${endpoint}/${bucketName}/${filePath}`;
    const canonicalUri = `/${encodeURIComponent(bucketName)}/${filePath.split('/').map(encodeURIComponent).join('/')}`;
    const canonicalQuery = '';

    const payloadHash = await sha256Hex(bodyBuffer);

    // Canonical headers must be sorted by lowercase header name
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

    // 6. Perform browser fetch PUT to Cloudflare R2
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

    // 7. Return the permanent public URL: ${VITE_R2_PUBLIC_URL}/${filePath}
    const publicUrlBase = basePublicUrl || `${endpoint}/${bucketName}`;
    const rawPublicUrl = `${publicUrlBase}/${filePath}`;
    const publicUrl = addCacheBuster(rawPublicUrl, timestamp);

    console.info(`[r2Upload] Uploaded to Cloudflare R2: ${publicUrl} (${compressed.sizeKB} KB)`);

    return {
      success: true,
      publicUrl,
      rawPublicUrl,
      filePath,
      sizeKB: compressed.sizeKB,
      isFallback: false
    };
  } catch (err) {
    console.warn('[r2Upload] Cloudflare R2 upload notice, executing fallback:', err.message);
    return await fallbackUpload(compressed, userId, folder);
  }
}

/**
 * Batch upload utility for multiple photos (e.g. Gallery / Family album)
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
