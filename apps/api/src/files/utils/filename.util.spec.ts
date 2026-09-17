import { BadRequestException } from '@nestjs/common';
import { buildContentDispositionFilename, sanitizeOriginalName } from './filename.util';

describe('filename.util', () => {
  it('preserves normal filenames', () => {
    expect(sanitizeOriginalName('leave-form.pdf')).toBe('leave-form.pdf');
    expect(buildContentDispositionFilename('leave-form.pdf')).toBe(
      'attachment; filename="leave-form.pdf"; filename*=UTF-8\'\'leave-form.pdf',
    );
  });

  it('preserves normal Unicode filenames', () => {
    const unicodeName = 'Naïve résumé 文件.pdf';

    expect(sanitizeOriginalName(unicodeName)).toBe(unicodeName);
    expect(buildContentDispositionFilename(unicodeName)).toContain('filename="Naïve résumé 文件.pdf"');
    expect(buildContentDispositionFilename(unicodeName)).toContain(
      `filename*=UTF-8''${encodeURIComponent(unicodeName)}`,
    );
  });

  it('rejects carriage return characters in filenames', () => {
    expect(() => sanitizeOriginalName('report\r.pdf')).toThrow(BadRequestException);
    expect(() => buildContentDispositionFilename('report\r.pdf')).toThrow(BadRequestException);
  });

  it('rejects line feed characters in filenames', () => {
    expect(() => sanitizeOriginalName('report\n.pdf')).toThrow(BadRequestException);
    expect(() => buildContentDispositionFilename('report\n.pdf')).toThrow(BadRequestException);
  });

  it('rejects CRLF injection attempts in filenames', () => {
    const injected = 'report.pdf\r\nContent-Disposition: inline';

    expect(() => sanitizeOriginalName(injected)).toThrow(BadRequestException);
    expect(() => buildContentDispositionFilename(injected)).toThrow(BadRequestException);
  });
});
