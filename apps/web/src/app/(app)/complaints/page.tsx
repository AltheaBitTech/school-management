'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import {
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  formatComplaintCategory,
  formatComplaintPriority,
  formatComplaintStatus,
  getStaffDisplayName,
  listComplaints,
  type Complaint,
  type ComplaintPriority,
  type ComplaintStatus,
} from '@/lib/complaints/complaints-client';
import { listStaff, type StaffMember } from '@/lib/staff/staff-client';

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ComplaintPriority | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    void listStaff({ page: 1, pageSize: 100, sortBy: 'firstName', sortOrder: 'asc' })
      .then((response) => {
        setStaff(response.data.filter((member) => member.employmentStatus !== 'OFFBOARDED'));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadComplaints(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listComplaints({
          page: 1,
          pageSize: 25,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          assignedToStaffId: assigneeFilter || undefined,
        });
        if (!cancelled) {
          setComplaints(response.data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load complaints');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadComplaints();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, priorityFilter, assigneeFilter]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Complaints"
        description="Track maintenance requests from submission through resolution."
        actions={
          <Button component={Link} href="/complaints/new" variant="contained">
            New complaint
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as ComplaintStatus | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {COMPLAINT_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {formatComplaintStatus(status)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Priority"
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value as ComplaintPriority | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All priorities</MenuItem>
          {COMPLAINT_PRIORITIES.map((priority) => (
            <MenuItem key={priority} value={priority}>
              {formatComplaintPriority(priority)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Assignee"
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All assignees</MenuItem>
          {staff.map((member) => (
            <MenuItem key={member.id} value={member.id}>
              {member.displayName || `${member.firstName} ${member.lastName}`}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading ? <LoadingState label="Loading complaints" /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && complaints.length === 0 ? (
        <EmptyState message="No complaints found for the selected filters." />
      ) : null}

      {!isLoading && complaints.length > 0 ? (
        <AppTable aria-label="Complaints">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {complaints.map((complaint) => (
              <TableRow key={complaint.id} hover>
                <TableCell>{complaint.complaintCode}</TableCell>
                <TableCell>{complaint.title}</TableCell>
                <TableCell>{formatComplaintCategory(complaint.category)}</TableCell>
                <TableCell>
                  <StatusChip
                    status={complaint.priority}
                    label={formatComplaintPriority(complaint.priority)}
                  />
                </TableCell>
                <TableCell>
                  <StatusChip
                    status={complaint.status}
                    label={formatComplaintStatus(complaint.status)}
                  />
                </TableCell>
                <TableCell>{getStaffDisplayName(complaint.assignedToStaff)}</TableCell>
                <TableCell align="right">
                  <Button component={Link} href={`/complaints/${complaint.id}`} size="small">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}
    </Stack>
  );
}
