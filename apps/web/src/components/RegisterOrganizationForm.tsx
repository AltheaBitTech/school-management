'use client';

import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import { resetSubmitting } from '@/lib/forms/submit-state';
import PersonOutline from '@mui/icons-material/PersonOutline';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import { FormEvent, useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { Box, Button, TextField, Alert, Grid, Typography, CircularProgress, Stack, MenuItem } from '@mui/material';
import { INSTITUTION_TYPE_OPTIONS, type InstitutionType } from '@/lib/terminology/terminology';
import Link from 'next/link';
import { ApiError } from '@/lib/api/client';
import { registrationApi } from '@/lib/api/registration.api';
import {
  isValidOrganizationCodeInput,
  normalizeOrganizationCodeInput,
} from '@/lib/organizations/organization-code';
import { validatePassword } from '@/lib/forms/validators';
import LockOutlined from '@mui/icons-material/LockOutlined';

interface FormData {
  institutionType: InstitutionType;
  organizationName: string;
  organizationCode: string;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  contactPhone?: string;
  password: string;
  confirmPassword: string;
  address?: string;
  city?: string;
  state?: string;
}

interface FormErrors {
  [key: string]: string;
}

interface RegisterOrganizationFormProps {
  onSuccess: (requestId: string) => void;
}

function SectionLabel({ icon: Icon, children }: { icon: ElementType; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5 }}>
      <Icon sx={{ fontSize: 18, color: 'primary.main' }} />
      <Typography variant="overline" sx={{ letterSpacing: '0.08em', color: 'text.secondary', lineHeight: 1.4 }}>
        {children}
      </Typography>
    </Stack>
  );
}

