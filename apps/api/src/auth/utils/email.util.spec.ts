import { normalizeEmail } from './email.util';

describe('normalizeEmail', () => {
  it('trims and lowercases email addresses', () => {
    expect(normalizeEmail('  Admin@School.EXAMPLE  ')).toBe('admin@school.example');
  });
});
