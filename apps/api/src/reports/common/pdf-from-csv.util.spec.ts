import { existsSync } from 'fs';
import Module from 'module';
import { buildPdfFromCsv } from './pdf-from-csv.util';

describe('buildPdfFromCsv', () => {
  it('resolves pdfkit standard fonts without the package import map', () => {
    const resolveFilename = (
      Module as unknown as {
        _resolveFilename: (request: string, parent: NodeModule, isMain: boolean) => string;
      }
    )._resolveFilename;
    const file = resolveFilename('#standard-fonts/Helvetica', module, false);
    expect(file.endsWith('Helvetica.cjs')).toBe(true);
    expect(existsSync(file)).toBe(true);
  });

  it('writes a PDF using the standard Helvetica font', async () => {
    const pdf = await buildPdfFromCsv('Attendance', 'Name,Status\nAda,Present\n');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(500);
  });
});