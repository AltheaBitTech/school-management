import {
  bufferFromDocument,
  createA4Document,
  drawCenteredTitle,
  drawSignatureBlock,
  drawStandardFooter,
  drawStandardHeader,
  PDF_MARGIN,
  writeParagraph,
} from './pdf-layout.util';
import type {
  BonafideData,
  CharacterData,
  ExperienceData,
  IdCardData,
  SalaryData,
  VisitorPassData,
} from './pdf-generator.types';

/** @deprecated Legacy plain-text PDF helper for tests only. */
export interface PdfContent {
  title: string;
  body: string;
}

/** @deprecated Use template-specific generators instead. */
export async function generatePdfBuffer(content: PdfContent): Promise<Buffer> {
  const doc = createA4Document();
  const finished = bufferFromDocument(doc);
  doc.fontSize(20).text(content.title, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).text(content.body, { align: 'justify' });
  doc.end();
  return finished;
}

export async function generateBonafidePdf(data: BonafideData): Promise<Buffer> {
  const doc = createA4Document();
  const finished = bufferFromDocument(doc);

  drawStandardHeader(doc, data);
  drawCenteredTitle(doc, data.heading?.trim() || 'Bonafide Certificate');

  if (data.body?.trim()) {
    writeParagraph(doc, data.body.trim());
    drawSignatureBlock(doc, data.organization.name);
    drawStandardFooter(doc, data);
    doc.end();
    return finished;
  }

  writeParagraph(doc, 'To Whom It May Concern,');
  writeParagraph(
    doc,
    `This is to certify that ${data.student.name}, bearing Admission No. ${data.student.admissionNumber}, is a bonafide student of ${data.organization.name}.`,
  );

  if (data.student.class) {
    const sectionPart = data.student.section ? ` ${data.student.section}` : '';
    const yearPart = data.student.academicYear ? `, Academic Year ${data.student.academicYear}` : '';
    writeParagraph(
      doc,
      `The student is currently studying in Class ${data.student.class}${sectionPart}${yearPart}.`,
    );
  }

  const purpose = data.purpose?.trim() || 'official purposes';
  writeParagraph(
    doc,
    `This certificate is issued on ${data.generatedDate} for the purpose of ${purpose}.`,
  );

  drawSignatureBlock(doc, data.organization.name);
  drawStandardFooter(doc, data);
  doc.end();
  return finished;
}

export async function generateCharacterCertificatePdf(data: CharacterData): Promise<Buffer> {
  const doc = createA4Document();
  const finished = bufferFromDocument(doc);

  drawStandardHeader(doc, data);
  drawCenteredTitle(doc, data.heading?.trim() || 'Character Certificate');
  if (data.body?.trim()) {
    writeParagraph(doc, data.body.trim());
    drawSignatureBlock(doc, data.organization.name);
    drawStandardFooter(doc, data);
    doc.end();
    return finished;
  }

  writeParagraph(doc, 'To Whom It May Concern,');
  const classPart = data.student.class ? ` of Class ${data.student.class}` : '';
  const attendancePart = data.student.attendancePercentage
    ? ` The student maintained ${data.student.attendancePercentage} attendance during the academic period.`
    : '';

  writeParagraph(
    doc,
    `This is to certify that ${data.student.name}, Admission No. ${data.student.admissionNumber}${classPart}, has been a student of ${data.organization.name} and has demonstrated ${data.student.conduct} character and conduct.${attendancePart}`,
  );

  const purpose = data.purpose?.trim() || 'official purposes';
  writeParagraph(
    doc,
    `This certificate is issued on ${data.generatedDate} for ${purpose}. We wish the student success in future endeavors.`,
  );

  drawSignatureBlock(doc, data.organization.name);
  drawStandardFooter(doc, data);
  doc.end();
  return finished;
}

