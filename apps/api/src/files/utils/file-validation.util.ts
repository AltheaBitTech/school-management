import { BadRequestException } from '@nestjs/common';
import {
  AllowedMimeType,
  FILE_ERROR_CODES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
} from '../constants/file.constants';

const PDF_SIGNATURE = Buffer.from('%PDF');
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface ValidatedUpload {
  buffer: Buffer;
  mimeType: AllowedMimeType;
  size: number;
}

export function validateUploadBuffer(
  buffer: Buffer | undefined,
  _declaredMimeType?: string,
): ValidatedUpload {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_EMPTY,
      message: 'Uploaded file is empty',
    });
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_TOO_LARGE,
      message: `This file is larger than the ${MAX_FILE_SIZE_LABEL} limit`,
    });
  }

  const detectedMimeType = detectMimeType(buffer);
  if (!detectedMimeType) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_TYPE_NOT_ALLOWED,
      message: 'Uploaded file type is not allowed',
    });
  }

  // Browsers often label a JPEG as image/png or image/jpg. The stored type follows
  // the file bytes, so a mismatched label does not reject an allowed file.
  return {
    buffer,
    mimeType: detectedMimeType,
    size: buffer.length,
  };
}

function detectMimeType(buffer: Buffer): AllowedMimeType | null {
  if (buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    return 'application/pdf';
  }

  if (buffer.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) {
    return 'image/jpeg';
  }

  if (buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }

  return null;
}

