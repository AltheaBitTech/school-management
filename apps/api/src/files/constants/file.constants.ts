export const FILE_ERROR_CODES = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_EMPTY: 'FILE_EMPTY',
  FILE_STORAGE_FAILED: 'FILE_STORAGE_FAILED',
  FILE_DELETE_FAILED: 'FILE_DELETE_FAILED',
  FILE_INVALID_NAME: 'FILE_INVALID_NAME',
} as const;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const LOCAL_STORAGE_PROVIDER = 'local';

export const FILE_UPLOAD_FIELD_NAME = 'file';
