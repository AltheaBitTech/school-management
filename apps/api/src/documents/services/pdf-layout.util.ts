import PDFDocument from 'pdfkit';
import type { CommonDocumentData } from './pdf-generator.types';

const MARGIN = 60;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const GREY = '#666666';
const RULE_COLOR = '#CCCCCC';

export const PDF_MARGIN = MARGIN;

type PdfDocument = InstanceType<typeof PDFDocument>;

export function createA4Document(): PdfDocument {
  return new PDFDocument({ size: 'A4', margin: MARGIN });
}

export function bufferFromDocument(doc: PdfDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export function drawStandardHeader(doc: PdfDocument, data: CommonDocumentData): number {
  const orgInitial = data.organization.name.trim().charAt(0).toUpperCase() || 'S';
  const headerTop = doc.y;

  if (data.logo && data.logo.length > 0) {
    try {
      doc.image(data.logo, MARGIN, headerTop, { fit: [36, 36] });
    } catch {
      doc.circle(MARGIN + 18, headerTop + 18, 18).fill('#E8EEF7');
      doc.fillColor('#1565C0').fontSize(16).font('Helvetica-Bold');
      doc.text(orgInitial, MARGIN + 10, headerTop + 10, { width: 36, align: 'center' });
    }
  } else {
    doc.circle(MARGIN + 18, headerTop + 18, 18).fill('#E8EEF7');
    doc.fillColor('#1565C0').fontSize(16).font('Helvetica-Bold');
    doc.text(orgInitial, MARGIN + 10, headerTop + 10, { width: 36, align: 'center' });
  }

  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(18);
  doc.text(data.organization.name, MARGIN, headerTop, {
    width: CONTENT_WIDTH,
    align: 'center',
  });

  const subtitleParts = [
    data.organization.address,
    data.organization.city,
    data.organization.phone,
    data.organization.email,
  ].filter(Boolean);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'Official Document';
  doc.font('Helvetica').fontSize(10).fillColor(GREY);
  doc.text(subtitle, MARGIN, doc.y + 4, { width: CONTENT_WIDTH, align: 'center' });

  const ruleY = doc.y + 14;
  doc.moveTo(MARGIN, ruleY).lineTo(PAGE_WIDTH - MARGIN, ruleY).strokeColor(RULE_COLOR).stroke();

  doc.fillColor('#000000');
  doc.y = ruleY + 20;
  return doc.y;
}

export function drawStandardFooter(doc: PdfDocument, data: CommonDocumentData): void {
  const footerTop = 760;
  doc.moveTo(MARGIN, footerTop).lineTo(PAGE_WIDTH - MARGIN, footerTop).strokeColor(RULE_COLOR).stroke();

  doc.font('Helvetica').fontSize(8).fillColor(GREY);
  doc.text(`Generated on ${data.generatedDate}`, MARGIN, footerTop + 8, { width: CONTENT_WIDTH / 2, align: 'left' });
  doc.text(`Document ID: ${data.documentId}`, MARGIN, footerTop + 8, {
    width: CONTENT_WIDTH,
    align: 'right',
  });

  doc.fontSize(7).text(
    'This is a computer-generated document and does not require a signature unless specified.',
    MARGIN,
    footerTop + 22,
    { width: CONTENT_WIDTH, align: 'center' },
  );
  doc.fillColor('#000000');
}

export function drawCenteredTitle(doc: PdfDocument, title: string): void {
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
  doc.text(title.toUpperCase(), MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' });
  const underlineY = doc.y + 4;
  doc.moveTo(MARGIN + 80, underlineY).lineTo(PAGE_WIDTH - MARGIN - 80, underlineY).strokeColor('#333333').stroke();
  doc.y = underlineY + 16;
  doc.font('Helvetica').fontSize(11);
}

export function drawSignatureBlock(doc: PdfDocument, organizationName: string): void {
  doc.moveDown(2);
  const blockY = doc.y;
  doc.font('Helvetica').fontSize(11);
  doc.text('Authorized Signatory', MARGIN, blockY, { width: CONTENT_WIDTH, align: 'right' });
  doc.text(organizationName, MARGIN, doc.y + 4, { width: CONTENT_WIDTH, align: 'right' });
}

export function writeParagraph(doc: PdfDocument, text: string): void {
  doc.font('Helvetica').fontSize(11).fillColor('#000000');
  doc.text(text, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'justify', lineGap: 4 });
  doc.moveDown(0.5);
}
