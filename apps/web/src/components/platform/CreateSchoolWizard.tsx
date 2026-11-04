'use client';

import DomainAddOutlined from '@mui/icons-material/DomainAddOutlined';
import { resetSubmitting } from '@/lib/forms/submit-state';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FormEvent, useMemo, useState } from 'react';
import { FormActions } from '@/components/forms/FormActions';
import { FormRequiredLegend } from '@/components/forms/FormRequiredLegend';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { FormSection } from '@/components/ui/FormSection';
import { ApiError } from '@/lib/api/client';
import { login } from '@/lib/auth/auth-client';
import {
  mapApiErrorMessage,
  trimToEmpty,
  validateEmail,
  validateOptionalPinCode,
  validateOptionalUrl,
  validateOrganizationCode,
  validateOrganizationName,
  validatePassword,
} from '@/lib/forms/validators';
import { normalizeOrganizationCodeInput } from '@/lib/organizations/organization-code';
import { bootstrapOrganization } from '@/lib/organizations/organizations-client';

const STEPS = ['School details', 'Address (optional)', 'School administrator', 'Review & create'] as const;

interface WizardFormState {
  platformEmail: string;
  platformPassword: string;
  schoolName: string;
  schoolCode: string;
  addressLine: string;
  city: string;
  state: string;
  pinCode: string;
  website: string;
  adminEmail: string;
  adminPassword: string;
}

type FieldKey = keyof WizardFormState;

const INITIAL_STATE: WizardFormState = {
  platformEmail: '',
  platformPassword: '',
  schoolName: '',
  schoolCode: '',
  addressLine: '',
  city: '',
  state: '',
  pinCode: '',
  website: '',
  adminEmail: '',
  adminPassword: '',
};

function validateStep(step: number, values: WizardFormState): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};

  if (step === 0) {
    const nameError = validateOrganizationName(values.schoolName);
    if (nameError) {
      errors.schoolName = nameError;
    }
    const codeError = validateOrganizationCode(values.schoolCode);
    if (codeError) {
      errors.schoolCode = codeError;
    }
  }

  if (step === 1) {
    const pinError = validateOptionalPinCode(values.pinCode);
    if (pinError) {
      errors.pinCode = pinError;
    }
    const urlError = validateOptionalUrl(values.website);
    if (urlError) {
      errors.website = urlError;
    }
  }

  if (step === 2) {
    const platformEmailError = validateEmail(values.platformEmail);
    if (platformEmailError) {
      errors.platformEmail = platformEmailError;
    }
    const platformPasswordError = validatePassword(values.platformPassword, 'Platform password');
    if (platformPasswordError) {
      errors.platformPassword = platformPasswordError;
    }
    const adminEmailError = validateEmail(values.adminEmail);
    if (adminEmailError) {
      errors.adminEmail = adminEmailError;
    }
    const adminPasswordError = validatePassword(values.adminPassword, 'Admin password');
    if (adminPasswordError) {
      errors.adminPassword = adminPasswordError;
    }
  }

  if (step === 3) {
    return validateStep(0, values);
  }

  return errors;
}

