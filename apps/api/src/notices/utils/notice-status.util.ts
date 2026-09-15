import { NoticeStatus } from '@prisma/client';

export function resolveStatusAfterScheduleChange(
  currentStatus: NoticeStatus,
  scheduledAt: Date | null | undefined,
  now: Date = new Date(),
): NoticeStatus {
  if (scheduledAt === undefined) {
    return currentStatus;
  }

  if (scheduledAt === null) {
    return NoticeStatus.DRAFT;
  }

  return scheduledAt > now ? NoticeStatus.SCHEDULED : NoticeStatus.DRAFT;
}

export function canPublishNotice(
  status: NoticeStatus,
  scheduledAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (status === NoticeStatus.DRAFT) {
    return true;
  }

  if (status === NoticeStatus.SCHEDULED) {
    return Boolean(scheduledAt && scheduledAt <= now);
  }

  return false;
}

export function isEditableNoticeStatus(status: NoticeStatus): boolean {
  return status === NoticeStatus.DRAFT || status === NoticeStatus.SCHEDULED;
}
