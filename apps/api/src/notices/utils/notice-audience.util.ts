import { NoticeAudienceType } from '@prisma/client';

export interface NoticeAudienceRow {
  audienceType: NoticeAudienceType;
  departmentId: string | null;
}

export interface StaffAudienceContext {
  hasStaffProfile: boolean;
  departmentId: string | null;
}

export function userMatchesAudiences(
  audiences: NoticeAudienceRow[],
  context: StaffAudienceContext,
): boolean {
  return audiences.some((audience) => {
    if (audience.audienceType === NoticeAudienceType.ENTIRE_SCHOOL) {
      return true;
    }

    if (audience.audienceType === NoticeAudienceType.STAFF) {
      return context.hasStaffProfile;
    }

    if (audience.audienceType === NoticeAudienceType.DEPARTMENT) {
      return (
        context.hasStaffProfile &&
        context.departmentId !== null &&
        context.departmentId === audience.departmentId
      );
    }

    return false;
  });
}
