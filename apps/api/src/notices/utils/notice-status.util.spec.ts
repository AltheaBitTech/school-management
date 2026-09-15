import { NoticeStatus } from '@prisma/client';
import {
  canPublishNotice,
  isEditableNoticeStatus,
  resolveStatusAfterScheduleChange,
} from './notice-status.util';

describe('notice-status.util', () => {
  const now = new Date('2026-09-15T12:00:00.000Z');

  it('moves draft to scheduled when a future schedule is supplied', () => {
    expect(
      resolveStatusAfterScheduleChange(
        NoticeStatus.DRAFT,
        new Date('2026-09-16T12:00:00.000Z'),
        now,
      ),
    ).toBe(NoticeStatus.SCHEDULED);
  });

  it('returns draft when schedule is removed', () => {
    expect(resolveStatusAfterScheduleChange(NoticeStatus.SCHEDULED, null, now)).toBe(
      NoticeStatus.DRAFT,
    );
  });

  it('allows immediate publish from draft', () => {
    expect(canPublishNotice(NoticeStatus.DRAFT, null, now)).toBe(true);
  });

  it('rejects early publish for scheduled notices', () => {
    expect(
      canPublishNotice(NoticeStatus.SCHEDULED, new Date('2026-09-16T12:00:00.000Z'), now),
    ).toBe(false);
  });

  it('allows publish when scheduled time has passed', () => {
    expect(
      canPublishNotice(NoticeStatus.SCHEDULED, new Date('2026-09-14T12:00:00.000Z'), now),
    ).toBe(true);
  });

  it('identifies editable statuses', () => {
    expect(isEditableNoticeStatus(NoticeStatus.DRAFT)).toBe(true);
    expect(isEditableNoticeStatus(NoticeStatus.SCHEDULED)).toBe(true);
    expect(isEditableNoticeStatus(NoticeStatus.PUBLISHED)).toBe(false);
  });
});
