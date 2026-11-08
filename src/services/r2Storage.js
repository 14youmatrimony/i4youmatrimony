/**
 * Cloudflare R2 Storage Service (Unified Interface)
 * Re-exports the zero-dependency Cloudflare R2 uploader and deleter from src/utils/r2Upload.js
 */

export {
  getR2Config,
  isR2Configured,
  uploadPhotoToR2,
  uploadStoryToR2,
  deletePhotoFromR2,
  uploadPhotosBatchToR2,
  compressImageToWebP,
  PUBLIC_R2_DOMAIN,
  formatR2PublicUrl
} from '../utils/r2Upload';
