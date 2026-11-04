import { suggestNextPrefixedCode } from './sequential-code.util';

describe('suggestNextPrefixedCode', () => {
  it('returns first code when none exist', () => {
    expect(suggestNextPrefixedCode([], { prefix: 'emp-' })).toBe('emp-001');
  });

  it('increments the highest matching sequence', () => {
    expect(
      suggestNextPrefixedCode(['emp-001', 'emp-010', 'other-002'], { prefix: 'emp-' }),
    ).toBe('emp-011');
  });

  it('ignores codes that do not match the prefix pattern', () => {
    expect(suggestNextPrefixedCode(['custom-code'], { prefix: 'adm-' })).toBe('adm-001');
  });
});
