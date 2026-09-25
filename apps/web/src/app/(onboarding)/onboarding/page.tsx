'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { FormActions, FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { listOrganizationRoles, type OrganizationRole } from '@/lib/rbac/roles-client';
import {
  finishOnboarding,
  getOnboardingState,
  updateOnboardingSetup,
  type OnboardingState,
} from '@/lib/onboarding/onboarding-client';
import {
  createStaff,
  getStaffDisplayName,
  provisionStaffLogin,
  type StaffMember,
} from '@/lib/staff/staff-client';

const TIMEZONE_OPTIONS = ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York'];

type OnboardingStep = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [roles, setRoles] = useState<OrganizationRole[]>([]);
  const [createdStaff, setCreatedStaff] = useState<StaffMember[]>([]);
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const onboardingState = await getOnboardingState();
        const roleList = await listOrganizationRoles();
        if (!cancelled) {
          setState(onboardingState);
          setOrganizationName(onboardingState.organizationName);
          setTimezone(onboardingState.timezone);
          setRoles(roleList.filter((role) => role.code !== 'SAAS_SUPER_ADMIN'));
          setRoleId(roleList.find((role) => role.code === 'SCHOOL_ADMIN')?.id ?? roleList[0]?.id ?? '');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load onboarding');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSchoolSetupSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const updated = await updateOnboardingSetup({
        organizationName,
        timezone,
      });
      setState(updated);
      setStep(2);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save school setup');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddStaff(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const staff = await createStaff({
        employeeCode,
        firstName,
        lastName,
        email: staffEmail || undefined,
      });

      if (staffEmail && staffPassword && roleId) {
        await provisionStaffLogin(staff.id, {
          email: staffEmail,
          password: staffPassword,
          roleId,
        });
      }

      setCreatedStaff((current) => [...current, staff]);
      setEmployeeCode('');
      setFirstName('');
      setLastName('');
      setStaffEmail('');
      setStaffPassword('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add staff member');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish(): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await finishOnboarding();
      router.push('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to finish onboarding');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading onboarding" />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Welcome to CampusOps"
        description="Complete a quick setup so your school can start using attendance, staff, leave, and daily operations."
      />

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {step === 1 ? (
        <Box component="form" onSubmit={handleSchoolSetupSubmit}>
          <Stack spacing={2}>
            <FormSection title="School Setup">
              <TextField
                label="School name"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                required
                fullWidth
              />
              <TextField
                select
                label="Timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                required
                fullWidth
              >
                {TIMEZONE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="body2" color="text.secondary">
                Organization code: <strong>{state?.organizationCode}</strong>
              </Typography>
            </FormSection>
            <FormActions>
              <Button type="submit" variant="contained" disabled={submitting}>
                Continue
              </Button>
            </FormActions>
          </Stack>
        </Box>
      ) : null}

      {step === 2 ? (
        <Stack spacing={2}>
          <FormSection title="Initial Staff (Optional)">
            <Typography variant="body2" color="text.secondary">
              Add your first staff member now, or skip and do this later from the Staff module.
            </Typography>
            <Box component="form" onSubmit={handleAddStaff}>
              <Stack spacing={2}>
                <TextField
                  label="Employee code"
                  value={employeeCode}
                  onChange={(event) => setEmployeeCode(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Login email"
                  type="email"
                  value={staffEmail}
                  onChange={(event) => setStaffEmail(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Temporary password"
                  type="password"
                  value={staffPassword}
                  onChange={(event) => setStaffPassword(event.target.value)}
                  fullWidth
                />
                <TextField
                  select
                  label="Role"
                  value={roleId}
                  onChange={(event) => setRoleId(event.target.value)}
                  fullWidth
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </TextField>
                <FormActions>
                  <Button type="submit" variant="outlined" disabled={submitting}>
                    Add staff member
                  </Button>
                </FormActions>
              </Stack>
            </Box>
            {createdStaff.length > 0 ? (
              <Stack spacing={0.5}>
                {createdStaff.map((staff) => (
                  <Typography key={staff.id} variant="body2">
                    Added: {getStaffDisplayName(staff)} ({staff.employeeCode})
                  </Typography>
                ))}
              </Stack>
            ) : null}
          </FormSection>
          <FormActions>
            <Button variant="text" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="outlined" onClick={() => setStep(3)}>
              Skip for now
            </Button>
            <Button variant="contained" onClick={() => setStep(3)}>
              Continue
            </Button>
          </FormActions>
        </Stack>
      ) : null}

      {step === 3 ? (
        <Stack spacing={2}>
          <FormSection title="You&apos;re ready">
            <Typography variant="body1">
              <strong>{state?.organizationName}</strong> is configured with timezone{' '}
              <strong>{state?.timezone}</strong>.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {createdStaff.length > 0
                ? `${createdStaff.length} staff member(s) added during setup.`
                : 'You can add staff, students, and departments from the dashboard.'}
            </Typography>
          </FormSection>
          <FormActions>
            <Button variant="text" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button variant="contained" onClick={() => void handleFinish()} disabled={submitting}>
              Finish Setup
            </Button>
          </FormActions>
        </Stack>
      ) : null}
    </Stack>
  );
}
