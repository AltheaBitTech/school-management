import { formatAssetCode, parseAssetCodeSequence } from './asset-code.util';

describe('asset-code.util', () => {
  it('formats asset codes with zero padding', () => {
    expect(formatAssetCode(1)).toBe('AST-000001');
    expect(formatAssetCode(42)).toBe('AST-000042');
  });

  it('parses valid asset code sequences', () => {
    expect(parseAssetCodeSequence('AST-000001')).toBe(1);
    expect(parseAssetCodeSequence('AST-000042')).toBe(42);
  });

  it('returns null for invalid asset codes', () => {
    expect(parseAssetCodeSequence('VIS-000001')).toBeNull();
    expect(parseAssetCodeSequence('AST-abc')).toBeNull();
  });
});
