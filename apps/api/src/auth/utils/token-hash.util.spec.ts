import { generateRefreshToken, hashRefreshToken } from '../utils/token-hash.util';

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
});
