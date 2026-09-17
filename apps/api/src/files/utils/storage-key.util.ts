import { BadRequestException } from '@nestjs/common';
import { FILE_ERROR_CODES } from '../constants/file.constants';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildStorageKey(organizationId: string, fileId: string): string {
  assertOrganizationId(organizationId);
  assertFileId(fileId);
  return `${organizationId}/${fileId}`;
}

export function assertSafeStorageKey(storageKey: string, organizationId?: string): void {
  if (!storageKey || storageKey.includes('\\') || storageKey.includes('\0')) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
      message: 'Invalid storage key',
    });
  }

  if (storageKey.startsWith('/') || /^[A-Za-z]:/.test(storageKey)) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
      message: 'Invalid storage key',
    });
  }

  const segments = storageKey.split('/');
  if (segments.length !== 2) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
      message: 'Invalid storage key',
    });
  }

  const [orgSegment, fileSegment] = segments;

  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
      message: 'Invalid storage key',
    });
  }

  assertOrganizationId(orgSegment);
  assertFileId(fileSegment);

  if (organizationId && orgSegment !== organizationId) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
      message: 'Invalid storage key',
    });
  }
}

function assertOrganizationId(value: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
      message: 'Invalid storage key',
    });
  }
}

function assertFileId(value: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new BadRequestException({
      code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
      message: 'Invalid storage key',
    });
  }
}
