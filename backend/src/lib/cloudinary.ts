import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

function ensureConfigured() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(503, 'Secure file storage is not configured', 'STORAGE_NOT_CONFIGURED');
  }
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
}

export async function uploadPrivateFile(buffer: Buffer, folder: string, resourceType: 'raw' | 'image') {
  ensureConfigured();
  return new Promise<{ publicId: string; secureUrl: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType, type: 'authenticated' }, (error, result) => {
      if (error || !result) return reject(new AppError(502, 'Secure file upload failed', 'STORAGE_UPLOAD_FAILED'));
      resolve({ publicId: result.public_id, secureUrl: result.secure_url });
    });
    stream.end(buffer);
  });
}
