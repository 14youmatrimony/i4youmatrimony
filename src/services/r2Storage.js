/**
 * Cloudflare R2 Storage Service (Unified Interface)
 * Re-exports the zero-dependency Cloudflare R2 uploader and deleter from src/utils/r2Upload.js
 */

export {
  getR2Config,
  isR2Configured,
  uploadPhotoToR2,
  deletePhotoFromR2,
  uploadPhotosBatchToR2,
  compressImageToWebP
} from '../utils/r2Upload';
