'use client';

import Box from '@mui/material/Box';
import { resetSubmitting } from '@/lib/forms/submit-state';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import PersonPinOutlined from '@mui/icons-material/PersonPinOutlined';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import { FormEvent, useEffect, useState } from 'react';
import { VisitorPhotoCapture } from '@/components/visitors/VisitorPhotoCapture';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import {
  createVisitor,
  getVisitorHostStaffDisplayName,
  listVisitorHostStaff,
  lookupVisitorByMobile,
  type VisitorStaffSummary,
} from '@/lib/visitors/visitors-client';
import {
  INDIA_MOBILE_HELPER_TEXT,
  isValidIndiaMobile,
} from '@/lib/validation/india-mobile';

export default function NewVisitorPage() {
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [staff, setStaff] = useState<VisitorStaffSummary[]>([]);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hostStaffId, setHostStaffId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photoFileId, setPhotoFileId] = useState<string | undefined>();
  const [repeatVisitorHint, setRepeatVisitorHint] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff(): Promise<void> {
      try {
        const hosts = await listVisitorHostStaff();
        if (!cancelled) {
          setStaff(hosts);
        }
      } catch (error) {
      resetSubmitting(setIsSubmitting);
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

  const mobileError =
    mobile.trim().length > 0 && !isValidIndiaMobile(mobile) ? INDIA_MOBILE_HELPER_TEXT : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!isValidIndiaMobile(mobile)) {
      setErrorMessage(INDIA_MOBILE_HELPER_TEXT);
      return;
    }
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
        photoFileId,
      });
      showSuccess('Visitor checked in');
      router.push(`/visitors/${visitor.id}`);
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to register visitor');
      }
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Register visitor"
        description="Capture visitor details and check them in immediately."
        icon={PersonPinOutlined}
        footer={
          <FormPageFooter
            cancelHref="/visitors"
            submitLabel="Register & check in"
            submittingLabel="Submitting…"
            isSubmitting={isSubmitting}
          />
        }
      >
        <FormSection title="Visitor details" maxWidth="100%">
          <TextField
            label="Visitor name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Mobile"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            required
            fullWidth
            inputMode="tel"
            error={Boolean(mobileError)}
            helperText={mobileError ?? INDIA_MOBILE_HELPER_TEXT}
            onBlur={() => {
              if (!isValidIndiaMobile(mobile)) {
                return;
              }
              void lookupVisitorByMobile(mobile).then((profile) => {
                if (!profile) {
                  setRepeatVisitorHint(null);
                  return;
                }
                setName(profile.name);
                setOrganizationName(profile.organizationName ?? '');
                setVehicleNumber(profile.vehicleNumber ?? '');
                if (profile.hostStaffId) {
                  setHostStaffId(profile.hostStaffId);
                }
                if (profile.photoFileId) {
                  setPhotoFileId(profile.photoFileId);
                }
                setRepeatVisitorHint(
                  profile.lastVisitAt
                    ? `Returning visitor — last visit ${profile.lastVisitAt.slice(0, 10)}. Details pre-filled.`
                    : 'Returning visitor — details pre-filled.',
                );
              });
            }}
          />
          {repeatVisitorHint ? <Alert severity="info">{repeatVisitorHint}</Alert> : null}
          <TextField
            label="Organization"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            fullWidth
          />
          <TextField
            label="Vehicle number"
            value={vehicleNumber}
            onChange={(event) => setVehicleNumber(event.target.value)}
            fullWidth
          />
          <VisitorPhotoCapture photoFileId={photoFileId} onChange={setPhotoFileId} />
        </FormSection>

        <FormSection title="Visit details" maxWidth="100%">
          <TextField
            label="Purpose"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            required
            fullWidth
          />
          <TextField
            select
            label="Host staff"
            value={hostStaffId}
            onChange={(event) => setHostStaffId(event.target.value)}
            required
            fullWidth
          >
            {staff.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                {getVisitorHostStaffDisplayName(member)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </FormSection>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      </FormPageShell>
    </Box>
  );
}
