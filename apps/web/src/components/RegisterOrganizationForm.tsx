'use client';

import { FormEvent, useState } from 'react';
import { Box, Button, TextField, Alert, Grid, Typography } from '@mui/material';
import { registrationApi } from '@/lib/api/registration.api';

interface FormData {
  organizationName: string;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  contactPhone?: string;
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

export function RegisterOrganizationForm({ onSuccess }: RegisterOrganizationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    contactEmail: '',
    contactFirstName: '',
    contactLastName: '',
    contactPhone: '',
    address: '',
    city: '',
    state: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'School name is required';
    } else if (formData.organizationName.length < 3) {
      newErrors.organizationName = 'At least 3 characters';
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

    if (formData.contactPhone && !formData.contactPhone.match(/^[0-9]{10}$/)) {
      newErrors.contactPhone = 'Must be exactly 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
      const response = await registrationApi.submitRegistrationRequest(formData);
      onSuccess(response.id);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'EMAIL_ALREADY_REGISTERED') {
        setErrors(prev => ({
          ...prev,
          contactEmail: 'This email is already registered in another organization',
        }));
      } else if (err.code === 'REGISTRATION_ALREADY_PENDING') {
        setGlobalError('A registration request already exists for this email. Check your email for updates.');
      } else {
        setGlobalError(err.message || 'Failed to submit registration. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {globalError && (
        <Alert severity="error">{globalError}</Alert>
      )}

      {/* Organization Name */}
      <TextField
        fullWidth
        name="organizationName"
        label="School/Organization Name"
        placeholder="e.g., Delhi Public School"
        value={formData.organizationName}
        onChange={handleChange}
        error={!!errors.organizationName}
        helperText={errors.organizationName}
        required
      />

      {/* Contact Name - Two Columns */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            name="contactFirstName"
            label="First Name"
            placeholder="Rajesh"
            value={formData.contactFirstName}
            onChange={handleChange}
            error={!!errors.contactFirstName}
            helperText={errors.contactFirstName}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            name="contactLastName"
            label="Last Name"
            placeholder="Kumar"
            value={formData.contactLastName}
            onChange={handleChange}
            error={!!errors.contactLastName}
            helperText={errors.contactLastName}
            required
          />
        </Grid>
      </Grid>

      {/* Email */}
      <TextField
        fullWidth
        name="contactEmail"
        type="email"
        label="Email Address"
        placeholder="principal@school.edu"
        value={formData.contactEmail}
        onChange={handleChange}
        error={!!errors.contactEmail}
        helperText={errors.contactEmail}
        required
      />

      {/* Phone */}
      <TextField
        fullWidth
        name="contactPhone"
        label="Phone Number (Optional)"
        placeholder="9876543210"
        value={formData.contactPhone}
        onChange={handleChange}
        error={!!errors.contactPhone}
        helperText={errors.contactPhone}
      />

      {/* Address */}
      <TextField
        fullWidth
        name="address"
        label="Address (Optional)"
        placeholder="Plot 123, Main Street"
        value={formData.address}
        onChange={handleChange}
        multiline
        rows={2}
      />

      {/* City & State */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            name="city"
            label="City (Optional)"
            placeholder="Delhi"
            value={formData.city}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            name="state"
            label="State (Optional)"
            placeholder="Delhi"
            value={formData.state}
            onChange={handleChange}
          />
        </Grid>
      </Grid>

      {/* Submit Button */}
      <Button
        fullWidth
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        sx={{ mt: 2 }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Registration'}
      </Button>

      <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>
        By submitting, you agree to our Terms of Service and Privacy Policy
      </Typography>
    </Box>
  );
}
