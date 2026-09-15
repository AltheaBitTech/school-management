'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import {
  addComplaintComment,
  assignComplaint,
  changeComplaintStatus,
  formatComplaintCategory,
  formatComplaintPriority,
  formatComplaintStatus,
  getComplaint,
  getNextComplaintStatus,
  getStaffDisplayName,
  type Complaint,
  type ComplaintStatus,
} from '@/lib/complaints/complaints-client';
import { listStaff, type StaffMember } from '@/lib/staff/staff-client';

function formatHistoryLine(entry: NonNullable<Complaint['history']>[number]): string {
  if (entry.oldStatus && entry.newStatus) {
    return `${formatComplaintStatus(entry.oldStatus)} → ${formatComplaintStatus(entry.newStatus)}`;
  }

  if (entry.newStatus) {
    return `Status set to ${formatComplaintStatus(entry.newStatus)}`;
  }

  return 'Comment added';
}

export default function ComplaintDetailPage() {
  const params = useParams<{ id: string }>();
  const complaintId = params.id;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  async function reloadComplaint(): Promise<void> {
    const data = await getComplaint(complaintId);
    setComplaint(data);
    setAssigneeId(data.assignedToStaffId ?? '');
  }

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const [complaintData, staffResponse] = await Promise.all([
          getComplaint(complaintId),
          listStaff({ page: 1, pageSize: 100, sortBy: 'firstName', sortOrder: 'asc' }),
        ]);

        if (!cancelled) {
          setComplaint(complaintData);
          setAssigneeId(complaintData.assignedToStaffId ?? '');
          setStaff(staffResponse.data.filter((member) => member.employmentStatus !== 'OFFBOARDED'));
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load complaint');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [complaintId]);

  async function handleAssign(): Promise<void> {
    if (!assigneeId) {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await assignComplaint(complaintId, assigneeId);
      await reloadComplaint();
      setSuccessMessage('Complaint assigned.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to assign complaint');
    } finally {
      setIsActing(false);
    }
  }

  async function handleStatusChange(nextStatus: ComplaintStatus): Promise<void> {
    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await changeComplaintStatus(complaintId, nextStatus);
      await reloadComplaint();
      setSuccessMessage(`Complaint moved to ${formatComplaintStatus(nextStatus).toLowerCase()}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsActing(false);
    }
  }

  async function handleCommentSubmit(): Promise<void> {
    if (!comment.trim()) {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await addComplaintComment(complaintId, comment.trim());
      setComment('');
      await reloadComplaint();
      setSuccessMessage('Comment added.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setIsActing(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading || !complaint) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading complaint" />
      </Box>
    );
  }

  const nextStatus = getNextComplaintStatus(complaint.status);
  const canAssign = complaint.status === 'OPEN' || complaint.status === 'ASSIGNED';
  const canComment = complaint.status !== 'CLOSED';
  const canAdvanceStatus =
    nextStatus !== null &&
    complaint.status !== 'OPEN' &&
    complaint.status !== 'CLOSED';

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            {complaint.title}
          </Typography>
          <Typography color="text.secondary">
            {complaint.complaintCode} · {formatComplaintCategory(complaint.category)}
          </Typography>
        </Box>
        <Button component={Link} href="/complaints" variant="outlined">
          Back to list
        </Button>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={formatComplaintStatus(complaint.status)} color="primary" />
            <Chip label={formatComplaintPriority(complaint.priority)} />
          </Stack>

          <Typography variant="body1">{complaint.description}</Typography>

          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Reporter: {complaint.createdBy?.email ?? complaint.createdByUserId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Assignee: {getStaffDisplayName(complaint.assignedToStaff)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Location: {complaint.location || '—'}
            </Typography>
            {complaint.closedAt ? (
              <Typography variant="body2" color="text.secondary">
                Closed at: {new Date(complaint.closedAt).toLocaleString()}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      {canAssign ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Assignment</Typography>
            <TextField
              select
              label="Assign to staff"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              sx={{ maxWidth: 360 }}
            >
              {staff.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.displayName || `${member.firstName} ${member.lastName}`}
                </MenuItem>
              ))}
            </TextField>
            <Box>
              <Button variant="contained" disabled={isActing || !assigneeId} onClick={() => void handleAssign()}>
                {complaint.status === 'ASSIGNED' ? 'Reassign' : 'Assign'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : null}

      {canAdvanceStatus && nextStatus ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Status</Typography>
            <Button
              variant="contained"
              disabled={isActing}
              onClick={() => void handleStatusChange(nextStatus)}
            >
              Mark as {formatComplaintStatus(nextStatus)}
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {canComment ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Add comment</Typography>
            <TextField
              label="Comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <Box>
              <Button
                variant="outlined"
                disabled={isActing || !comment.trim()}
                onClick={() => void handleCommentSubmit()}
              >
                Add comment
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Timeline</Typography>
          {complaint.history && complaint.history.length > 0 ? (
            <Stack spacing={2} divider={<Divider flexItem />}>
              {complaint.history.map((entry) => (
                <Box key={entry.id}>
                  <Typography variant="subtitle2">{formatHistoryLine(entry)}</Typography>
                  {entry.comment ? (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {entry.comment}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    {entry.actor?.email ?? entry.actorUserId} ·{' '}
                    {new Date(entry.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">No history recorded yet.</Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
