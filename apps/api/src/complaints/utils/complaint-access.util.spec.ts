import { complaintMatchesScope, complaintScopeWhere } from './complaint-access.util';

describe('complaint access scope', () => {
  it('leaves organization-wide roles unfiltered', () => {
    expect(complaintScopeWhere({ mode: 'organization' })).toEqual({});
    expect(
      complaintMatchesScope(
        { createdByUserId: 'user-1', assignedToStaffId: null },
        { mode: 'organization' },
      ),
    ).toBe(true);
  });

  it('limits a teacher to complaints they created', () => {
    expect(complaintScopeWhere({ mode: 'creator', userId: 'user-1' })).toEqual({
      createdByUserId: 'user-1',
    });
    expect(
      complaintMatchesScope(
        { createdByUserId: 'user-2', assignedToStaffId: 'staff-1' },
        { mode: 'creator', userId: 'user-1' },
      ),
    ).toBe(false);
  });

  it('limits maintenance to the assigned staff profile', () => {
    expect(complaintScopeWhere({ mode: 'assignee', staffId: 'staff-1' })).toEqual({
      assignedToStaffId: 'staff-1',
    });
    expect(complaintScopeWhere({ mode: 'assignee', staffId: null })).toEqual({ id: { in: [] } });
    expect(
      complaintMatchesScope(
        { createdByUserId: 'user-1', assignedToStaffId: 'staff-2' },
        { mode: 'assignee', staffId: 'staff-1' },
      ),
    ).toBe(false);
  });
});
