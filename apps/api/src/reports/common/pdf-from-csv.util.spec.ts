import Module from 'module';
import { buildPdfFromCsv } from './pdf-from-csv.util';

const nodeRequire = Module.createRequire(__filename);

describe('buildPdfFromCsv', () => {
  it('serves pdfkit standard fonts without the package import map', () => {
    const fonts = nodeRequire('../../common/pdf/pdfkit-font-data.cjs') as Record<string, { name: string }>;
    const loaded = nodeRequire('#standard-fonts/Helvetica') as { name: string };
    const bold = nodeRequire('#standard-fonts/HelveticaBold') as { name: string };
    expect(loaded).toBe(fonts['#standard-fonts/Helvetica']);
    expect(loaded.name).toBe('Helvetica');
    expect(bold.name).toBe('Helvetica-Bold');
  });

  it('writes a PDF using the standard Helvetica font', async () => {
    const pdf = await buildPdfFromCsv('Attendance', 'Name,Status\nAda,Present\n');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(500);
  });
});