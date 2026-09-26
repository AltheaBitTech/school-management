import { hasPermission } from '@/lib/auth/routing';

export type ReportGroupId = 'operations' | 'finance' | 'events';

export const REPORT_GROUP_LABELS: Record<ReportGroupId, string> = {
  operations: 'Operations',
  finance: 'Finance',
  events: 'Events & campus',
};

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  href: string;
  permission: string;
  group: ReportGroupId;
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'Review staff attendance by date, department, and status.',
    href: '/reports/attendance',
    permission: 'report.attendance.view',
    group: 'operations',
  },
  {
    id: 'leave',
    name: 'Leave',
    description: 'Review leave requests, approvals, and balances.',
    href: '/reports/leave',
    permission: 'report.leave.view',
    group: 'operations',
  },
  {
    id: 'complaints',
    name: 'Complaints',
    description: 'Review complaint status, priority, departments, and ageing.',
    href: '/reports/complaints',
    permission: 'report.complaints.view',
    group: 'operations',
  },
  {
    id: 'visitors',
    name: 'Visitors',
    description: 'Review visits, check-ins, check-outs, and current visitors.',
    href: '/reports/visitors',
    permission: 'report.visitors.view',
    group: 'operations',
  },
  {
    id: 'fees',
    name: 'Fees',
    description: 'Review assigned fees, collections, and outstanding balances.',
    href: '/reports/fees',
    permission: 'report.fees.view',
    group: 'finance',
  },
  {
    id: 'events',
    name: 'Event operations',
    description: 'Review scheduled and completed school events.',
    href: '/reports/events',
    permission: 'report.event.view',
    group: 'events',
  },
];

export function getVisibleReports(permissions: string[] | undefined): ReportDefinition[] {
  return REPORT_DEFINITIONS.filter((report) => hasPermission(permissions, report.permission));
}

export function hasAnyReportPermission(permissions: string[] | undefined): boolean {
  return getVisibleReports(permissions).length > 0;
}

export function groupVisibleReports(
  reports: ReportDefinition[],
): Array<{ group: ReportGroupId; label: string; reports: ReportDefinition[] }> {
  const order: ReportGroupId[] = ['operations', 'finance', 'events'];

  return order
    .map((group) => ({
      group,
      label: REPORT_GROUP_LABELS[group],
      reports: reports.filter((report) => report.group === group),
    }))
    .filter((section) => section.reports.length > 0);
}
