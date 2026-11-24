import { BadRequestException } from '@nestjs/common';
import { MAX_FILE_SIZE_BYTES } from '../constants/file.constants';
import { validateUploadBuffer } from './file-validation.util';

describe('file-validation.util', () => {
  it('accepts supported file signatures', () => {
    const pdf = validateUploadBuffer(Buffer.from('%PDF-1.4\n'), 'application/pdf');
    expect(pdf.mimeType).toBe('application/pdf');

    const jpeg = validateUploadBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'image/jpeg');
    expect(jpeg.mimeType).toBe('image/jpeg');

    const png = validateUploadBuffer(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      'image/png',
    );
    expect(png.mimeType).toBe('image/png');
  });

  it('rejects empty uploads', () => {
    expect(() => validateUploadBuffer(Buffer.alloc(0))).toThrow(BadRequestException);
  });

  it('rejects unsupported uploads', () => {
    expect(() => validateUploadBuffer(Buffer.from('plain text'))).toThrow(BadRequestException);
  });

  it('trusts file bytes when the browser label does not match', () => {
    const pdf = validateUploadBuffer(Buffer.from('%PDF-1.4\n'), 'image/png');
    expect(pdf.mimeType).toBe('application/pdf');

    const jpeg = validateUploadBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'image/jpg');
    expect(jpeg.mimeType).toBe('image/jpeg');
  });

  it('rejects oversized uploads', () => {
    const oversized = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1);
    oversized.write('%PDF', 0);

    expect(() => validateUploadBuffer(oversized)).toThrow(/50 MB/);
  });
});
