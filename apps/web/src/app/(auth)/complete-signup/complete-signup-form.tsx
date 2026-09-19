'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, TextField, Alert, Typography, Box } from '@mui/material';
import { apiClient } from '@/lib/api/client';

export function CompleteSignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get('requestId');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!requestId) {
      setError('Invalid signup link');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/complete-signup', {
        registrationRequestId: requestId,
        password,
      }, { auth: false });

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to complete signup');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h5" sx={{ mb: 2, color: 'green' }}>✓ Account Created</Typography>
        <Typography sx={{ mb: 3 }}>Redirecting to login...</Typography>
      </Box>
    );
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Email"
          value={email || ''}
          disabled
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          disabled={loading}
          sx={{ mb: 3 }}
        />

        <Button
          fullWidth
          variant="contained"
          type="submit"
          disabled={loading}
          sx={{ py: 1.5 }}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
    </>
  );
}
