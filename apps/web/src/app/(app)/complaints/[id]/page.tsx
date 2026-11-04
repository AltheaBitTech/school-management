'use client';

import BuildOutlined from '@mui/icons-material/BuildOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import { FileAttachmentUploadField } from '@/components/files/FileAttachmentUploadField';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import { downloadComplaintAttachment } from '@/lib/files/files-client';
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
  const canAssignComplaint = useCan('complaint.assign');
  const canUpdateComplaint = useCan('complaint.update');
  const canCloseComplaint = useCan('complaint.close');
  const canUploadFile = useCan('file.create');
  const params = useParams<{ id: string }>();
  const complaintId = params.id;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [comment, setComment] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [completionFileIds, setCompletionFileIds] = useState<string[]>([]);
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
        const complaintData = await getComplaint(complaintId);
        if (cancelled) {
          return;
        }
        setComplaint(complaintData);
        setAssigneeId(complaintData.assignedToStaffId ?? '');

        if (canAssignComplaint) {
          try {
            const staffResponse = await listStaff({
              page: 1,
              pageSize: 100,
              sortBy: 'firstName',
              sortOrder: 'asc',
            });
            if (!cancelled) {
              setStaff(staffResponse.data.filter((member) => member.employmentStatus !== 'OFFBOARDED'));
            }
          } catch {
            if (!cancelled) {
              setStaff([]);
            }
          }
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
  }, [canAssignComplaint, complaintId]);

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
      await changeComplaintStatus(complaintId, nextStatus, {
        note: completionNote.trim() || undefined,
        attachmentFileIds: completionFileIds,
      });
      setCompletionNote('');
      setCompletionFileIds([]);
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
      <Stack spacing={3}>
        <PageHeader title="Complaint" description="Loading this complaint." icon={BuildOutlined} />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading complaint" />
        </Box>
      </Stack>
    );
  }

  const nextStatus = getNextComplaintStatus(complaint.status);
  const canAssign =
    canAssignComplaint && (complaint.status === 'OPEN' || complaint.status === 'ASSIGNED');
  const canComment = canUpdateComplaint && complaint.status !== 'CLOSED';
  const canAdvanceStatus =
    nextStatus !== null &&
    complaint.status !== 'OPEN' &&
    complaint.status !== 'CLOSED' &&
    (nextStatus === 'CLOSED' ? canCloseComplaint : canUpdateComplaint);

  return (
    <Stack spacing={3}>
      <PageHeader
        title={complaint.title}
        description={`${complaint.complaintCode} · ${formatComplaintCategory(complaint.category)}`}
        icon={BuildOutlined}
        actions={
          <Button component={Link} href="/complaints" variant="outlined">
            Back to list
          </Button>
        }
      />

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <StatusChip
              status={complaint.status}
              label={formatComplaintStatus(complaint.status)}
            />
            <StatusChip
              status={complaint.priority}
              label={formatComplaintPriority(complaint.priority)}
            />
          </Stack>

          <Typography variant="body1">{complaint.description}</Typography>
          {complaint.attachments && complaint.attachments.length > 0 ? (
            <Stack spacing={0.5} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Photos</Typography>
              {complaint.attachments.map((attachment) => (
                <Button
                  key={attachment.id}
                  variant="text"
                  size="small"
                  sx={{ justifyContent: 'flex-start', px: 0 }}
                  onClick={() =>
                    void downloadComplaintAttachment(
                      complaint.id,
                      attachment.fileId,
                      attachment.file.originalName,
                    ).catch((error) => {
                      setErrorMessage(
                        error instanceof Error ? error.message : 'Failed to download attachment',
                      );
                    })
                  }
                >
                  {attachment.file.originalName} ({Math.round(attachment.file.size / 1024)} KB)
                </Button>
              ))}
            </Stack>
          ) : null}

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
            {nextStatus === 'COMPLETED' ? (
              <>
                <TextField
                  label="Completion note"
                  value={completionNote}
                  onChange={(event) => setCompletionNote(event.target.value)}
                  helperText="Describe the work that was finished."
                  multiline
                  minRows={3}
                  fullWidth
                  required
                />
                {canUploadFile ? (
                  <FileAttachmentUploadField
                    label="Completion photos"
                    helperText="Optional images of the finished work."
                    accept="image/*"
                    maxFiles={5}
                    fileIds={completionFileIds}
                    onChange={setCompletionFileIds}
                  />
                ) : null}
              </>
            ) : null}
            <Button
              variant="contained"
              disabled={isActing || (nextStatus === 'COMPLETED' && !completionNote.trim())}
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
