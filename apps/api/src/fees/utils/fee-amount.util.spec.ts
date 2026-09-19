import { StudentFeeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateOutstanding,
  deriveStudentFeeStatus,
  sumPaymentAmounts,
  toFeeDecimal,
} from './fee-amount.util';

describe('fee amount utilities', () => {
  it('derives PENDING when no payments exist', () => {
    expect(
      deriveStudentFeeStatus(new Decimal(1000), new Decimal(0)),
    ).toBe(StudentFeeStatus.PENDING);
  });

  it('derives PARTIALLY_PAID when some amount is paid', () => {
    expect(
      deriveStudentFeeStatus(new Decimal(1000), new Decimal(250)),
    ).toBe(StudentFeeStatus.PARTIALLY_PAID);
  });

  it('derives PAID when the assigned amount is fully paid', () => {
    expect(
      deriveStudentFeeStatus(new Decimal(1000), new Decimal(1000)),
    ).toBe(StudentFeeStatus.PAID);
  });

  it('calculates outstanding as assigned minus paid', () => {
    expect(
      calculateOutstanding(new Decimal(1000), new Decimal(250)).toNumber(),
    ).toBe(750);
  });

  it('never returns negative outstanding amounts', () => {
    expect(
      calculateOutstanding(new Decimal(1000), new Decimal(1200)).toNumber(),
    ).toBe(0);
  });

  it('sums payment amounts', () => {
    expect(
      sumPaymentAmounts([
        { amount: new Decimal(100) },
        { amount: new Decimal(250.5) },
      ]).toNumber(),
    ).toBe(350.5);
  });

  it('rejects zero or negative fee amounts', () => {
    expect(() => toFeeDecimal(0)).toThrow('Amount must be greater than zero');
    expect(() => toFeeDecimal(-10)).toThrow('Amount must be greater than zero');
  });
});
