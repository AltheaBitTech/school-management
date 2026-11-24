import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { FeePaymentMethod, Organization, OrganizationSettings } from '@prisma/client';
import {
  buildOrganizationBlock,
  formatCurrencyInr,
  formatDocumentDate,
  shortDocumentReference,
} from '../../documents/utils/document-format.util';
import {
  bufferFromDocument,
  createA4Document,
  drawCenteredTitle,
  drawStandardFooter,
  drawStandardHeader,
  PDF_MARGIN,
} from '../../documents/services/pdf-layout.util';
import { formatFeePaymentMethodLabel } from '../utils/fee-payment-label.util';

export interface PaymentReceiptPdfInput {
  organization: Organization;
  organizationSettings: OrganizationSettings | null;
  payment: {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: FeePaymentMethod;
    reference?: string | null;
  };
  student: {
    name: string;
    studentCode: string;
    classLabel?: string | null;
  };
  feeStructureName: string;
  assignedAmount: number;
  paidTotal: number;
  outstandingAmount: number;
}

@Injectable()
export class PaymentReceiptPdfService {
  private readonly logger = new Logger(PaymentReceiptPdfService.name);

  async generate(input: PaymentReceiptPdfInput): Promise<Buffer> {
    try {
      return await this.render(input);
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(
        'PDF generation failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: 'PDF_GENERATION_FAILED',
        message: 'The PDF could not be generated',
      });
    }
  }

  private async render(input: PaymentReceiptPdfInput): Promise<Buffer> {
    const doc = createA4Document();
    const orgBlock = buildOrganizationBlock(input.organization, input.organizationSettings);

    const generatedDate = formatDocumentDate(new Date());
    const receiptRef = shortDocumentReference(input.payment.id);

    drawStandardHeader(doc, {
      organization: orgBlock,
      generatedDate,
      documentId: receiptRef,
    });

    drawCenteredTitle(doc, 'Payment Receipt');

    doc.font('Helvetica').fontSize(11);
    const labelX = PDF_MARGIN;
    const valueX = PDF_MARGIN + 160;
    const lineHeight = 18;

    const rows: Array<[string, string]> = [
      ['Receipt number', receiptRef],
      ['Student name', input.student.name],
      ['Admission no.', input.student.studentCode],
      ['Class', input.student.classLabel?.trim() || '—'],
      ['Fee description', input.feeStructureName],
      ['Amount paid', formatCurrencyInr(input.payment.amount)],
      ['Payment method', formatFeePaymentMethodLabel(input.payment.paymentMethod)],
      ['Payment date', formatDocumentDate(new Date(`${input.payment.paymentDate}T00:00:00`))],
      ['Total paid (fee)', formatCurrencyInr(input.paidTotal)],
      ['Assigned amount', formatCurrencyInr(input.assignedAmount)],
      ['Remaining balance', formatCurrencyInr(input.outstandingAmount)],
    ];

    if (input.payment.reference?.trim()) {
      rows.splice(7, 0, ['Reference', input.payment.reference.trim()]);
    }

    let y = doc.y;
    for (const [label, value] of rows) {
      doc.font('Helvetica-Bold').text(`${label}:`, labelX, y, { width: 150 });
      doc.font('Helvetica').text(value, valueX, y, { width: 320 });
      y += lineHeight;
    }

    doc.y = y + 12;
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#666666');
    doc.text('This is a computer-generated receipt.', PDF_MARGIN, doc.y, {
      width: 595.28 - PDF_MARGIN * 2,
      align: 'center',
    });

    drawStandardFooter(doc, {
      organization: orgBlock,
      generatedDate,
      documentId: receiptRef,
    });

    doc.end();
    return bufferFromDocument(doc);
  }
}
