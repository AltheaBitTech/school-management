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
import { FormEvent, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  createComplaint,
  formatComplaintCategory,
  formatComplaintPriority,
  type ComplaintCategory,
  type ComplaintPriority,
} from '@/lib/complaints/complaints-client';

export default function NewComplaintPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('IT');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [location, setLocation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const complaint = await createComplaint({
        title,
        description,
        category,
        priority,
        location: location || undefined,
      });
      router.push(`/complaints/${complaint.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create complaint');
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
          New complaint
        </Typography>
        <Typography color="text.secondary">
          Report a maintenance issue for assignment and tracking.
        </Typography>
      </Box>

      <Stack spacing={2} maxWidth="sm">
        <TextField
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <TextField
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          multiline
          minRows={4}
          required
        />
        <TextField
          select
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value as ComplaintCategory)}
          required
        >
          {COMPLAINT_CATEGORIES.map((item) => (
            <MenuItem key={item} value={item}>
              {formatComplaintCategory(item)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as ComplaintPriority)}
          required
        >
          {COMPLAINT_PRIORITIES.map((item) => (
            <MenuItem key={item} value={item}>
              {formatComplaintPriority(item)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit complaint'}
          </Button>
          <Button component={Link} href="/complaints">
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
