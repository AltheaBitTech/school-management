'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, CircularProgress, Box } from '@mui/material';
import { apiClient } from '@/lib/api/client';

interface RegistrationRequest {
  id: string;
  organizationName: string;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  status: string;
  createdAt: string;
}

export default function RegistrationsPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<RegistrationRequest[]>('/public/organizations/admin/requests', { auth: true });
      setRequests(data);
    } catch {
      setError('Failed to load registration requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiClient.post(`/public/organizations/admin/requests/${id}/approve`, {}, { auth: true });
      await loadRequests();
    } catch {
      setError('Failed to approve request');
    }
  };

  const handleOpenReject = (id: string) => {
    setSelectedId(id);
    setRejectionReason('');
    setDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedId) return;
    try {
      await apiClient.post(`/public/organizations/admin/requests/${selectedId}/reject`, { reason: rejectionReason }, { auth: true });
      setDialogOpen(false);
      await loadRequests();
    } catch {
      setError('Failed to reject request');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <h1>Pending Registration Requests</h1>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
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
                    <Button size="small" variant="contained" onClick={() => handleApprove(req.id)} sx={{ mr: 1 }}>
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
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
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
