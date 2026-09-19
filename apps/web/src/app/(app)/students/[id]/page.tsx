'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import {
  formatStudentDate,
  formatStudentStatus,
  getStudent,
  getStudentDisplayName,
  type Student,
} from '@/lib/students/students-client';

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStudent(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      setIsNotFound(false);

      try {
        const loaded = await getStudent(params.id);
        if (!cancelled) {
          setStudent(loaded);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else if (error instanceof ApiError && error.statusCode === 404) {
          setIsNotFound(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load student');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStudent();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isNotFound) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">Student not found.</Alert>
        <Button component={Link} href="/students" variant="outlined">
          Back to students
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Student details
          </Typography>
          <Typography color="text.secondary">
            View student information and continue to document generation.
          </Typography>
        </Box>
        <Button component={Link} href="/students" variant="outlined">
          Back to students
        </Button>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading student" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && student ? (
        <Stack spacing={2} maxWidth={640}>
          <Typography>
            <strong>Student code:</strong> {student.studentCode}
          </Typography>
          <Typography>
            <strong>Name:</strong> {getStudentDisplayName(student)}
          </Typography>
          <Typography>
            <strong>Class:</strong> {student.className || '—'}
          </Typography>
          <Typography component="div">
            <strong>Status:</strong>{' '}
            <StatusChip
              status={student.status}
              label={formatStudentStatus(student.status)}
            />
          </Typography>
          <Typography>
            <strong>Created:</strong> {formatStudentDate(student.createdAt)}
          </Typography>

          {student.status === 'ACTIVE' ? (
            <Button
              component={Link}
              href={`/documents/generate?studentId=${student.id}`}
              variant="contained"
            >
              Generate bonafide certificate
            </Button>
          ) : (
            <Alert severity="info">
              Only active students can be used for bonafide certificate generation.
            </Alert>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