export async function generateExperienceLetterPdf(data: ExperienceData): Promise<Buffer> {
  const doc = createA4Document();
  const finished = bufferFromDocument(doc);

  drawStandardHeader(doc, data);
  drawCenteredTitle(doc, data.heading?.trim() || 'Experience Letter');
  if (data.body?.trim()) {
    writeParagraph(doc, data.body.trim());
    drawSignatureBlock(doc, data.organization.name);
    drawStandardFooter(doc, data);
    doc.end();
    return finished;
  }

  writeParagraph(doc, 'To Whom It May Concern,');
  const periodEnd = data.staff.leavingDate ?? 'present';
  writeParagraph(
    doc,
    `This is to certify that ${data.staff.name} (Employee Code: ${data.staff.employeeCode}) was employed with ${data.organization.name} as ${data.staff.designation} in the ${data.staff.department} department from ${data.staff.joiningDate} to ${periodEnd}.`,
  );

  if (data.relievingReason?.trim()) {
    writeParagraph(doc, `Reason for separation: ${data.relievingReason.trim()}.`);
  }

  writeParagraph(
    doc,
    `During this tenure, ${data.staff.name} performed assigned duties with diligence and maintained professional conduct. We appreciate the contributions made to our institution.`,
  );
  writeParagraph(
    doc,
    `This letter is issued on ${data.generatedDate} at the request of the employee for official purposes.`,
  );

  drawSignatureBlock(doc, data.organization.name);
  drawStandardFooter(doc, data);
  doc.end();
  return finished;
}

export async function generateSalaryCertificatePdf(data: SalaryData): Promise<Buffer> {
  const doc = createA4Document();
  const finished = bufferFromDocument(doc);

  drawStandardHeader(doc, data);
  drawCenteredTitle(doc, data.heading?.trim() || 'Salary Certificate');
  if (data.body?.trim()) {
    writeParagraph(doc, data.body.trim());
    drawSignatureBlock(doc, data.organization.name);
    drawStandardFooter(doc, data);
    doc.end();
    return finished;
  }

  writeParagraph(doc, 'To Whom It May Concern,');
  const purpose = data.purpose?.trim() || 'official purposes';
  writeParagraph(
    doc,
    `This is to certify that ${data.staff.name} (Employee Code: ${data.staff.employeeCode}) is employed with ${data.organization.name} as ${data.staff.designation} in the ${data.staff.department} department.`,
  );
  writeParagraph(
    doc,
    `For the month of ${data.staff.salaryMonth}, the employee draws a gross monthly salary of ${data.staff.monthlySalary} (${formatSalaryInWords(data.staff.monthlySalary)}).`,
  );
  writeParagraph(
    doc,
    `This certificate is issued on ${data.generatedDate} for ${purpose}.`,
  );

  drawSignatureBlock(doc, data.organization.name);
  drawStandardFooter(doc, data);
  doc.end();
  return finished;
}

export async function generateVisitorPassPdf(data: VisitorPassData): Promise<Buffer> {
  const doc = createA4Document();
  const finished = bufferFromDocument(doc);

  const pageWidth = 595.28;
  const cardTop = PDF_MARGIN + 40;
  const innerWidth = pageWidth - PDF_MARGIN * 2;

  doc.rect(PDF_MARGIN, cardTop, innerWidth, 420).strokeColor('#1565C0').lineWidth(2).stroke();

  doc.font('Helvetica-Bold').fontSize(22).fillColor('#1565C0');
  doc.text('VISITOR PASS', PDF_MARGIN, cardTop + 24, { width: innerWidth, align: 'center' });

  doc.fillColor('#000000').fontSize(20).font('Helvetica-Bold');
  doc.text(data.visitor.name, PDF_MARGIN + 24, cardTop + 70, {
    width: innerWidth - 48,
    align: 'center',
  });

  doc.font('Helvetica').fontSize(11);
  const colWidth = (innerWidth - 48) / 2;
  const leftX = PDF_MARGIN + 24;
  const rightX = leftX + colWidth + 8;
  let rowY = cardTop + 120;

  const row = (label: string, value: string, x: number, y: number) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#666666').text(label, x, y, { width: colWidth });
    doc.font('Helvetica').fontSize(11).fillColor('#000000').text(value, x, y + 14, { width: colWidth });
  };

  row('Host', data.visitor.host, leftX, rowY);
  row('Purpose', data.visitor.purpose, rightX, rowY);
  rowY += 52;
  row('Check-in', data.visitor.checkInTime, leftX, rowY);
  row('Mobile', data.visitor.mobile, rightX, rowY);
  rowY += 52;

  if (data.visitor.organization) {
    row('Organization', data.visitor.organization, leftX, rowY);
    rowY += 52;
  }

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#C62828');
  doc.text(`Valid until: ${data.visitor.validUntil}`, leftX, rowY, { width: innerWidth - 48 });

  doc.font('Helvetica').fontSize(10).fillColor('#333333');
  doc.text(`Visitor ID: ${data.visitor.visitorId}`, leftX, rowY + 24, { width: innerWidth - 48 });
  doc.text('Present this pass at reception on exit.', leftX, rowY + 44, {
    width: innerWidth - 48,
    align: 'center',
  });

  doc.y = cardTop + 440;
  drawStandardFooter(doc, data);
  doc.end();
  return finished;
}

