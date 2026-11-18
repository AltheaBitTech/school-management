import { NoticeAudienceType } from '@prisma/client';
import { userMatchesAudiences } from './notice-audience.util';

const noProfiles = {
  hasStaffProfile: false,
  hasStudentProfile: false,
  hasParentLink: false,
  departmentId: null,
};

describe('notice-audience.util', () => {
  it('matches entire school audience for any user', () => {
    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.ENTIRE_ORGANIZATION, departmentId: null }],
        noProfiles,
      ),
    ).toBe(true);
  });

  it('matches staff audience only for active staff profiles', () => {
    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.STAFF, departmentId: null }],
        { hasStaffProfile: true, hasStudentProfile: false, hasParentLink: false, departmentId: null },
      ),
    ).toBe(true);

    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.STAFF, departmentId: null }],
        noProfiles,
      ),
    ).toBe(false);
  });

  it('matches student audience only for active student profiles', () => {
    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.STUDENT, departmentId: null }],
        { hasStaffProfile: false, hasStudentProfile: true, hasParentLink: false, departmentId: null },
      ),
    ).toBe(true);

    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.STUDENT, departmentId: null }],
        noProfiles,
      ),
    ).toBe(false);
  });

  it('matches parent audience only for linked parent users', () => {
    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.PARENT, departmentId: null }],
        { hasStaffProfile: false, hasStudentProfile: false, hasParentLink: true, departmentId: null },
      ),
    ).toBe(true);

    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.PARENT, departmentId: null }],
        { hasStaffProfile: false, hasStudentProfile: true, hasParentLink: false, departmentId: null },
      ),
    ).toBe(false);
  });

  it('matches department audience by department id', () => {
    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.DEPARTMENT, departmentId: 'dept-1' }],
        { hasStaffProfile: true, hasStudentProfile: false, hasParentLink: false, departmentId: 'dept-1' },
      ),
    ).toBe(true);

    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.DEPARTMENT, departmentId: 'dept-1' }],
        { hasStaffProfile: true, hasStudentProfile: false, hasParentLink: false, departmentId: 'dept-2' },
      ),
    ).toBe(false);
  });

  it('uses union semantics across multiple audience rows', () => {
    expect(
      userMatchesAudiences(
        [
          { audienceType: NoticeAudienceType.DEPARTMENT, departmentId: 'math' },
          { audienceType: NoticeAudienceType.DEPARTMENT, departmentId: 'science' },
        ],
        { hasStaffProfile: true, hasStudentProfile: false, hasParentLink: false, departmentId: 'science' },
      ),
    ).toBe(true);
  });
});
