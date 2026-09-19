import { BadRequestException } from '@nestjs/common';
import { StudentFeeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { FEE_ERROR_CODES } from '../constants/fee.constants';

export function toFeeDecimal(value: number): Decimal {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestException({
      code: FEE_ERROR_CODES.INVALID_AMOUNT,
      message: 'Amount must be greater than zero',
    });
  }

  return new Decimal(value.toFixed(2));
}

export function decimalToNumber(value: Decimal): number {
  return value.toNumber();
}

export function sumPaymentAmounts(payments: Array<{ amount: Decimal }>): Decimal {
  return payments.reduce((total, payment) => total.add(payment.amount), new Decimal(0));
}

export function calculateOutstanding(assignedAmount: Decimal, totalPaid: Decimal): Decimal {
  const outstanding = assignedAmount.sub(totalPaid);
  return outstanding.lt(0) ? new Decimal(0) : outstanding;
}

export function deriveStudentFeeStatus(
  assignedAmount: Decimal,
  totalPaid: Decimal,
): StudentFeeStatus {
  if (totalPaid.lte(0)) {
    return StudentFeeStatus.PENDING;
  }

  if (totalPaid.gte(assignedAmount)) {
    return StudentFeeStatus.PAID;
  }

  return StudentFeeStatus.PARTIALLY_PAID;
}
