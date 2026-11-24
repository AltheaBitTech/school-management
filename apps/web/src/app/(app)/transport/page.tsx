'use client';

import AddOutlined from '@mui/icons-material/AddOutlined';
import DirectionsBusOutlined from '@mui/icons-material/DirectionsBusOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState, TableIconLink } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError, apiClient } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';

interface RouteRow {
  id: string;
  name: string;
  code: string;
  active: boolean;
  stops: Array<{ id: string }>;
  assignedStudentCount: number;
}

interface UnassignedStudent {
  id: string;
  studentCode: string;
  name: string;
}

export default function TransportPage() {
  const canManage = useCan('transport.manage');
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    void apiClient
      .get<{ data: RouteRow[] }>('/transport/routes', { auth: true })
      .then((response) => setRoutes(response.data))
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Could not load routes');
      })
      .finally(() => setIsLoading(false));
    void apiClient
      .get<{ data: UnassignedStudent[] }>('/transport/unassigned-students', { auth: true })
      .then((response) => setUnassigned(response.data))
      .catch(() => setUnassigned([]));
  }, []);

  if (isForbidden) return <ForbiddenState />;

  return (
    <ListPageShell
      title="Transport"
      description="Routes, stops, and the students who ride them. Live tracking is not part of this screen."
      icon={DirectionsBusOutlined}
      actions={
        <>
          <Button component={Link} href="/transport/vehicles" variant="outlined">
            Vehicles
          </Button>
          {canManage ? (
            <Button component={Link} href="/transport/routes/new" variant="contained" startIcon={<AddOutlined />}>
              New route
            </Button>
          ) : null}
        </>
      }
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {isLoading ? <LoadingState label="Loading routes" columnCount={4} /> : null}
      {!isLoading && routes.length === 0 ? (
        <EmptyState
          icon={DirectionsBusOutlined}
          message={
            canManage
              ? 'No routes yet. Add the first pickup route for this institution.'
              : 'No routes yet.'
          }
          action={
            canManage ? (
              <Button component={Link} href="/transport/routes/new" variant="contained" startIcon={<AddOutlined />}>
                New route
              </Button>
            ) : undefined
          }
        />
      ) : null}
      {!isLoading && routes.length > 0 ? (
        <AppTable minWidth={640} aria-label="Transport routes">
          <TableHead>
            <TableRow>
              <TableCell>Route</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Stops</TableCell>
              <TableCell>Students</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Open</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {routes.map((route) => (
              <TableRow key={route.id} hover>
                <TableCell>{route.name}</TableCell>
                <TableCell>{route.code}</TableCell>
                <TableCell>{route.stops.length}</TableCell>
                <TableCell>{route.assignedStudentCount}</TableCell>
                <TableCell>
                  <StatusChip status={route.active ? 'ACTIVE' : 'INACTIVE'} />
                </TableCell>
                <TableCell align="right">
                  <TableIconLink href={`/transport/routes/${route.id}`} label="Open route" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}
      {!isLoading && unassigned.length > 0 ? (
        <Alert severity="info">
          {unassigned.length} active student{unassigned.length === 1 ? '' : 's'} have no current
          transport assignment
          {unassigned.length <= 8
            ? `: ${unassigned.map((student) => `${student.name} (${student.studentCode})`).join(', ')}.`
            : `. First few: ${unassigned
                .slice(0, 8)
                .map((student) => `${student.name} (${student.studentCode})`)
                .join(', ')}.`}
        </Alert>
      ) : null}
    </ListPageShell>
  );
}
