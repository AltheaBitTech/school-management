'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import { generateBonafideCertificate } from '@/lib/documents/documents-client';
import { getStudentDisplayName, listStudents, type Student } from '@/lib/students/students-client';

export default function GenerateDocumentPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading page" />
        </Box>
      }
    >
      <GenerateDocumentPageContent />
    </Suspense>
  );
}

function GenerateDocumentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get('studentId') ?? '';
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId),
    [students, selectedStudentId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStudents(): Promise<void> {
      setIsLoadingStudents(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listStudents({
          page: 1,
          pageSize: 100,
          status: 'ACTIVE',
        });
        if (!cancelled) {
          setStudents(response.data);
          if (preselectedStudentId && response.data.some((student) => student.id === preselectedStudentId)) {
            setSelectedStudentId(preselectedStudentId);
          } else if (response.data.length > 0) {
            setSelectedStudentId(response.data[0].id);
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load students');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStudents(false);
        }
      }
    }

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [preselectedStudentId]);

  async function handleGenerate(): Promise<void> {
    if (!selectedStudentId) {
      setErrorMessage('Select a student to generate the bonafide certificate.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const generated = await generateBonafideCertificate(selectedStudentId);
      setSuccessMessage('Bonafide certificate generated successfully.');
      router.push(`/documents/${generated.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to generate document');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1">
          Generate document
        </Typography>
        <Typography color="text.secondary">
          Generate a bonafide certificate for an active student.
        </Typography>
      </Box>

      {isLoadingStudents ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading students" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      {!isLoadingStudents && students.length === 0 ? (
        <Alert severity="info">
          No active students found. Add students before generating a bonafide certificate.
        </Alert>
      ) : null}

      {!isLoadingStudents && students.length > 0 ? (
        <Stack spacing={2} maxWidth={560}>
          <TextField select label="Document type" value="BONAFIDE_CERTIFICATE" disabled>
            <MenuItem value="BONAFIDE_CERTIFICATE">Bonafide Certificate</MenuItem>
          </TextField>

          <TextField
            select
            label="Student"
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
          >
            {students.map((student) => (
              <MenuItem key={student.id} value={student.id}>
                {getStudentDisplayName(student)} ({student.studentCode})
              </MenuItem>
            ))}
          </TextField>

          {selectedStudent ? (
            <Alert severity="info">
              Certificate will include {getStudentDisplayName(selectedStudent)} with admission number{' '}
              {selectedStudent.studentCode}
              {selectedStudent.className ? ` in class ${selectedStudent.className}` : ''}.
            </Alert>
          ) : null}

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={() => void handleGenerate()}
              disabled={isSubmitting || !selectedStudentId}
            >
              {isSubmitting ? 'Generating…' : 'Generate bonafide certificate'}
            </Button>
            <Button component={Link} href="/documents" variant="outlined">
              Cancel
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
