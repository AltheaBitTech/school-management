import { coversDate, rangesOverlap } from './transport-dates.util';

describe('transport date ranges', () => {
  it('treats an open-ended assignment as overlapping a later start', () => {
    expect(rangesOverlap('2026-01-01', null, '2026-06-01', '2026-06-30')).toBe(true);
  });

  it('allows a new assignment after the previous one ended', () => {
    expect(rangesOverlap('2026-01-01', '2026-03-31', '2026-04-01', null)).toBe(false);
  });

  it('covers today when the end date is inclusive', () => {
    expect(coversDate('2026-01-01', '2026-01-31', '2026-01-31')).toBe(true);
    expect(coversDate('2026-01-01', '2026-01-31', '2026-02-01')).toBe(false);
  });
});
