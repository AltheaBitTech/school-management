import { describe, expect, it } from 'vitest';
import {
  getVisibleReports,
  groupVisibleReports,
  hasAnyReportPermission,
} from '@/lib/reports/reports-catalog';

describe('reports-catalog', () => {
  it('returns only reports the user may view', () => {
    const visible = getVisibleReports(['report.attendance.view', 'report.fees.view']);
    expect(visible.map((report) => report.id)).toEqual(['attendance', 'fees']);
  });

  it('returns no reports for staff without report permissions', () => {
    expect(getVisibleReports(['staff.self.view', 'staff.self.leave.view'])).toEqual([]);
    expect(hasAnyReportPermission(['staff.self.view'])).toBe(false);
  });

  it('groups visible reports in display order', () => {
    const grouped = groupVisibleReports(
      getVisibleReports(['report.leave.view', 'report.event.view', 'report.fees.view']),
    );
    expect(grouped.map((section) => section.group)).toEqual(['operations', 'finance', 'events']);
    expect(grouped[0]?.reports[0]?.id).toBe('leave');
    expect(grouped[1]?.reports[0]?.id).toBe('fees');
    expect(grouped[2]?.reports[0]?.id).toBe('events');
  });
});
