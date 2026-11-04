import { describe, expect, it } from 'vitest';
import { buildImportErrorReportCsv } from '@/lib/imports/csv-transfer';

describe('buildImportErrorReportCsv', () => {
  it('lists failed rows without emails or invite links', () => {
    const csv = buildImportErrorReportCsv([
      {
        row: 2,
        status: 'error',
        category: 'duplicate',
        column: 'email',
        reason: 'This email is already registered and will not create another account',
        email: 'secret.parent@school.edu',
        inviteUrl: 'http://localhost/reset-password?token=secret-token',
      },
      {
        row: 3,
        status: 'imported',
        email: 'created@school.edu',
        inviteUrl: 'http://localhost/reset-password?token=created-token',
      },
    ]);

    expect(csv).toContain('duplicate');
    expect(csv).toContain('email');
    expect(csv).not.toContain('secret.parent@school.edu');
    expect(csv).not.toContain('secret-token');
    expect(csv).not.toContain('created-token');
  });
});
