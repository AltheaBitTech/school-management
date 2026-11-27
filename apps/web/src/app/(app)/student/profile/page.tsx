'use client';

import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import {
  StudentPortalPageShell,
  StudentPortalSection,
} from '@/components/ui/StudentPortalPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import {
  formatStudentClassLabel,
  formatStudentDate,
  formatStudentStatus,
  getStudentDisplayName,
} from '@/lib/students/students-client';
import {
  downloadStudentSelfDocument,
  generateStudentSelfBonafide,
  generateStudentSelfIdCard,
  getStudentSelfProfile,
  openStudentSelfDocument,
} from '@/lib/student-self/student-self-client';
import type { Student } from '@/lib/students/students-client';
import { useTerminology } from '@/lib/terminology/use-terminology';

export default function StudentSelfProfilePage() {
  const { user } = useAuthSession();
  const t = useTerminology();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<'bonafide' | 'idCard' | null>(null);
  const [lastDocument, setLastDocument] = useState<{ id: string; label: string } | null>(null);
  const isGeneratingCertificate = generating !== null;

  function generate(kind: 'bonafide' | 'idCard'): void {
    setCertificateError(null);
    setLastDocument(null);
    setGenerating(kind);
    const label = kind === 'idCard' ? 'ID card' : 'Bonafide certificate';
    const request = kind === 'idCard' ? generateStudentSelfIdCard() : generateStudentSelfBonafide();
    void request
      .then((document) => setLastDocument({ id: document.id, label }))
      .catch((error) =>
        setCertificateError(error instanceof Error ? error.message : `Failed to generate ${label}`),
      )
      .finally(() => setGenerating(null));
  }

  function showDocumentError(error: unknown): void {
    setCertificateError(error instanceof Error ? error.message : 'Failed to open document');
  }

  const canDownloadCertificate = user?.permissions?.includes('student.self.certificate.download');

  useEffect(() => {
    void getStudentSelfProfile()
      .then(setStudent)
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load profile');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return (
      <StudentPortalPageShell title="My profile" description="Your student information (read-only).">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading profile" />
        </Box>
      </StudentPortalPageShell>
    );
  }

  if (!student) {
    return (
      <StudentPortalPageShell title="My profile" description="Your student information (read-only).">
        <Alert severity="error">{errorMessage ?? 'Profile is unavailable'}</Alert>
      </StudentPortalPageShell>
    );
  }

  return (
    <StudentPortalPageShell title="My profile" description="Your student information (read-only).">
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        <Button component={Link} href="/student/fees" variant="contained" startIcon={<ReceiptLongOutlined />}>
          My fees
        </Button>
        <Button component={Link} href="/notices" variant="outlined" startIcon={<AnnouncementOutlined />}>
          Notices
        </Button>
      </Stack>
      <StudentPortalSection>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={600}>
            {getStudentDisplayName(student)}
          </Typography>
          <Typography>
            <strong>Admission number:</strong> {student.studentCode}
          </Typography>
          <Typography>
            <strong>{t.unit}:</strong> {formatStudentClassLabel(student)}
          </Typography>
          {student.section ? (
            <Typography>
              <strong>{t.group}:</strong> {student.section}
            </Typography>
          ) : null}
          {student.rollNumber ? (
            <Typography>
              <strong>Roll number:</strong> {student.rollNumber}
            </Typography>
          ) : null}
          {student.academicYear ? (
            <Typography>
              <strong>Academic year:</strong> {student.academicYear}
            </Typography>
          ) : null}
          <Typography component="div">
            <strong>Status:</strong>{' '}
            <StatusChip status={student.status} label={formatStudentStatus(student.status)} />
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Record created {formatStudentDate(student.createdAt)}
          </Typography>
        </Stack>
      </StudentPortalSection>

      {canDownloadCertificate ? (
        <StudentPortalSection title="Certificates">
          <Stack spacing={1.5}>
            <Typography color="text.secondary" variant="body2">
              Generate your ID card or a bonafide certificate as a PDF.
            </Typography>
            {certificateError ? <Alert severity="error">{certificateError}</Alert> : null}
            {lastDocument ? (
              <Alert
                severity="success"
                action={
                  <Stack direction="row" spacing={1}>
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => void openStudentSelfDocument(lastDocument.id).catch(showDocumentError)}
                    >
                      View
                    </Button>
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => void downloadStudentSelfDocument(lastDocument.id).catch(showDocumentError)}
                    >
                      Download
                    </Button>
                  </Stack>
                }
              >
                {lastDocument.label} ready.
              </Alert>
            ) : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="contained" disabled={isGeneratingCertificate} onClick={() => generate('bonafide')}>
                {generating === 'bonafide' ? 'Generating…' : 'Generate bonafide certificate'}
              </Button>
              <Button variant="outlined" disabled={isGeneratingCertificate} onClick={() => generate('idCard')}>
                {generating === 'idCard' ? 'Generating…' : 'Generate ID card'}
              </Button>
            </Stack>
          </Stack>
        </StudentPortalSection>
      ) : null}

      {student.guardianName || student.guardianPhone ? (
        <StudentPortalSection title="Guardian details">
          <Stack spacing={1.5}>
            <Typography>
              <strong>Name:</strong> {student.guardianName || '—'}
            </Typography>
            <Typography>
              <strong>Phone:</strong> {student.guardianPhone || '—'}
            </Typography>
          </Stack>
        </StudentPortalSection>
      ) : null}
    </StudentPortalPageShell>
  );
}
