import { BadRequestException } from '@nestjs/common';
import { basename } from 'path';
import { FILE_ERROR_CODES } from '../constants/file.constants';

function containsControlCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }

  return false;
}

export function sanitizeOriginalName(originalName: string): string {
  const trimmed = originalName.trim();
  if (!trimmed) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_INVALID_NAME,
      message: 'Original filename is required',
    });
  }

  const baseName = basename(trimmed.replace(/\\/g, '/'));
  if (!baseName || baseName === '.' || baseName === '..') {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_INVALID_NAME,
      message: 'Original filename is invalid',
    });
  }

  if (
    baseName.includes('/') ||
    baseName.includes('\\') ||
    baseName.includes('\0') ||
    containsControlCharacters(baseName)
  ) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_INVALID_NAME,
      message: 'Original filename is invalid',
    });
  }

  return baseName.slice(0, 255);
}

export function extractExtension(originalName: string): string | null {
  const dotIndex = originalName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === originalName.length - 1) {
    return null;
  }

  return originalName.slice(dotIndex + 1).toLowerCase().slice(0, 20);
}

export function buildContentDispositionFilename(originalName: string): string {
  const sanitized = sanitizeOriginalName(originalName);
  const encoded = encodeURIComponent(sanitized);
  return `attachment; filename="${sanitized.replace(/"/g, '')}"; filename*=UTF-8''${encoded}`;
}
