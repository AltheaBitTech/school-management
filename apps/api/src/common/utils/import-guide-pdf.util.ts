import { bufferFromDocument, createA4Document } from '../../documents/services/pdf-layout.util';

export interface ImportGuideSection {
  heading: string;
  paragraphs: string[];
}

export async function renderImportGuidePdf(input: {
  title: string;
  introduction: string;
  sections: ImportGuideSection[];
}): Promise<Buffer> {
  const doc = createA4Document();
  const finished = bufferFromDocument(doc);

  doc.fillColor('#0f2044').font('Helvetica-Bold').fontSize(18).text(input.title, { align: 'left' });
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(11).fillColor('#333333').text(input.introduction, { align: 'left' });
  doc.moveDown(0.8);

  for (const section of input.sections) {
    if (doc.y > 720) {
      doc.addPage();
    }
    doc.fillColor('#0f2044').font('Helvetica-Bold').fontSize(13).text(section.heading);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10.5).fillColor('#222222');
    for (const paragraph of section.paragraphs) {
      doc.text(paragraph, { align: 'left', lineGap: 2 });
      doc.moveDown(0.35);
    }
    doc.moveDown(0.4);
  }

  doc.end();
  return finished;
}
