/**
 * Supabase Storage Service
 * Handles uploading profile pictures, Aadhaar scans, and gallery images to Supabase Storage
 * and retrieving permanent public HTTPS URLs.
 */

import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Helper to convert base64 Data URL to Blob for reliable storage uploads
 */
export function dataURLtoBlob(dataurl) {
  if (!dataurl || typeof dataurl !== 'string') return null;
  if (!dataurl.startsWith('data:')) {
    return null;
  }
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.warn('[storageService] Failed to convert dataURL to Blob:', e);
    return null;
  }
}

/**
 * Uploads an avatar image (File, Blob, or Data URL) to Supabase Storage 'avatars' bucket
 * and returns the generated permanent public URL.
 *
 * @param {File|Blob|string} fileOrDataUrl - The image file, blob, or base64 data URL
 * @param {string} userId - Unique user or profile ID
 * @param {string} bucketName - Target bucket (default: 'avatars')
 * @returns {Promise<{success: boolean, publicUrl?: string, error?: string}>}
 */
export async function uploadProfilePhoto(fileOrDataUrl, userId, bucketName = 'avatars') {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  if (!fileOrDataUrl) {
    return { success: false, error: 'No image provided' };
  }

  // If it's already a live public URL (e.g. Unsplash or already hosted on Supabase), return as is
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
    return { success: true, publicUrl: fileOrDataUrl };
  }

  try {
    let uploadBody = fileOrDataUrl;
    let contentType = 'image/jpeg';

    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
      uploadBody = dataURLtoBlob(fileOrDataUrl);
      contentType = uploadBody?.type || 'image/jpeg';
    } else if (fileOrDataUrl instanceof File) {
      contentType = fileOrDataUrl.type || 'image/jpeg';
    }

    if (!uploadBody) {
      return { success: false, error: 'Invalid image format' };
    }

    const cleanUserId = (userId || `user_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileExt = contentType.includes('png') ? 'png' : (contentType.includes('webp') ? 'webp' : 'jpg');
    const fileName = `${cleanUserId}_${Date.now()}.${fileExt}`;
    const filePath = `${cleanUserId}/${fileName}`;

    // 1. Upload to Supabase Storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uploadBody, {
        cacheControl: '3600',
        upsert: true,
        contentType
      });

    if (uploadError) {
      console.warn(`[storageService] Upload to '${bucketName}' failed:`, uploadError.message);
      return { success: false, error: uploadError.message };
    }

    // 2. Retrieve public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      return { success: false, error: 'Could not generate public URL' };
    }

    // 3. Automatically persist to 'profiles' table if userId provided
    if (userId) {
      try {
        await supabase
          .from('profiles')
          .update({
            photo: publicUrl,
            photo_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      } catch (dbErr) {
        console.warn('[storageService] Failed to update profiles table with photo_url:', dbErr);
      }
    }

    return { success: true, publicUrl, filePath };
  } catch (err) {
    console.error('[storageService] Unexpected exception during upload:', err);
    return { success: false, error: err.message };
  }
}
