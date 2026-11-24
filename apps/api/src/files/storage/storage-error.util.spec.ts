import { describeStorageFailure } from './storage-error.util';

describe('describeStorageFailure', () => {
  it('names a missing bucket', () => {
    const message = describeStorageFailure(
      404,
      JSON.stringify({ error: 'Bucket not found', message: 'Bucket not found' }),
    );
    expect(message).toContain('campusops-files');
    expect(message).toContain('SUPABASE_STORAGE_BUCKET');
  });

  it('names a rejected service key', () => {
    const message = describeStorageFailure(401, '{"message":"Invalid JWT"}');
    expect(message).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('names the 50 MB limit', () => {
    const message = describeStorageFailure(
      413,
      '{"message":"The object exceeded the maximum allowed size"}',
    );
    expect(message).toContain('50 MB');
  });

  it('keeps a short provider sentence and drops tokens', () => {
    expect(describeStorageFailure(400, '{"message":"Invalid key"}')).toBe(
      'The file could not be stored. Storage said: Invalid key',
    );
    expect(describeStorageFailure(500, 'eyJhbGciOiJIUzI1NiJ9.secret')).toContain('HTTP 500');
    expect(describeStorageFailure(500, '')).toContain('HTTP 500');
  });
});