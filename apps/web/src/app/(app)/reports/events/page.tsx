'use client';

import EventOutlined from '@mui/icons-material/EventOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ReportExportCsvButton } from '@/components/ui/ReportExportCsvButton';
import { ReportFilterPanel } from '@/components/ui/ReportFilterPanel';
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  formatEventDateTime,
  formatEventStatus,
  formatEventType,
  listVenues,
  type EventStatus,
  type EventType,
  type Venue,
} from '@/lib/events/events-client';
import { getCurrentOrganization } from '@/lib/organizations/organizations-client';
import { getEventReport, type EventReport } from '@/lib/reports/event-reports-client';
import { isEventReportForbiddenError } from '@/lib/reports/event-report-errors';
import { ResponsiveTable } from '@/components/ui/AppTable';

export default function EventReportPage() {
  const [report, setReport] = useState<EventReport | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [organizationTimezone, setOrganizationTimezone] = useState('UTC');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [type, setType] = useState<EventType | ''>('');
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [venueId, setVenueId] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [venueError, setVenueError] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      type: type || undefined,
      status: status || undefined,
      venueId: venueId || undefined,
      page,
      pageSize: 25,
    }),
    [fromDate, page, status, toDate, type, venueId],
  );

  useEffect(() => {
    void Promise.all([listVenues({ active: true }), getCurrentOrganization()])
      .then(([venueResponse, organization]) => {
        setVenues(venueResponse.data);
        setOrganizationTimezone(organization.timezone);
      })
      .catch((error) => setVenueError(error instanceof Error ? error.message : 'Failed to load venues'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      try {
        const response = await getEventReport(queryParams);
        if (!cancelled) setReport(response);
      } catch (error) {
        if (cancelled) return;
        if (isEventReportForbiddenError(error)) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Failed to load Event report');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [queryParams]);

  function updateFilter(setter: (value: string) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  if (isForbidden) return <ForbiddenState />;

  return (
    <Stack spacing={3}>
      <PageHeader
        icon={EventOutlined}
        title="Event operations report"
        description="Review tenant-scoped event activity and status totals."
        actions={
          <ReportExportCsvButton
            exportPath="/reports/events/export.csv"
            queryParams={queryParams}
            filename="events-report.csv"
            rowCount={report?.data.length ?? 0}
            onError={setErrorMessage}
          />
        }
      />

      <ReportFilterPanel>
        <TextField label="From" type="date" value={fromDate} onChange={updateFilter(setFromDate)} InputLabelProps={{ shrink: true }} />
        <TextField label="To" type="date" value={toDate} onChange={updateFilter(setToDate)} InputLabelProps={{ shrink: true }} />
        <TextField select label="Type" value={type} onChange={updateFilter((value) => setType(value as EventType | ''))} sx={{ minWidth: 170 }}>
          <MenuItem value="">All types</MenuItem>
          {EVENT_TYPES.map((item) => <MenuItem key={item} value={item}>{formatEventType(item)}</MenuItem>)}
        </TextField>
        <TextField select label="Status" value={status} onChange={updateFilter((value) => setStatus(value as EventStatus | ''))} sx={{ minWidth: 170 }}>
          <MenuItem value="">All statuses</MenuItem>
          {EVENT_STATUSES.map((item) => <MenuItem key={item} value={item}>{formatEventStatus(item)}</MenuItem>)}
        </TextField>
        <TextField select label="Venue" value={venueId} onChange={updateFilter(setVenueId)} sx={{ minWidth: 210 }}>
          <MenuItem value="">All venues</MenuItem>
          {venues.map((venue) => <MenuItem key={venue.id} value={venue.id}>{venue.name}</MenuItem>)}
        </TextField>
      </ReportFilterPanel>

      {venueError && <Alert severity="warning">{venueError}. Venue filtering is unavailable.</Alert>}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      {isLoading ? <CircularProgress /> : !report || report.data.length === 0 ? (
        <Alert severity="info">No events match the selected report filters.</Alert>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Chip label={`Total: ${report.summary.total}`} />
            {Object.entries(report.summary.byStatus).map(([key, value]) => (
              <Chip key={key} label={`${formatEventStatus(key as EventStatus)}: ${value}`} variant="outlined" />
            ))}
          </Stack>
          <ResponsiveTable size="small">
            <TableHead><TableRow><TableCell>Event</TableCell><TableCell>Type</TableCell><TableCell>When</TableCell><TableCell>Venue</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
            <TableBody>
              {report.data.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>{formatEventType(event.type)}</TableCell>
                  <TableCell>{formatEventDateTime(event.startAt, organizationTimezone)}</TableCell>
                  <TableCell>{event.venue.name}</TableCell>
                  <TableCell>{formatEventStatus(event.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ResponsiveTable>
          {report.meta.totalPages > 1 && <Pagination count={report.meta.totalPages} page={report.meta.page} onChange={(_, nextPage) => setPage(nextPage)} />}
        </>
      )}
    </Stack>
  );
}
