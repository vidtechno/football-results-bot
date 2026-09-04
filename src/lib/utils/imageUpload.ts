import sharp from 'sharp';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  type AllowedMimeType,
} from './imageConstants';

export { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_FILE_SIZE, type AllowedMimeType };

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  format?: string;
  width?: number;
  height?: number;
  sanitizedBuffer?: Buffer;
}

/**
 * Validates image magic bytes (file signature) to prevent polyglots, SVGs, or renamed executables.
 */
export function validateImageMagicBytes(buffer: Buffer): { isValid: boolean; detectedFormat?: string } {
  if (!buffer || buffer.length < 12) {
    return { isValid: false };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedFormat: 'jpeg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedFormat: 'png' };
  }

  // 3. WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, detectedFormat: 'webp' };
  }

  // 4. AVIF: ....ftypavif or ....ftypavis
  if (buffer.length >= 16) {
    const ftyp = buffer.toString('ascii', 4, 8);
    const brand = buffer.toString('ascii', 8, 12);
    if (ftyp === 'ftyp' && (brand === 'avif' || brand === 'avis' || brand === 'mif1')) {
      return { isValid: true, detectedFormat: 'avif' };
    }
  }

  return { isValid: false };
}

/**
 * Fully validates, strips metadata, and re-encodes an image buffer into safe WebP raster format.
 */
export async function sanitizeAndProcessImage(
  buffer: Buffer,
  options: {
    type: 'cover' | 'avatar';
    maxWidth?: number;
    maxHeight?: number;
  },
): Promise<ImageValidationResult> {
  // 1. Check size limit
  if (buffer.length > MAX_IMAGE_FILE_SIZE) {
    return {
      isValid: false,
      error: 'Rasm hajmi 5 MB dan oshmasligi kerak (Maksimal hajm: 5 MB)',
    };
  }

  // 2. Check Magic Bytes
  const magicCheck = validateImageMagicBytes(buffer);
  if (!magicCheck.isValid || !magicCheck.detectedFormat) {
    return {
      isValid: false,
      error: 'Faqat JPEG, PNG, WebP yoki AVIF formatidagi haqiqiy rasmlar qabul qilinadi. SVG yoki boshqa fayllar taqiqlangan.',
    };
  }

  try {
    const image = sharp(buffer, {
      failOn: 'error',
      limitInputPixels: 30_000_000, // Prevend decompression bombs (max ~30 MP)
    });

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        error: 'Rasm o‘lchamlarini aniqlab bo‘lmadi yoki fayl shikastlangan',
      };
    }

    // Dimension bounds
    const maxWidth = options.maxWidth || (options.type === 'avatar' ? 800 : 2000);
    const maxHeight = options.maxHeight || (options.type === 'avatar' ? 800 : 3000);

    // Re-encode into optimized WebP:
    // Auto-orient based on EXIF, strip all metadata, resize if exceeds bounds
    let pipeline = image.rotate(); // auto-rotate from EXIF orientation

    if (options.type === 'avatar') {
      // Square crop for avatar
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'cover',
        position: 'center',
      });
    } else {
      // Maintain portrait ratio for book covers
      pipeline = pipeline.resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const sanitizedBuffer = await pipeline
      .webp({
        quality: 85,
        effort: 4,
      })
      .toBuffer();

    return {
      isValid: true,
      format: 'webp',
      width: metadata.width,
      height: metadata.height,
      sanitizedBuffer,
    };
  } catch (err: any) {
    console.error('Image processing error:', err);
    return {
      isValid: false,
      error: 'Rasm faylini qayta ishlashda xatolik yuz berdi. Iltimos, boshqa rasm yuklab ko‘ring.',
    };
  }
}

/**
 * Uploads a validated image directly to the target Supabase Storage bucket.
 * Generates an unguessable UUID filename.
 */
export async function uploadSanitizedImageToStorage(
  buffer: Buffer,
  bucket: 'work-covers' | 'avatars',
  folderPrefix: string = '',
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const randomName = crypto.randomUUID();
    const cleanPrefix = folderPrefix.replace(/^\/+|\/+$/g, '');
    const filePath = cleanPrefix ? `${cleanPrefix}/${randomName}.webp` : `${randomName}.webp`;

    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = adminClient.storage.from(bucket).getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (err: any) {
    console.error('Upload error:', err);
    return { success: false, error: err.message || 'Saqlashda xatolik' };
  }
}
