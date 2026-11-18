'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useOptionalAuthSession } from '@/components/providers/AuthSessionProvider';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormActions } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { FormSection } from '@/components/ui/FormSection';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import { ApiError } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';
import {
  DOCUMENT_TEMPLATE_OPTIONS,
  documentTemplatesForPermissions,
  downloadGeneratedDocument,
  generateDocument,
  listDocumentSubjects,
  usesLimitedDocumentSubjects,
  type DocumentSubject,
  type DocumentTemplateOption,
  type DocumentType,
} from '@/lib/documents/documents-client';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';
import { getStudentDisplayName, listStudents, type Student } from '@/lib/students/students-client';
import { listVisitors, type Visitor } from '@/lib/visitors/visitors-client';

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
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get('studentId') ?? '';
  const { showSuccess } = useAppSnackbar();
  const session = useOptionalAuthSession();
  const templates = useMemo(() => {
    if (!session) {
      return DOCUMENT_TEMPLATE_OPTIONS;
    }
    if (!session.isReady || !session.user) {
      return [];
    }
    return documentTemplatesForPermissions(session.user.permissions);
  }, [session]);

  const [selectedType, setSelectedType] = useState<DocumentType>('BONAFIDE_CERTIFICATE');
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<DocumentSubject[]>([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [debouncedSubjectSearch, setDebouncedSubjectSearch] = useState('');
  const [subjectPage, setSubjectPage] = useState(1);
  const [subjectMeta, setSubjectMeta] = useState<PaginationMeta | null>(null);
  const [usingSubjectLookup, setUsingSubjectLookup] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [conduct, setConduct] = useState('Good');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryMonth, setSalaryMonth] = useState('');
  const [relievingReason, setRelievingReason] = useState('');
  const [leavingDate, setLeavingDate] = useState('');
  const [isLoadingOwners, setIsLoadingOwners] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [generatedDocumentId, setGeneratedDocumentId] = useState<string | null>(null);

  const activeType = templates.some((option) => option.type === selectedType)
    ? selectedType
    : templates[0]?.type;
  const selectedTemplate = useMemo(
    () => templates.find((option) => option.type === activeType),
    [activeType, templates],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSubjectSearch(subjectSearch), 300);
    return () => window.clearTimeout(timer);
  }, [subjectSearch]);

  useEffect(() => {
    setSubjectPage(1);
  }, [debouncedSubjectSearch, activeType]);

  useEffect(() => {
    if (!selectedTemplate || !session?.user) {
      return;
    }

    const limitedLookup = usesLimitedDocumentSubjects(
      session.user.permissions,
      selectedTemplate.ownerType,
    );
    if (!limitedLookup) {
      return;
    }

    let cancelled = false;
    const ownerType = selectedTemplate.ownerType;

    async function loadSubjects(): Promise<void> {
      setIsLoadingOwners(true);
      setErrorMessage(null);

      try {
        const response = await listDocumentSubjects({
          ownerType,
          page: subjectPage,
          pageSize: 25,
          search: debouncedSubjectSearch,
        });
        if (cancelled) {
          return;
        }
        setUsingSubjectLookup(true);
        setSubjectMeta(response.meta);
        setSubjectOptions((current) =>
          subjectPage === 1 ? response.data : [...current, ...response.data],
        );
        if (subjectPage === 1) {
          const defaultId =
            preselectedStudentId && response.data.some((item) => item.id === preselectedStudentId)
              ? preselectedStudentId
              : (response.data[0]?.id ?? '');
          setOwnerId(defaultId);
        }
      } catch (error) {
        if (!cancelled) {
          setSubjectOptions([]);
          setSubjectMeta(null);
          setOwnerId('');
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load document subjects');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOwners(false);
        }
      }
    }

    void loadSubjects();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSubjectSearch,
    preselectedStudentId,
    selectedTemplate,
    session?.user,
    subjectPage,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadOwners(): Promise<void> {
      if (!selectedTemplate) {
        setIsLoadingOwners(false);
        return;
      }

      const limitedLookup = Boolean(
        session?.user &&
          usesLimitedDocumentSubjects(session.user.permissions, selectedTemplate.ownerType),
      );
      if (limitedLookup) {
        setStudents([]);
        setStaff([]);
        setVisitors([]);
        return;
      }

      setUsingSubjectLookup(false);
      setSubjectOptions([]);
      setSubjectMeta(null);
      setIsLoadingOwners(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        if (!cancelled) {
          setUsingSubjectLookup(false);
          setSubjectOptions([]);
        }

        if (selectedTemplate?.ownerType === 'STUDENT') {
          const response = await listStudents({ page: 1, pageSize: 100, status: 'ACTIVE' });
          if (!cancelled) {
            setStudents(response.data);
            setStaff([]);
            setVisitors([]);
            const defaultId =
              preselectedStudentId && response.data.some((item) => item.id === preselectedStudentId)
                ? preselectedStudentId
                : (response.data[0]?.id ?? '');
            setOwnerId(defaultId);
          }
          return;
        }

        if (selectedTemplate?.ownerType === 'STAFF') {
          const response = await listStaff({ page: 1, pageSize: 100, employmentStatus: 'ACTIVE' });
          if (!cancelled) {
            setStaff(response.data);
            setStudents([]);
            setVisitors([]);
            setOwnerId(response.data[0]?.id ?? '');
          }
          return;
        }

        const response = await listVisitors({ page: 1, pageSize: 100, status: 'CHECKED_IN' });
        if (!cancelled) {
          setVisitors(response.data);
          setStudents([]);
          setStaff([]);
          setOwnerId(response.data[0]?.id ?? '');
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setStudents([]);
            setStaff([]);
            setVisitors([]);
            setOwnerId('');
            setErrorMessage('This document needs a list your role cannot open. Choose another template, or ask an admin to generate it.');
          } else {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load form data');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOwners(false);
        }
      }
    }

    void loadOwners();

    return () => {
      cancelled = true;
    };
  }, [preselectedStudentId, selectedTemplate, session?.user]);

  async function handleGenerate(): Promise<void> {
    if (!ownerId) {
      setErrorMessage('Select a subject for this document.');
      return;
    }

    if (!activeType) {
      setErrorMessage('No document template is available for this role.');
      return;
    }

    if (activeType === 'SALARY_CERTIFICATE') {
      const amount = Number.parseFloat(salaryAmount);
      if (Number.isNaN(amount) || amount < 0) {
        setErrorMessage('Enter a valid monthly salary amount.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setGeneratedDocumentId(null);

    try {
      const generated = await generateDocument({
        documentType: activeType,
        ownerId,
        purpose: purpose || undefined,
        conduct: activeType === 'CHARACTER_CERTIFICATE' ? conduct : undefined,
        salaryAmount:
          activeType === 'SALARY_CERTIFICATE' ? Number.parseFloat(salaryAmount) : undefined,
        salaryMonth: activeType === 'SALARY_CERTIFICATE' ? salaryMonth || undefined : undefined,
        relievingReason: activeType === 'EXPERIENCE_LETTER' ? relievingReason || undefined : undefined,
        leavingDate: activeType === 'EXPERIENCE_LETTER' ? leavingDate || undefined : undefined,
      });
      setGeneratedDocumentId(generated.id);
      showSuccess('Document generated');
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

  async function handleDownload(): Promise<void> {
    if (!generatedDocumentId) {
      return;
    }
    const blob = await downloadGeneratedDocument(generatedDocumentId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(activeType ?? selectedType).toLowerCase()}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        void handleGenerate();
      }}
      sx={{ width: '100%' }}
    >
      <FormPageShell
        title="Generate document"
        description="Choose a template, fill in the details, and download a branded PDF."
        icon={DescriptionOutlined}
        maxWidth={960}
        footer={
          <FormActions>
            <Button component={Link} href="/documents" variant="text">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting || !ownerId || isLoadingOwners}>
              {isSubmitting ? 'Generating…' : 'Generate PDF'}
            </Button>
          </FormActions>
        }
      >
        {templates.length === 0 && session?.isReady ? (
          <Alert severity="info">
            Document generation is not part of this role.
          </Alert>
        ) : null}

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {generatedDocumentId ? (
          <Alert severity="success">
            Document generated successfully.{' '}
            <Button size="small" onClick={() => void handleDownload()}>
              Download PDF
            </Button>{' '}
            <Button size="small" component={Link} href={`/documents/${generatedDocumentId}`}>
              View details
            </Button>
          </Alert>
        ) : null}

        <FormSection title="Template" description="Select the document type to generate." maxWidth="100%">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
            {templates.map((option) => (
              <TemplateCard
                key={option.type}
                option={option}
                selected={activeType === option.type}
                onSelect={() => {
                  setSelectedType(option.type);
                  setGeneratedDocumentId(null);
                }}
              />
            ))}
          </Stack>
        </FormSection>

        {isLoadingOwners ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress aria-label="Loading owners" />
          </Box>
        ) : null}

        {!isLoadingOwners ? (
          <FormSection title="Details" maxWidth="100%">
            {usingSubjectLookup ? (
              <Stack spacing={2}>
                <TextField
                  label="Search by name or code"
                  value={subjectSearch}
                  onChange={(event) => setSubjectSearch(event.target.value)}
                  fullWidth
                />
                <TextField
                  select
                  label={
                    selectedTemplate?.ownerType === 'STAFF'
                      ? 'Staff member'
                      : selectedTemplate?.ownerType === 'VISITOR'
                        ? 'Visitor'
                        : 'Student'
                  }
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                  helperText="Only the name and code needed to print this document are shown."
                  fullWidth
                >
                  {subjectOptions.map((subject) => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.label} ({subject.code})
                    </MenuItem>
                  ))}
                </TextField>
                {subjectMeta ? (
                  <Typography variant="body2" color="text.secondary">
                    Showing {subjectOptions.length} of {subjectMeta.total} matches.
                  </Typography>
                ) : null}
                {subjectMeta && subjectPage < subjectMeta.totalPages ? (
                  <Button
                    variant="outlined"
                    disabled={isLoadingOwners}
                    onClick={() => setSubjectPage((page) => page + 1)}
                  >
                    Load more
                  </Button>
                ) : null}
              </Stack>
            ) : null}

            {!usingSubjectLookup && selectedTemplate?.ownerType === 'STUDENT' ? (
              <TextField
                select
                label="Student"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                fullWidth
              >
                {students.map((student) => (
                  <MenuItem key={student.id} value={student.id}>
                    {getStudentDisplayName(student)} ({student.studentCode})
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            {!usingSubjectLookup && selectedTemplate?.ownerType === 'STAFF' ? (
              <TextField
                select
                label="Staff member"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                fullWidth
              >
                {staff.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {getStaffDisplayName(member)} ({member.employeeCode})
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            {!usingSubjectLookup && selectedTemplate?.ownerType === 'VISITOR' ? (
              <TextField
                select
                label="Visitor"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                fullWidth
              >
                {visitors.map((visitor) => (
                  <MenuItem key={visitor.id} value={visitor.id}>
                    {visitor.name} ({visitor.visitorCode})
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            {activeType === 'BONAFIDE_CERTIFICATE' || activeType === 'CHARACTER_CERTIFICATE' ? (
              <TextField
                label="Purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                helperText="Optional — shown on the certificate"
                fullWidth
              />
            ) : null}

            {activeType === 'CHARACTER_CERTIFICATE' ? (
              <TextField
                select
                label="Conduct rating"
                value={conduct}
                onChange={(event) => setConduct(event.target.value)}
                fullWidth
              >
                <MenuItem value="Good">Good</MenuItem>
                <MenuItem value="Excellent">Excellent</MenuItem>
                <MenuItem value="Outstanding">Outstanding</MenuItem>
              </TextField>
            ) : null}

            {activeType === 'SALARY_CERTIFICATE' ? (
              <>
                <TextField
                  label="Monthly salary (INR)"
                  type="number"
                  value={salaryAmount}
                  onChange={(event) => setSalaryAmount(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Salary month"
                  placeholder="YYYY-MM"
                  value={salaryMonth}
                  onChange={(event) => setSalaryMonth(event.target.value)}
                  helperText="Format: YYYY-MM"
                  fullWidth
                />
              </>
            ) : null}

            {activeType === 'EXPERIENCE_LETTER' ? (
              <>
                <TextField
                  label="Leaving date"
                  type="date"
                  value={leavingDate}
                  onChange={(event) => setLeavingDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Relieving reason"
                  value={relievingReason}
                  onChange={(event) => setRelievingReason(event.target.value)}
                  fullWidth
                />
              </>
            ) : null}
          </FormSection>
        ) : null}
      </FormPageShell>
    </Box>
  );
}

function TemplateCard({
  option,
  selected,
  onSelect,
}: {
  option: DocumentTemplateOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card variant={selected ? 'elevation' : 'outlined'} sx={{ flex: '1 1 220px', maxWidth: 320 }}>
      <CardActionArea onClick={onSelect} data-selected={selected}>
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight={600}>
                {option.name}
              </Typography>
              <Chip size="small" label={option.ownerType} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {option.description}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
