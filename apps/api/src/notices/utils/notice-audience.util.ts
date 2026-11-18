import { NoticeAudienceType } from '@prisma/client';

export interface NoticeAudienceRow {
  audienceType: NoticeAudienceType;
  departmentId: string | null;
}

export interface NoticeRecipientAudienceContext {
  hasStaffProfile: boolean;
  hasStudentProfile: boolean;
  hasParentLink: boolean;
  departmentId: string | null;
}

/** @deprecated Use NoticeRecipientAudienceContext */
export type StaffAudienceContext = NoticeRecipientAudienceContext;

export function userMatchesAudiences(
  audiences: NoticeAudienceRow[],
  context: NoticeRecipientAudienceContext,
): boolean {
  return audiences.some((audience) => {
    if (audience.audienceType === NoticeAudienceType.ENTIRE_ORGANIZATION) {
      return true;
    }

    if (audience.audienceType === NoticeAudienceType.STAFF) {
      return context.hasStaffProfile;
    }

    if (audience.audienceType === NoticeAudienceType.STUDENT) {
      return context.hasStudentProfile;
    }

    if (audience.audienceType === NoticeAudienceType.PARENT) {
      return context.hasParentLink;
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
