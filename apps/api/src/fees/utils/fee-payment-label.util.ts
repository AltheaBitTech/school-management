import { FeePaymentMethod } from '@prisma/client';

export function formatFeePaymentMethodLabel(method: FeePaymentMethod): string {
  switch (method) {
    case FeePaymentMethod.CASH:
      return 'Cash';
    case FeePaymentMethod.BANK_TRANSFER:
      return 'Bank transfer';
    case FeePaymentMethod.UPI:
      return 'UPI';
    case FeePaymentMethod.OTHER:
      return 'Other';
    default:
      return method;
  }
}
