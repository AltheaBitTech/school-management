'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { LoadingState } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { formatLeaveStatus, type LeaveRequestStatus } from '@/lib/leave/leave-client';
import {
  getStaffSelfLeaveRequest,
  type StaffSelfLeaveRequestDetail,
} from '@/lib/staff-self/staff-self-client';

export default function StaffLeaveDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<StaffSelfLeaveRequestDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    void getStaffSelfLeaveRequest(params.id)
      .then(setDetail)
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load leave request');
        }
      })
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return <LoadingState label="Loading leave request…" />;
  }

  if (!detail) {
    return <Alert severity="error">{errorMessage ?? 'Leave request not found'}</Alert>;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Leave request"
        description={`${detail.leaveTypeName} · ${detail.startDate} – ${detail.endDate}`}
        actions={
          <Button component={Link} href="/staff/leave" size="small">
            Back to my leave
          </Button>
        }
      />

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={600}>Status</Typography>
              <StatusChip
                status={detail.status}
                label={formatLeaveStatus(detail.status as LeaveRequestStatus)}
              />
            </Stack>
            <Typography>Duration: {detail.duration} day(s)</Typography>
            {detail.reason ? <Typography>Reason: {detail.reason}</Typography> : null}
            {detail.rejectionReason ? (
              <Alert severity="warning">Rejection note: {detail.rejectionReason}</Alert>
            ) : null}
            {detail.approval ? (
              <Typography color="text.secondary">
                Approval: {detail.approval.status}
                {detail.approval.currentLevelName
                  ? ` · ${detail.approval.currentLevelName}`
                  : ''}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {detail.approvalHistory.length > 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Approval history</Typography>
            <Stack spacing={1.5}>
              {detail.approvalHistory.map((action) => (
                <Typography key={action.id} variant="body2">
                  {action.action} · {new Date(action.createdAt).toLocaleString()}
                  {action.comment ? ` — ${action.comment}` : ''}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
