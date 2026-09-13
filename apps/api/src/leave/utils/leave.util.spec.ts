import {
  calculateAvailableBalance,
  calculateLeaveDuration,
  datesOverlap,
  parseLeaveDate,
} from './leave.util';

describe('leave.util', () => {
  it('calculates inclusive calendar day duration', () => {
    const duration = calculateLeaveDuration({
      startDate: parseLeaveDate('2026-09-01'),
      endDate: parseLeaveDate('2026-09-03'),
      isHalfDay: false,
    });

    expect(duration).toBe(3);
  });

  it('calculates half-day duration', () => {
    const duration = calculateLeaveDuration({
      startDate: parseLeaveDate('2026-09-01'),
      endDate: parseLeaveDate('2026-09-01'),
      isHalfDay: true,
    });

    expect(duration).toBe(0.5);
  });

  it('detects overlapping date ranges', () => {
    expect(
      datesOverlap(
        parseLeaveDate('2026-09-01'),
        parseLeaveDate('2026-09-05'),
        parseLeaveDate('2026-09-03'),
        parseLeaveDate('2026-09-07'),
      ),
    ).toBe(true);
  });

  it('calculates available balance from components', () => {
    const available = calculateAvailableBalance({
      openingBalance: 1,
      allocatedAmount: 10,
      usedAmount: 3,
      pendingAmount: 0,
      adjustmentAmount: 0,
    } as never);

    expect(available).toBe(8);
  });
});
