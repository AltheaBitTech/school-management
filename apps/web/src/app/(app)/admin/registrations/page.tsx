'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { PageHeader } from '@/components/ui/PageHeader';
import { isForbiddenError } from '@/lib/auth/auth-client';
import { validateRequiredMaxLength } from '@/lib/forms/validators';

interface RegistrationRequest {
  id: string;
  organizationName: string;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  status: string;
  createdAt: string;
}

interface ApproveRegistrationResponse {
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  adminUserId: string;
  adminEmail: string;
  signupPreCompleted: boolean;
  loginUrl: string;
  completeSignupUrl?: string;
}

function CreateSchoolLink() {
  return (
    <Button component={Link} href="/organizations/new" variant="contained">
      Create school
    </Button>
  );
}

export default function RegistrationsPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approvalResult, setApprovalResult] = useState<ApproveRegistrationResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setForbidden(false);
      setError('');
      const data = await apiClient.get<RegistrationRequest[]>('/public/organizations/admin/requests', { auth: true });
      setRequests(data);
    } catch (err) {
      if (isForbiddenError(err)) {
        setForbidden(true);
        return;
      }
      setError('Failed to load registration requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setError('');
      const result = await apiClient.post<ApproveRegistrationResponse>(
        `/public/organizations/admin/requests/${id}/approve`,
        {},
        { auth: true },
      );
      setApprovalResult(result);
      await loadRequests();
    } catch (err) {
      if (isForbiddenError(err)) {
        setForbidden(true);
        return;
      }
      setError('Failed to approve request');
    }
  };

  const handleOpenReject = (id: string) => {
    setSelectedId(id);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedId) {
      return;
    }
    const reasonProblem = validateRequiredMaxLength(rejectionReason, 'Reason', 1000);
    if (reasonProblem) {
      setError(reasonProblem);
      return;
    }

    try {
      setError('');
      await apiClient.post(
        `/public/organizations/admin/requests/${selectedId}/reject`,
        { reason: rejectionReason.trim() },
        { auth: true },
      );
      setRejectDialogOpen(false);
      await loadRequests();
    } catch (err) {
      if (isForbiddenError(err)) {
        setForbidden(true);
        return;
      }
      setError('Failed to reject request');
    }
  };

  if (loading) {
    return (
      <Stack spacing={3}>
        <PageHeader
          title="Pending registration requests"
          description="Schools waiting for platform approval."
          actions={<CreateSchoolLink />}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading registration requests" />
        </Box>
      </Stack>
    );
  }

  if (forbidden) {
    return <ForbiddenState message="You do not have permission to manage organization registrations." />;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Pending registration requests"
        description="Schools waiting for platform approval."
        actions={<CreateSchoolLink />}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          {requests.length === 0 ? (
            <Typography color="text.secondary">No pending registration requests.</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell>School Name</TableCell>
                  <TableCell>Contact Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell>{req.organizationName}</TableCell>
                    <TableCell>{req.contactFirstName} {req.contactLastName}</TableCell>
                    <TableCell>{req.contactEmail}</TableCell>
                    <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="small" variant="contained" onClick={() => void handleApprove(req.id)} sx={{ mr: 1 }}>
                        Approve
                      </Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleOpenReject(req.id)}>
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Registration</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Reason for rejection"
            multiline
            rows={3}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            inputProps={{ maxLength: 1000 }}
            helperText="Required. Up to 1000 characters."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => void handleReject()} variant="contained" color="error" disabled={!rejectionReason.trim()}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(approvalResult)} onClose={() => setApprovalResult(null)} maxWidth="md" fullWidth>
        <DialogTitle>Registration Approved</DialogTitle>
        <DialogContent>
          {approvalResult ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography>
                <strong>{approvalResult.organizationName}</strong> has been approved.
              </Typography>
              <Alert severity="success">
                Organization code: <strong>{approvalResult.organizationCode}</strong>
              </Alert>
              {approvalResult.signupPreCompleted ? (
                <>
                  <Alert severity="info">
                    The applicant set their administrator password during registration. They can sign in with organization
                    code, email, and that password — no extra signup step.
                  </Alert>
                  <TextField
                    fullWidth
                    label="Sign-in page (optional reference)"
                    value={approvalResult.loginUrl}
                    InputProps={{ readOnly: true }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    An approval email was sent to {approvalResult.adminEmail} when email delivery is configured. You do
                    not need to share a complete-signup link.
                  </Typography>
                </>
              ) : (
                <>
                  <TextField
                    fullWidth
                    label="Complete signup link (legacy)"
                    value={approvalResult.completeSignupUrl ?? ''}
                    InputProps={{ readOnly: true }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    This request has no registration password on file. Share the signup link with {approvalResult.adminEmail}{' '}
                    so they can set a password. An approval email was also sent when email delivery is configured.
                  </Typography>
                </>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalResult(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
