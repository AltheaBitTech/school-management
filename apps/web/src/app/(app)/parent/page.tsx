'use client';

import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiClient } from '@/lib/api/client';
import { StudentPortalPageShell, StudentPortalSection } from '@/components/ui/StudentPortalPageShell';

interface ParentChild {
  linkId: string;
  student: {
    id: string;
    studentCode: string;
    name: string;
    className?: string | null;
    studentClass?: string | null;
    section?: string | null;
    status: string;
  };
}

interface ChildTransport {
  routeName: string;
  stopName: string;
  pickupTime: string | null;
  vehicleRegistration: string | null;
  driverName: string | null;
}

function formatChildTransport(assignment: ChildTransport | null | 'unavailable' | undefined): string {
  if (assignment === undefined) {
    return 'Loading transport…';
  }
  if (assignment === 'unavailable') {
    return 'Transport details are unavailable.';
  }
  if (!assignment) {
    return 'No transport assignment.';
  }

  const parts = [`Route ${assignment.routeName}`, `Stop ${assignment.stopName}`];
  if (assignment.pickupTime) {
    parts.push(assignment.pickupTime);
  }
  if (assignment.vehicleRegistration) {
    parts.push(assignment.vehicleRegistration);
  }
  if (assignment.driverName) {
    parts.push(assignment.driverName);
  }
  return parts.join(' · ');
}

export default function ParentPortalPage() {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [transportByStudent, setTransportByStudent] = useState<Record<string, ChildTransport | null | 'unavailable'>>(
    {},
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void apiClient
      .get<{ data: ParentChild[] }>('/parent-self/children', { auth: true })
      .then(async (response) => {
        setChildren(response.data);
        const entries = await Promise.all(
          response.data.map(async (child) => {
            try {
              const transport = await apiClient.get<{ data: ChildTransport | null }>(
                `/parent-self/children/${child.student.id}/transport`,
                { auth: true },
              );
              return [child.student.id, transport.data] as const;
            } catch {
              return [child.student.id, 'unavailable'] as const;
            }
          }),
        );
        setTransportByStudent(Object.fromEntries(entries));
      })
      .catch((error) =>
        setErrorMessage(error instanceof ApiError ? error.message : 'Failed to load children'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <StudentPortalPageShell
      title="My children"
      description="Notices sent to parents appear in Notices when a student is linked to this account."
    >
      <Button
        component={Link}
        href="/notices"
        variant="contained"
        startIcon={<AnnouncementOutlined />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Open notices
      </Button>
      {isLoading ? (
        <Stack spacing={1.5} aria-label="Loading parent portal">
          <Skeleton variant="rounded" height={88} />
          <Skeleton variant="rounded" height={88} />
        </Stack>
      ) : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {!isLoading && children.length === 0 ? (
        <Alert severity="info">No students are linked yet. Ask the school office to link your account.</Alert>
      ) : null}
      {children.map((child) => (
        <StudentPortalSection key={child.linkId} title={child.student.name}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SchoolOutlined color="primary" />
            <Stack>
              <Typography>{child.student.studentCode}</Typography>
              <Typography variant="body2" color="text.secondary">
                {[child.student.studentClass, child.student.section].filter(Boolean).join(' · ') ||
                  child.student.className ||
                  'Class not set'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatChildTransport(transportByStudent[child.student.id])}
              </Typography>
            </Stack>
          </Stack>
        </StudentPortalSection>
      ))}
    </StudentPortalPageShell>
  );
}
