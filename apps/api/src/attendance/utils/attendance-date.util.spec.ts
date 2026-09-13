import { BadRequestException } from '@nestjs/common';
import {
  assertValidCheckInOut,
  formatAttendanceDate,
  parseAttendanceDate,
} from './attendance-date.util';

describe('attendance-date.util', () => {
  it('parses and formats calendar dates without timezone shifting', () => {
    const parsed = parseAttendanceDate('2026-09-12');
    expect(formatAttendanceDate(parsed)).toBe('2026-09-12');
  });

  it('rejects invalid attendance date strings', () => {
    expect(() => parseAttendanceDate('12-09-2026')).toThrow(BadRequestException);
    expect(() => parseAttendanceDate('2026-13-40')).toThrow(BadRequestException);
  });

  it('rejects check-out earlier than check-in', () => {
    expect(() =>
      assertValidCheckInOut(
        new Date('2026-09-12T17:00:00.000Z'),
        new Date('2026-09-12T09:00:00.000Z'),
      ),
    ).toThrow(BadRequestException);
  });
});
