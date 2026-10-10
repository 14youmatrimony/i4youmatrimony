/**
 * Smart Client-Side Image Optimizer & HD Compressor for I 4 You Matrimony
 * 
 * Automatically scales and compresses photographs of ANY file size (even 10MB - 30MB+ DSLR / 108MP phone shots)
 * into lightweight, crystal-clear portraits in the 60 KB - 180 KB range while preserving facial sharpness,
 * skin tone clarity, and high-definition details.
 */

/**
 * Format bytes or KB into human-readable string (e.g., '12.4 MB' or '145 KB')
 */
export function formatFileSize(kbOrBytes, isBytes = false) {
  const kb = isBytes ? kbOrBytes / 1024 : kbOrBytes;
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(kb)} KB`;
}

/**
 * Optimizes an uploaded File object (from file input or drag-and-drop)
 * 
 * @param {File} file - The raw file selected by user (can be 5MB - 30MB+)
 * @param {Object} options - Custom configuration options
 * @param {number} options.maxDimension - Max width or height (default 1200px for HD portraits)
 * @param {number} options.targetMaxKB - Target maximum file size in KB (default 200 KB)
 * @param {number} options.initialQuality - Initial JPEG quality (default 0.85 for pristine detail)
 * @param {number} options.minQuality - Lowest quality floor (default 0.62)
 * @returns {Promise<{
 *   dataUrl: string,
 *   originalSizeKB: number,
 *   compressedSizeKB: number,
 *   originalFormatted: string,
 *   compressedFormatted: string,
 *   savedPercent: number,
 *   width: number,
 *   height: number
 * }>}
 */
export async function optimizeImageFile(file, options = {}) {
  const {
    maxDimension = 1200,
    targetMaxKB = 200,
    initialQuality = 0.85,
    minQuality = 0.62
  } = options;

  if (!file) throw new Error('No file provided for optimization');

  const originalSizeKB = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const rawDataUrl = event.target?.result;
      if (!rawDataUrl) {
        return reject(new Error('Failed to read image file data'));
      }

      const img = new Image();

      img.onload = () => {
        try {
          let origWidth = img.naturalWidth || img.width;
          let origHeight = img.naturalHeight || img.height;

          // 1. Calculate smart proportional scaling
          let targetWidth = origWidth;
          let targetHeight = origHeight;

          if (targetWidth > maxDimension || targetHeight > maxDimension) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
              targetWidth = maxDimension;
            } else {
              targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
              targetHeight = maxDimension;
            }
          }

          // 2. Setup Canvas with bicubic / high-quality smoothing
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // Fallback if canvas context fails
            return resolve({
              dataUrl: rawDataUrl,
              originalSizeKB,
              compressedSizeKB: originalSizeKB,
              originalFormatted: formatFileSize(originalSizeKB),
              compressedFormatted: formatFileSize(originalSizeKB),
              savedPercent: 0,
              width: origWidth,
              height: origHeight
            });
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Solid background prevents black silhouettes when converting transparent PNGs to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // 3. Smart quality and iterative size targeting
          let currentQuality = initialQuality;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
          let currentSizeKB = Math.round((compressedDataUrl.length * 0.75) / 1024);

          // Step down quality gracefully if still over targetMaxKB
          while (currentSizeKB > targetMaxKB && currentQuality > minQuality) {
            currentQuality = Math.max(minQuality, currentQuality - 0.06);
            compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            currentSizeKB = Math.round((compressedDataUrl.length * 0.75) / 1024);
          }

          // If still over targetMaxKB (for very high frequency / noisy images), downscale canvas dimensions
          if (currentSizeKB > targetMaxKB && (targetWidth > 800 || targetHeight > 800)) {
            const downscaleFactor = 0.82;
            const smallerWidth = Math.round(targetWidth * downscaleFactor);
            const smallerHeight = Math.round(targetHeight * downscaleFactor);

            const secondCanvas = document.createElement('canvas');
            secondCanvas.width = smallerWidth;
            secondCanvas.height = smallerHeight;
            const secondCtx = secondCanvas.getContext('2d');

            if (secondCtx) {
              secondCtx.imageSmoothingEnabled = true;
              secondCtx.imageSmoothingQuality = 'high';
              secondCtx.fillStyle = '#FFFFFF';
              secondCtx.fillRect(0, 0, smallerWidth, smallerHeight);
              secondCtx.drawImage(canvas, 0, 0, smallerWidth, smallerHeight);

              compressedDataUrl = secondCanvas.toDataURL('image/jpeg', Math.max(minQuality, currentQuality));
              currentSizeKB = Math.round((compressedDataUrl.length * 0.75) / 1024);
              targetWidth = smallerWidth;
              targetHeight = smallerHeight;
            }
          }

          const savedPercent = originalSizeKB > currentSizeKB 
            ? Math.round(((originalSizeKB - currentSizeKB) / originalSizeKB) * 100) 
            : 0;

          resolve({
            dataUrl: compressedDataUrl,
            originalSizeKB,
            compressedSizeKB: currentSizeKB,
            originalFormatted: formatFileSize(originalSizeKB),
            compressedFormatted: formatFileSize(currentSizeKB),
            savedPercent,
            width: targetWidth,
            height: targetHeight
          });
        } catch (err) {
          console.error('[optimizeImageFile] Processing error, falling back:', err);
          resolve({
            dataUrl: rawDataUrl,
            originalSizeKB,
            compressedSizeKB: originalSizeKB,
            originalFormatted: formatFileSize(originalSizeKB),
            compressedFormatted: formatFileSize(originalSizeKB),
            savedPercent: 0,
            width: img.width || 800,
            height: img.height || 800
          });
        }
      };

      img.onerror = (imgErr) => {
        console.warn('[optimizeImageFile] Image decode warning, using raw data:', imgErr);
        resolve({
          dataUrl: rawDataUrl,
          originalSizeKB,
          compressedSizeKB: originalSizeKB,
          originalFormatted: formatFileSize(originalSizeKB),
          compressedFormatted: formatFileSize(originalSizeKB),
          savedPercent: 0,
          width: 800,
          height: 800
        });
      };

      img.src = rawDataUrl;
    };

    reader.onerror = (readErr) => {
      reject(readErr);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes an existing base64 data URL string directly
 */
export async function optimizeBase64String(dataUrl, options = {}) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  // If already under 160KB, return as-is
  const currentSizeKB = Math.round((dataUrl.length * 0.75) / 1024);
  const targetMaxKB = options.targetMaxKB || 180;
  if (currentSizeKB <= targetMaxKB) {
    return dataUrl;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDimension = options.maxDimension || 1200;
          let targetWidth = img.naturalWidth || img.width;
          let targetHeight = img.naturalHeight || img.height;

          if (targetWidth > maxDimension || targetHeight > maxDimension) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
              targetWidth = maxDimension;
            } else {
              targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
              targetHeight = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          let quality = options.initialQuality || 0.84;
          let result = canvas.toDataURL('image/jpeg', quality);
          let sizeKB = Math.round((result.length * 0.75) / 1024);

          while (sizeKB > targetMaxKB && quality > 0.60) {
            quality -= 0.06;
            result = canvas.toDataURL('image/jpeg', quality);
            sizeKB = Math.round((result.length * 0.75) / 1024);
          }

          resolve(result);
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (e) {
      resolve(dataUrl);
    }
  });
}
