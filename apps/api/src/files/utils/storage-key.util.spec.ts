import { BadRequestException } from '@nestjs/common';
import { buildStorageKey, assertSafeStorageKey } from './storage-key.util';

describe('storage-key.util', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  const fileId = '22222222-2222-4222-8222-222222222222';

  it('builds tenant-scoped opaque storage keys', () => {
    expect(buildStorageKey(organizationId, fileId)).toBe(`${organizationId}/${fileId}`);
  });

  it('rejects path traversal segments', () => {
    expect(() => assertSafeStorageKey('../etc/passwd')).toThrow(BadRequestException);
    expect(() => assertSafeStorageKey(`${organizationId}/../secret`)).toThrow(BadRequestException);
    expect(() => assertSafeStorageKey(`${organizationId}/..`)).toThrow(BadRequestException);
  });

  it('rejects absolute and drive paths', () => {
    expect(() => assertSafeStorageKey('/etc/passwd')).toThrow(BadRequestException);
    expect(() => assertSafeStorageKey('C:/Windows/system.ini')).toThrow(BadRequestException);
  });

  it('rejects keys that do not belong to the tenant', () => {
    expect(() =>
      assertSafeStorageKey(`${organizationId}/${fileId}`, '33333333-3333-4333-8333-333333333333'),
    ).toThrow(BadRequestException);
  });
});
