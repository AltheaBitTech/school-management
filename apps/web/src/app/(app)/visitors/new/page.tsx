'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';
import { createVisitor } from '@/lib/visitors/visitors-client';

export default function NewVisitorPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hostStaffId, setHostStaffId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff(): Promise<void> {
      try {
        const response = await listStaff({
          page: 1,
          pageSize: 100,
          sortBy: 'firstName',
          sortOrder: 'asc',
          employmentStatus: 'ACTIVE',
        });
        if (!cancelled) {
          setStaff(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load staff');
        }
      }
    }

    void loadStaff();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const visitor = await createVisitor({
        name,
        mobile,
        organizationName: organizationName || undefined,
        vehicleNumber: vehicleNumber || undefined,
        purpose,
        hostStaffId,
        remarks: remarks || undefined,
      });
      router.push(`/visitors/${visitor.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to register visitor');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <Box>
        <Typography variant="h4" component="h1">
          Register visitor
        </Typography>
        <Typography color="text.secondary">
          Capture visitor details and check them in immediately.
        </Typography>
      </Box>

      <Stack spacing={2} maxWidth="sm">
        <TextField
          label="Visitor name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <TextField
          label="Mobile"
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
          required
        />
        <TextField
          label="Organization"
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
        />
        <TextField
          label="Vehicle number"
          value={vehicleNumber}
          onChange={(event) => setVehicleNumber(event.target.value)}
        />
        <TextField
          label="Purpose"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          required
        />
        <TextField
          select
          label="Host staff"
          value={hostStaffId}
          onChange={(event) => setHostStaffId(event.target.value)}
          required
        >
          {staff.map((member) => (
            <MenuItem key={member.id} value={member.id}>
              {getStaffDisplayName(member)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Remarks"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          multiline
          minRows={2}
        />

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Register & Check In'}
          </Button>
          <Button component={Link} href="/visitors">
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
