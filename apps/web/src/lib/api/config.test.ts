import { describe, expect, it } from 'vitest';
import { getApiBaseUrl } from './config';

describe('getApiBaseUrl', () => {
  it('returns the configured API base URL without a trailing slash', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/';

    expect(getApiBaseUrl()).toBe('http://localhost:3001');
  });
});
