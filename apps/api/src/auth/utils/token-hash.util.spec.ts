import { generateRefreshToken, hashRefreshToken, normalizeResetToken } from '../utils/token-hash.util';

describe('token hash utilities', () => {
  it('generates unique refresh tokens', () => {
    const firstToken = generateRefreshToken();
    const secondToken = generateRefreshToken();

    expect(firstToken).not.toBe(secondToken);
    expect(firstToken.length).toBeGreaterThan(20);
  });

  it('hashes refresh tokens deterministically', () => {
    const token = generateRefreshToken();
    const firstHash = hashRefreshToken(token);
    const secondHash = hashRefreshToken(token);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).not.toBe(token);
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('drops text that a log line glues onto a reset token', () => {
    expect(normalizeResetToken('abcDEF123_-token\\n\\nThis link expires')).toBe('abcDEF123_-token');
    expect(normalizeResetToken('')).toBe('');
  });
});
