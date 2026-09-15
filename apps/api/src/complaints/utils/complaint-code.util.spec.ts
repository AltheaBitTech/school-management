import {
  formatComplaintCode,
  isValidComplaintCode,
  parseComplaintCodeSequence,
} from './complaint-code.util';

describe('complaint-code.util', () => {
  it('formats complaint codes with a fixed-width numeric suffix', () => {
    expect(formatComplaintCode(1)).toBe('cmp-000001');
    expect(formatComplaintCode(123456)).toBe('cmp-123456');
  });

  it('validates generated complaint codes', () => {
    expect(isValidComplaintCode('cmp-000001')).toBe(true);
    expect(isValidComplaintCode('CMP-000001')).toBe(false);
    expect(isValidComplaintCode('cmp-1')).toBe(false);
  });

  it('parses complaint code sequences', () => {
    expect(parseComplaintCodeSequence('cmp-000042')).toBe(42);
    expect(parseComplaintCodeSequence('invalid')).toBeNull();
  });
});