export function RegisterOrganizationForm({ onSuccess }: RegisterOrganizationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    institutionType: 'SCHOOL',
    organizationName: '',
    organizationCode: '',
    contactEmail: '',
    contactFirstName: '',
    contactLastName: '',
    contactPhone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    state: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizationCodeHint, setOrganizationCodeHint] = useState(
    'Suggested from your institution name — used at sign-in',
  );
  const organizationCodeEditedRef = useRef(false);

  useEffect(() => {
    const name = formData.organizationName.trim();
    if (name.length < 3) {
      return;
    }

    const timer = window.setTimeout(() => {
      void registrationApi
        .suggestOrganizationCode(
          name,
          organizationCodeEditedRef.current ? formData.organizationCode : undefined,
        )
        .then((result) => {
          if (!organizationCodeEditedRef.current) {
            setFormData((prev) => ({ ...prev, organizationCode: result.code }));
          }
          setOrganizationCodeHint(
            result.available
              ? 'Your institution sign-in code (fixed after approval). Lowercase letters, numbers, hyphens.'
              : 'That code is taken — we suggested the next available option.',
          );
        })
        .catch(() => undefined);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [formData.organizationName, formData.organizationCode]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Institution name is required';
    } else if (formData.organizationName.length < 3) {
      newErrors.organizationName = 'At least 3 characters';
    }

    const normalizedCode = normalizeOrganizationCodeInput(formData.organizationCode);
    if (!normalizedCode) {
      newErrors.organizationCode = 'Institution sign-in code is required';
    } else if (!isValidOrganizationCodeInput(normalizedCode)) {
      newErrors.organizationCode = 'Use 3–64 lowercase letters, numbers, or hyphens';
    }

    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Email is required';
    } else if (!formData.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.contactEmail = 'Invalid email format';
    }

    if (!formData.contactFirstName.trim()) {
      newErrors.contactFirstName = 'First name is required';
    } else if (formData.contactFirstName.length < 2) {
      newErrors.contactFirstName = 'At least 2 characters';
    }

    if (!formData.contactLastName.trim()) {
      newErrors.contactLastName = 'Last name is required';
    } else if (formData.contactLastName.length < 2) {
      newErrors.contactLastName = 'At least 2 characters';
    }

    const phoneDigits = formData.contactPhone?.replace(/\D/g, '') ?? '';
    if (!phoneDigits) {
      newErrors.contactPhone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(phoneDigits)) {
      newErrors.contactPhone = 'Enter a valid 10-digit mobile number';
    }

    const passwordError = validatePassword(formData.password, 'Administrator password');
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'organizationCode') {
      organizationCodeEditedRef.current = true;
    }

    const nextValue =
      name === 'contactPhone'
        ? value.replace(/\D/g, '').slice(0, 10)
        : name === 'organizationCode'
          ? value.toLowerCase().replace(/[^a-z0-9-]/g, '')
          : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (name === 'contactEmail' && globalError) {
      setGlobalError('');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setGlobalError('');

    try {
      const phoneDigits = formData.contactPhone?.replace(/\D/g, '') ?? '';
      const response = await registrationApi.submitRegistrationRequest({
        institutionType: formData.institutionType,
        organizationName: formData.organizationName.trim(),
        preferredOrganizationCode: normalizeOrganizationCodeInput(formData.organizationCode),
        contactEmail: formData.contactEmail.trim(),
        contactFirstName: formData.contactFirstName.trim(),
        contactLastName: formData.contactLastName.trim(),
        contactPhone: phoneDigits,
        password: formData.password,
        address: formData.address?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        state: formData.state?.trim() || undefined,
      });
      onSuccess(response.id);
    } catch (error: unknown) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError) {
        if (
          error.code === 'EMAIL_ALREADY_REGISTERED' ||
          error.code === 'REGISTRATION_ALREADY_PENDING'
        ) {
          setErrors(prev => ({
            ...prev,
            contactEmail: error.message,
          }));
        } else if (error.code === 'ORGANIZATION_CODE_UNAVAILABLE') {
          setErrors(prev => ({
            ...prev,
            organizationCode: error.message,
          }));
        } else {
          setGlobalError(error.message);
        }
      } else {
        setGlobalError('Failed to submit registration. Please try again.');
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}

      <SectionLabel icon={ApartmentOutlined}>Institution</SectionLabel>

      <TextField
        select
        fullWidth
        name="institutionType"
        label="Institution type"
        value={formData.institutionType}
        onChange={(event) =>
          setFormData((prev) => ({ ...prev, institutionType: event.target.value as InstitutionType }))
        }
        helperText={
          INSTITUTION_TYPE_OPTIONS.find((option) => option.value === formData.institutionType)?.hint ??
          'Sets the labels used across CampusOps'
        }
        required
      >
        {INSTITUTION_TYPE_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        fullWidth
        name="organizationName"
        label="Institution name"
        value={formData.organizationName}
        onChange={handleChange}
        error={!!errors.organizationName}
        helperText={errors.organizationName || 'Official name as it should appear in CampusOps'}
        required
      />

      <TextField
        fullWidth
        name="organizationCode"
        label="Institution sign-in code"
        value={formData.organizationCode}
        onChange={handleChange}
        error={!!errors.organizationCode}
        helperText={errors.organizationCode || organizationCodeHint}
        required
      />

      <SectionLabel icon={PersonOutline}>Contact details</SectionLabel>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            name="contactFirstName"
            label="First Name"
            value={formData.contactFirstName}
            onChange={handleChange}
            error={!!errors.contactFirstName}
            helperText={errors.contactFirstName || 'Primary contact person'}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            name="contactLastName"
            label="Last Name"
            value={formData.contactLastName}
            onChange={handleChange}
            error={!!errors.contactLastName}
            helperText={errors.contactLastName}
            required
          />
        </Grid>
      </Grid>

      <TextField
        fullWidth
        name="contactEmail"
        type="email"
        label="Email Address"
        value={formData.contactEmail}
        onChange={handleChange}
        error={!!errors.contactEmail}
        helperText={errors.contactEmail || 'We will send approval updates here'}
        required
      />

      <TextField
        fullWidth
        name="contactPhone"
        label="Phone Number"
        value={formData.contactPhone}
        onChange={handleChange}
        error={!!errors.contactPhone}
        helperText={errors.contactPhone || '10-digit mobile number (India)'}
        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 10 }}
        required
      />

      <SectionLabel icon={LockOutlined}>Administrator sign-in</SectionLabel>

      <TextField
        fullWidth
        name="password"
        type="password"
        label="Password"
        value={formData.password}
        onChange={handleChange}
        error={!!errors.password}
        helperText={errors.password || 'At least 8 characters — used to sign in after approval'}
        required
        autoComplete="new-password"
      />

      <TextField
        fullWidth
        name="confirmPassword"
        type="password"
        label="Confirm password"
        value={formData.confirmPassword}
        onChange={handleChange}
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword}
        required
        autoComplete="new-password"
      />

      <SectionLabel icon={PlaceOutlined}>Campus location</SectionLabel>

      <TextField
        fullWidth
        name="address"
        label="Address (Optional)"
        value={formData.address}
        onChange={handleChange}
        helperText="Street address or campus location"
        multiline
        rows={2}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            name="city"
            label="City (Optional)"
            value={formData.city}
            onChange={handleChange}
            helperText="City or district"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            name="state"
            label="State (Optional)"
            value={formData.state}
            onChange={handleChange}
            helperText="State or region"
          />
        </Grid>
      </Grid>

      <Button
        fullWidth
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SendOutlined />}
        sx={{ mt: 1 }}
      >
        {isSubmitting ? 'Submitting…' : 'Submit registration'}
      </Button>

      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'inherit', fontWeight: 600 }}>
          Sign in
        </Link>
      </Typography>
    </Box>
  );
}
