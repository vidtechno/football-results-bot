/**
 * Shared client and server image upload constants.
 */

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export type AllowedMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
