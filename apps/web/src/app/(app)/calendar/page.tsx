'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import { useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { ApiError } from '@/lib/api/client';
import { getCalendarItems, type CalendarData } from '@/lib/calendar/calendar-client';
import { formatEventDateTime } from '@/lib/events/events-client';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarEntry {
  key: string;
  label: string;
  sub: string;
  chip: 'Leave' | 'Event';
  startKey: string;
  endKey: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthBounds(reference: Date): { startDate: string; endDate: string } {
  const start = monthStart(reference);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { startDate: dateKey(start), endDate: dateKey(end) };
}

function monthCells(reference: Date): Array<Date | null> {
  const start = monthStart(reference);
  const leading = (start.getDay() + 6) % 7;
  const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

function isoDateKey(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }
  return dateKey(parsed);
}

function buildEntries(data: CalendarData | null): CalendarEntry[] {
  if (!data) {
    return [];
  }
  const leave = Array.isArray(data.leave) ? data.leave : [];
  const events = Array.isArray(data.events) ? data.events : [];
  return [
    ...leave.map((item) => ({
      key: `leave-${item.id}`,
      label: item.title,
      sub: `${item.startDate} → ${item.endDate}`,
      chip: 'Leave' as const,
      startKey: item.startDate,
      endKey: item.endDate,
    })),
    ...events.map((item) => ({
      key: `event-${item.id}`,
      label: item.title,
      sub: formatEventDateTime(item.startAt),
      chip: 'Event' as const,
      startKey: isoDateKey(item.startAt),
      endKey: isoDateKey(item.endAt),
    })),
  ].sort((left, right) => left.startKey.localeCompare(right.startKey) || left.label.localeCompare(right.label));
}

export default function CalendarPage() {
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(new Date()));
  const [data, setData] = useState<CalendarData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const range = useMemo(() => monthBounds(visibleMonth), [visibleMonth]);
  const cells = useMemo(() => monthCells(visibleMonth), [visibleMonth]);
  const monthLabel = visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = dateKey(new Date());

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);
    void getCalendarItems(range.startDate, range.endDate)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((error) => {
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setIsForbidden(true);
          } else {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load calendar');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.endDate, range.startDate]);

  const items = useMemo(() => buildEntries(data), [data]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <ListPageShell
      title="Operations calendar"
      description="Approved leave and scheduled events. Move between months to see the rest of the year."
      icon={CalendarMonthOutlined}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton aria-label="Previous month" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
            <ChevronLeftOutlined />
          </IconButton>
          <Typography variant="h6" component="h2" sx={{ minWidth: { sm: 180 }, textAlign: 'center' }}>
            {monthLabel}
          </Typography>
          <IconButton aria-label="Next month" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
            <ChevronRightOutlined />
          </IconButton>
        </Stack>
        <Button variant="outlined" onClick={() => setVisibleMonth(monthStart(new Date()))}>
          This month
        </Button>
      </Stack>

      {isLoading ? <LoadingState label="Loading calendar" columnCount={1} /> : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!errorMessage ? (
        <Box
          role="grid"
          aria-label={`${monthLabel} calendar`}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          {WEEKDAYS.map((weekday) => (
            <Box
              key={weekday}
              role="columnheader"
              sx={{
                px: { xs: 0.5, sm: 1 },
                py: 1,
                bgcolor: 'action.hover',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" fontWeight={700}>
                {weekday}
              </Typography>
            </Box>
          ))}
          {cells.map((day, index) => {
            const key = day ? dateKey(day) : `blank-${index}`;
            const dayItems = day ? items.filter((item) => item.startKey <= key && item.endKey >= key) : [];
            return (
              <Box
                key={key}
                role="gridcell"
                sx={{
                  minHeight: { xs: 72, sm: 104 },
                  p: { xs: 0.5, sm: 1 },
                  borderTop: '1px solid',
                  borderLeft: index % 7 === 0 ? 'none' : '1px solid',
                  borderColor: 'divider',
                  bgcolor: day && key === todayKey ? 'action.selected' : 'transparent',
                }}
              >
                {day ? (
                  <Stack spacing={0.5}>
                    <Typography variant="caption" fontWeight={key === todayKey ? 700 : 500}>
                      {day.getDate()}
                    </Typography>
                    {dayItems.slice(0, 2).map((item) => (
                      <Typography key={item.key} variant="caption" noWrap title={item.label}>
                        {item.chip === 'Leave' ? 'Leave' : 'Event'}: {item.label}
                      </Typography>
                    ))}
                    {dayItems.length > 2 ? (
                      <Typography variant="caption" color="text.secondary">
                        +{dayItems.length - 2} more
                      </Typography>
                    ) : null}
                  </Stack>
                ) : null}
              </Box>
            );
          })}
        </Box>
      ) : null}

      {!isLoading && !errorMessage && items.length === 0 ? (
        <Typography color="text.secondary">No leave or events in this month.</Typography>
      ) : null}

      {items.length > 0 ? (
        <Stack spacing={1.5} aria-label="Calendar items">
          {items.map((item) => (
            <Box
              key={item.key}
              sx={{
                p: 2,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" label={item.chip} color={item.chip === 'Leave' ? 'primary' : 'secondary'} variant="outlined" />
                <Typography fontWeight={600}>{item.label}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {item.sub}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : null}
    </ListPageShell>
  );
}
