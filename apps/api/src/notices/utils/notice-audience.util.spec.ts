import { NoticeAudienceType } from '@prisma/client';
import { userMatchesAudiences } from './notice-audience.util';

describe('notice-audience.util', () => {
  it('matches entire school audience for any user', () => {
    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.ENTIRE_SCHOOL, departmentId: null }],
        { hasStaffProfile: false, departmentId: null },
      ),
    ).toBe(true);
  });

  it('matches staff audience only for active staff profiles', () => {
    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.STAFF, departmentId: null }],
        { hasStaffProfile: true, departmentId: null },
      ),
    ).toBe(true);

    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.STAFF, departmentId: null }],
        { hasStaffProfile: false, departmentId: null },
      ),
    ).toBe(false);
  });

  it('matches department audience by department id', () => {
    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.DEPARTMENT, departmentId: 'dept-1' }],
        { hasStaffProfile: true, departmentId: 'dept-1' },
      ),
    ).toBe(true);

    expect(
      userMatchesAudiences(
        [{ audienceType: NoticeAudienceType.DEPARTMENT, departmentId: 'dept-1' }],
        { hasStaffProfile: true, departmentId: 'dept-2' },
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
        { hasStaffProfile: true, departmentId: 'science' },
      ),
    ).toBe(true);
  });
});
