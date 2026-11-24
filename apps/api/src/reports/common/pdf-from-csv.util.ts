import { InternalServerErrorException, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

const logger = new Logger('PdfFromCsv');

function pdfFailure(error: unknown): InternalServerErrorException {
  logger.error('PDF generation failed', error instanceof Error ? error.stack : undefined);
  return new InternalServerErrorException({
    code: 'PDF_GENERATION_FAILED',
    message: 'The PDF could not be generated',
  });
}

export function buildPdfFromCsv(title: string, csv: string): Promise<Buffer> {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  const rows = lines.map(parseCsvLine);

  return new Promise((resolve, reject) => {
    let doc: PDFKit.PDFDocument;
    try {
      doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    } catch (error: unknown) {
      reject(pdfFailure(error));
      return;
    }
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (error: unknown) => reject(pdfFailure(error)));

    doc.font('Helvetica-Bold').fontSize(14).text(title);
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(8);

    const headers = rows[0] ?? [];
    const body = rows.slice(1);
    const columnWidth = Math.max(70, Math.floor(720 / Math.max(headers.length, 1)));

    doc.font('Helvetica-Bold');
    writeRow(doc, headers, columnWidth);
    doc.moveDown(0.3);
    doc.font('Helvetica');
    for (const row of body) {
      if (doc.y > 520) {
        doc.addPage();
      }
      writeRow(doc, row, columnWidth);
    }

    doc.end();
  });
}

function writeRow(doc: PDFKit.PDFDocument, cells: string[], columnWidth: number): void {
  const startY = doc.y;
  let maxHeight = 12;
  cells.forEach((cell, index) => {
    const height = doc.heightOfString(cell || '—', { width: columnWidth - 6 });
    maxHeight = Math.max(maxHeight, height);
    doc.text(cell || '—', 36 + index * columnWidth, startY, { width: columnWidth - 6 });
  });
  doc.y = startY + maxHeight + 4;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}