function formatSalaryInWords(amountLabel: string): string {
  const numeric = Number.parseFloat(amountLabel.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(numeric)) {
    return 'amount as stated above';
  }
  return `${numberToWordsIndian(Math.round(numeric))} Rupees Only`;
}

function numberToWordsIndian(value: number): string {
  if (value === 0) {
    return 'Zero';
  }

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const chunkToWords = (num: number): string => {
    let n = num;
    const parts: string[] = [];
    if (n >= 100) {
      parts.push(`${ones[Math.floor(n / 100)]} Hundred`);
      n %= 100;
    }
    if (n >= 20) {
      parts.push(tens[Math.floor(n / 10)]);
      n %= 10;
    }
    if (n > 0) {
      parts.push(ones[n]);
    }
    return parts.filter(Boolean).join(' ');
  };

  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const remainder = value % 1000;
  const segments: string[] = [];

  if (crore) segments.push(`${chunkToWords(crore)} Crore`);
  if (lakh) segments.push(`${chunkToWords(lakh)} Lakh`);
  if (thousand) segments.push(`${chunkToWords(thousand)} Thousand`);
  if (remainder) segments.push(chunkToWords(remainder));

  return segments.join(' ');
}

export async function generateIdCardPdf(data: IdCardData): Promise<Buffer> {
  const doc = new (await import('pdfkit')).default({
    size: [242.6, 153],
    margin: 12,
  });
  const finished = bufferFromDocument(doc);
  const title = data.kind === 'student' ? 'STUDENT ID' : 'STAFF ID';

  if (data.logo && data.logo.length > 0) {
    try {
      doc.image(data.logo, 12, 10, { fit: [22, 22] });
    } catch {
      // Logo is optional on the card.
    }
  }

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f2044');
  doc.text(data.organization.name, 40, 12, { width: 190, align: 'left' });
  doc.font('Helvetica').fontSize(7).fillColor('#666666');
  doc.text(title, 40, 24, { width: 190 });

  doc.moveTo(12, 40).lineTo(230, 40).strokeColor('#CCCCCC').stroke();
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(12);
  doc.text(data.person.name, 12, 48, { width: 218 });
  const showCode = data.layout?.showCode !== false;
  doc.font('Helvetica').fontSize(9);
  if (showCode) {
    doc.text(data.person.code, 12, 66, { width: 218 });
  }
  if (data.person.line2) {
    doc.text(data.person.line2, 12, 80, { width: 218 });
  }
  if (data.person.line3) {
    doc.text(data.person.line3, 12, 94, { width: 218 });
  }
  if (data.layout?.showPhoto && data.photo && data.photo.length > 0) {
    try {
      doc.image(data.photo, 188, 48, { fit: [36, 44] });
    } catch {
      // Portrait is optional.
    }
  }
  doc.fontSize(7).fillColor('#666666');
  const footer = data.layout?.footerLine?.trim() || `Issued ${data.generatedDate} · ${data.documentId}`;
  doc.text(footer, 12, 128, { width: 218 });
  doc.end();
  return finished;
}
