import { formatVisitorCode, parseVisitorCodeSequence } from './visitor-code.util';

describe('visitor-code.util', () => {
  it('formats visitor codes with zero padding', () => {
    expect(formatVisitorCode(1)).toBe('VIS-000001');
    expect(formatVisitorCode(42)).toBe('VIS-000042');
  });

  it('parses valid visitor code sequences', () => {
    expect(parseVisitorCodeSequence('VIS-000001')).toBe(1);
    expect(parseVisitorCodeSequence('VIS-000042')).toBe(42);
  });

  it('returns null for invalid visitor codes', () => {
    expect(parseVisitorCodeSequence('cmp-000001')).toBeNull();
    expect(parseVisitorCodeSequence('VIS-abc')).toBeNull();
  });
});
