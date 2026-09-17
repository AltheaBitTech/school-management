import PDFDocument from 'pdfkit';

export interface PdfContent {
  title: string;
  body: string;
}

export async function generatePdfBuffer(content: PdfContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    doc.fontSize(20).text(content.title, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).text(content.body, { align: 'justify' });
    doc.end();
  });
}
