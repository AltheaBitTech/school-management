import { apiClient } from '@/lib/api/client';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export interface DashboardTodayAttendance {
  date: string;
  activeStaff: number;
  marked: number;
  present: number;
  absent: number;
  unmarked: number;
}

export interface DashboardOutstandingFees {
  totalOutstanding: number;
  feeCount: number;
}

export interface DashboardVisitorsToday {
  checkedInToday: number;
  activeOnCampus: number;
}

export interface DashboardUpcomingEvent {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  venueName?: string | null;
}

export interface DashboardRecentNotice {
  id: string;
  title: string;
  status: string;
  publishedAt?: string | null;
}

export interface DashboardSummary {
  organization: {
    id: string;
    name: string;
    code: string;
    timezone: string;
  };
  generatedAt: string;
  localDate: string;
  greetingPeriod: GreetingPeriod;
  metrics: {
    students: number | null;
    activeStaff: number | null;
    todayAttendance: DashboardTodayAttendance | null;
    outstandingFees: DashboardOutstandingFees | null;
    pendingLeave: number | null;
    pendingApprovals: number | null;
    openComplaints: number | null;
    visitorsToday: DashboardVisitorsToday | null;
    upcomingEvents: DashboardUpcomingEvent[] | null;
    recentNotices: DashboardRecentNotice[] | null;
    unreadNotifications: number | null;
  };
}

interface DashboardSummaryResponse {
  data: DashboardSummary;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummaryResponse>('/dashboard/summary', {
    auth: true,
  });
  return response.data;
}

export function getGreetingLabel(period: GreetingPeriod): string {
  switch (period) {
    case 'morning':
      return 'Good morning';
    case 'afternoon':
      return 'Good afternoon';
    case 'evening':
      return 'Good evening';
    default:
      return 'Hello';
  }
}

export function formatDashboardDate(localDate: string, timezone: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