export function CreateSchoolWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<WizardFormState>(INITIAL_STATE);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedCode = useMemo(
    () => normalizeOrganizationCodeInput(values.schoolCode),
    [values.schoolCode],
  );

  function updateField(key: FieldKey, nextValue: string): void {
    setValues((current) => ({ ...current, [key]: nextValue }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  function markTouched(key: FieldKey): void {
    setTouched((current) => ({ ...current, [key]: true }));
    const stepErrors = validateStep(activeStep, values);
    if (stepErrors[key]) {
      setFieldErrors((current) => ({ ...current, [key]: stepErrors[key] }));
    }
  }

  function handleNext(): void {
    const stepErrors = validateStep(activeStep, values);
    setFieldErrors(stepErrors);
    setTouched(Object.fromEntries(Object.keys(values).map((key) => [key, true])) as Partial<
      Record<FieldKey, boolean>
    >);

    if (Object.keys(stepErrors).length > 0) {
      return;
    }

    setGlobalError(null);
    setActiveStep((step) => Math.min(step + 1, STEPS.length - 1));
  }

  function handleBack(): void {
    setGlobalError(null);
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (activeStep !== STEPS.length - 1) {
      handleNext();
      return;
    }

    const submissionErrors = {
      ...validateStep(0, values),
      ...validateStep(2, values),
    };
    setFieldErrors(submissionErrors);
    if (Object.keys(submissionErrors).length > 0) {
      return;
    }

    setGlobalError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        email: trimToEmpty(values.platformEmail),
        password: values.platformPassword,
      });

      const result = await bootstrapOrganization({
        name: trimToEmpty(values.schoolName),
        code: normalizedCode,
        admin: {
          email: trimToEmpty(values.adminEmail),
          password: values.adminPassword,
        },
      });

      setSuccessMessage(
        `Created ${result.organization.name} (${result.organization.code}). School admin: ${result.admin.email}`,
      );
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      const message = mapApiErrorMessage(error, 'Organization bootstrap failed');
      setGlobalError(error instanceof ApiError ? message : message);
    }
  }

  return (
    <FormPageShell
      title="Create school organization"
      description="Provision a new tenant and its initial School Admin in a guided flow. Address fields are optional and kept for your review only until organization settings support them in the API."
      icon={DomainAddOutlined}
      maxWidth={760}
    >
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 1 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <FormRequiredLegend />

      {globalError ? <Alert severity="error">{globalError}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <Box component="form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Stack spacing={3}>
          {activeStep === 0 ? (
            <FormSection title="School details">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="School name *"
                    value={values.schoolName}
                    onChange={(event) => updateField('schoolName', event.target.value)}
                    onBlur={() => markTouched('schoolName')}
                    required
                    fullWidth
                    variant="filled"
                    error={Boolean(touched.schoolName && fieldErrors.schoolName)}
                    helperText={
                      touched.schoolName && fieldErrors.schoolName
                        ? fieldErrors.schoolName
                        : 'Official name shown to administrators'
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Organization code *"
                    value={values.schoolCode}
                    onChange={(event) => updateField('schoolCode', event.target.value)}
                    onBlur={() => {
                      updateField('schoolCode', normalizeOrganizationCodeInput(values.schoolCode));
                      markTouched('schoolCode');
                    }}
                    required
                    fullWidth
                    variant="filled"
                    error={Boolean(touched.schoolCode && fieldErrors.schoolCode)}
                    helperText={
                      touched.schoolCode && fieldErrors.schoolCode
                        ? fieldErrors.schoolCode
                        : 'Lowercase letters, numbers, hyphens (3–64). Used at sign-in.'
                    }
                  />
                </Grid>
              </Grid>
            </FormSection>
          ) : null}

          {activeStep === 1 ? (
            <FormSection title="Address (optional)">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                These fields help you confirm location details during onboarding. They are not sent to the bootstrap
                API yet.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Address"
                    value={values.addressLine}
                    onChange={(event) => updateField('addressLine', event.target.value)}
                    fullWidth
                    variant="filled"
                    multiline
                    minRows={2}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="City"
                    value={values.city}
                    onChange={(event) => updateField('city', event.target.value)}
                    fullWidth
                    variant="filled"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="State"
                    value={values.state}
                    onChange={(event) => updateField('state', event.target.value)}
                    fullWidth
                    variant="filled"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="PIN code"
                    value={values.pinCode}
                    onChange={(event) => updateField('pinCode', event.target.value)}
                    onBlur={() => markTouched('pinCode')}
                    fullWidth
                    variant="filled"
                    error={Boolean(touched.pinCode && fieldErrors.pinCode)}
                    helperText={touched.pinCode && fieldErrors.pinCode ? fieldErrors.pinCode : '6-digit postal code'}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Website"
                    value={values.website}
                    onChange={(event) => updateField('website', event.target.value)}
                    onBlur={() => markTouched('website')}
                    fullWidth
                    variant="filled"
                    error={Boolean(touched.website && fieldErrors.website)}
                    helperText={touched.website && fieldErrors.website ? fieldErrors.website : 'https://…'}
                  />
                </Grid>
              </Grid>
            </FormSection>
          ) : null}

          {activeStep === 2 ? (
            <Stack spacing={2.5}>
              <FormSection title="Platform administrator">
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Platform admin email *"
                      type="email"
                      value={values.platformEmail}
                      onChange={(event) => updateField('platformEmail', event.target.value)}
                      onBlur={() => markTouched('platformEmail')}
                      required
                      fullWidth
                      variant="filled"
                      error={Boolean(touched.platformEmail && fieldErrors.platformEmail)}
                      helperText={touched.platformEmail && fieldErrors.platformEmail ? fieldErrors.platformEmail : ' '}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Platform admin password *"
                      type="password"
                      value={values.platformPassword}
                      onChange={(event) => updateField('platformPassword', event.target.value)}
                      onBlur={() => markTouched('platformPassword')}
                      required
                      fullWidth
                      variant="filled"
                      error={Boolean(touched.platformPassword && fieldErrors.platformPassword)}
                      helperText={
                        touched.platformPassword && fieldErrors.platformPassword
                          ? fieldErrors.platformPassword
                          : 'Used once to authorize bootstrap'
                      }
                    />
                  </Grid>
                </Grid>
              </FormSection>

              <FormSection title="Initial School Admin">
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Initial admin email *"
                      type="email"
                      value={values.adminEmail}
                      onChange={(event) => updateField('adminEmail', event.target.value)}
                      onBlur={() => markTouched('adminEmail')}
                      required
                      fullWidth
                      variant="filled"
                      error={Boolean(touched.adminEmail && fieldErrors.adminEmail)}
                      helperText={touched.adminEmail && fieldErrors.adminEmail ? fieldErrors.adminEmail : ' '}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Initial admin password *"
                      type="password"
                      value={values.adminPassword}
                      onChange={(event) => updateField('adminPassword', event.target.value)}
                      onBlur={() => markTouched('adminPassword')}
                      required
                      fullWidth
                      variant="filled"
                      error={Boolean(touched.adminPassword && fieldErrors.adminPassword)}
                      helperText={
                        touched.adminPassword && fieldErrors.adminPassword
                          ? fieldErrors.adminPassword
                          : 'Minimum 8 characters'
                      }
                    />
                  </Grid>
                </Grid>
              </FormSection>
            </Stack>
          ) : null}

          {activeStep === 3 ? (
            <FormSection title="Review">
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>School:</strong> {trimToEmpty(values.schoolName) || '—'} ({normalizedCode || '—'})
                </Typography>
                <Typography variant="body2">
                  <strong>Address note:</strong>{' '}
                  {[values.addressLine, values.city, values.state, values.pinCode].filter(Boolean).join(', ') ||
                    'Not captured in API'}
                </Typography>
                {values.website ? (
                  <Typography variant="body2">
                    <strong>Website:</strong> {values.website}
                  </Typography>
                ) : null}
                <Typography variant="body2">
                  <strong>Initial admin:</strong> {trimToEmpty(values.adminEmail) || '—'}
                </Typography>
              </Stack>
            </FormSection>
          ) : null}

          <FormActions
            submitLabel={activeStep === STEPS.length - 1 ? 'Create organization' : 'Continue'}
            onCancel={activeStep > 0 ? handleBack : undefined}
            cancelLabel="Back"
            isSubmitting={isSubmitting}
          />
        </Stack>
      </Box>
    </FormPageShell>
  );
}
