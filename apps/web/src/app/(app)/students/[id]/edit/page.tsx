'use client';

import Alert from '@mui/material/Alert';
import { resetSubmitting } from '@/lib/forms/submit-state';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import EditOutlined from '@mui/icons-material/EditOutlined';
import Link from 'next/link';
import Button from '@mui/material/Button';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ClassSectionPicker } from '@/components/students/ClassSectionPicker';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import { INDIA_MOBILE_HELPER_TEXT } from '@/lib/validation/india-mobile';
import {
  validateStudentProfile,
  type StudentProfileField,
} from '@/lib/students/student-profile-rules';
import {
  formatStudentStatus,
  getStudent,
  STUDENT_STATUSES,
  updateStudent,
  type StudentStatus,
} from '@/lib/students/students-client';
import { validateRequiredMaxLength } from '@/lib/forms/validators';
import { useTerminology } from '@/lib/terminology/use-terminology';
import { usesTerms } from '@/lib/terminology/terminology';

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [studentCode, setStudentCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [section, setSection] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [legacyLabels, setLegacyLabels] = useState<{ studentClass: string; section: string } | null>(
    null,
  );
  const [rollNumber, setRollNumber] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const t = useTerminology();
  const showTerms = usesTerms(t.institutionType);
  const [currentTerm, setCurrentTerm] = useState('');
  const parsedTerm = currentTerm.trim() ? Number(currentTerm.trim()) : null;
  const termError =
    parsedTerm !== null && (!Number.isInteger(parsedTerm) || parsedTerm < 1 || parsedTerm > 20)
      ? 'Enter a whole number between 1 and 20'
      : null;
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [status, setStatus] = useState<StudentStatus>('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<StudentProfileField, string>>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStudent(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const student = await getStudent(params.id);
        if (!cancelled) {
          setStudentCode(student.studentCode);
          setFirstName(student.firstName);
          setLastName(student.lastName);
          // Class/section are only treated as filled when linked to a real section; older
          // records are matched by label in the picker and otherwise must be re-picked.
          if (student.sectionId) {
            setSectionId(student.sectionId);
            setStudentClass(student.studentClass ?? '');
            setSection(student.section ?? '');
          } else {
            setLegacyLabels({
              studentClass: student.studentClass ?? '',
              section: student.section ?? '',
            });
          }
          setRollNumber(student.rollNumber ?? '');
          setAcademicYear(student.academicYear ?? '');
          setCurrentTerm(student.currentTerm ? String(student.currentTerm) : '');
          setGuardianName(student.guardianName ?? '');
          setGuardianPhone(student.guardianPhone ?? '');
          setStatus(student.status);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setIsForbidden(true);
          } else {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load student');
          }
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    const nextFirstNameError = validateRequiredMaxLength(firstName, 'First name', 100) ?? null;
    const nextLastNameError = validateRequiredMaxLength(lastName, 'Last name', 100) ?? null;
    const profileErrors = validateStudentProfile({
      studentClass,
      section,
      rollNumber,
      academicYear,
      guardianName,
      guardianPhone,
    });
    setFirstNameError(nextFirstNameError);
    setLastNameError(nextLastNameError);
    setFieldErrors(profileErrors);
    if (
      nextFirstNameError ||
      nextLastNameError ||
      Object.keys(profileErrors).length > 0 ||
      (showTerms && termError)
    ) {
      setErrorMessage('Fill the highlighted fields before saving.');
      return;
    }
    setIsSubmitting(true);

    try {
      await updateStudent(params.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        sectionId,
        rollNumber: rollNumber.trim(),
        academicYear: academicYear.trim(),
        ...(showTerms ? { currentTerm: parsedTerm } : {}),
        guardianName: guardianName.trim(),
        guardianPhone: guardianPhone.trim(),
        status,
      });
      showSuccess('Student updated');
      router.push(`/students/${params.id}`);
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to update student');
      }
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading student" />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Edit student"
        description="Update academic and guardian details. Student code cannot be changed."
        icon={EditOutlined}
        actions={
          <Button component={Link} href={`/students/${params.id}`} variant="outlined" size="small">
            View profile
          </Button>
        }
        footer={
          <FormPageFooter
            cancelHref={`/students/${params.id}`}
            submitLabel="Save changes"
            submittingLabel="Saving…"
            isSubmitting={isSubmitting}
          />
        }
      >
        <FormSection title="Basic information" maxWidth="100%">
          <TextField label="Student code" value={studentCode} disabled fullWidth helperText="Permanent identifier" />
          <TextField
            label="First name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            inputProps={{ maxLength: 100 }}
            error={Boolean(firstNameError)}
            helperText={firstNameError ?? undefined}
            fullWidth
          />
          <TextField
            label="Last name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
            inputProps={{ maxLength: 100 }}
            error={Boolean(lastNameError)}
            helperText={lastNameError ?? undefined}
            fullWidth
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as StudentStatus)}
            fullWidth
          >
            {STUDENT_STATUSES.map((item) => (
              <MenuItem key={item} value={item}>
                {formatStudentStatus(item)}
              </MenuItem>
            ))}
          </TextField>
        </FormSection>

        <FormSection title="Academic details" maxWidth="100%">
          {legacyLabels && !sectionId && (legacyLabels.studentClass || legacyLabels.section) ? (
            <Alert severity="warning">
              Saved as &quot;{[legacyLabels.studentClass, legacyLabels.section].filter(Boolean).join(' - ')}
              &quot;, which does not match any class set up yet. Pick the correct class and section.
            </Alert>
          ) : null}
          <ClassSectionPicker
            sectionId={sectionId}
            fallbackClassName={legacyLabels?.studentClass}
            fallbackSectionName={legacyLabels?.section}
            onChange={(selection) => {
              setSectionId(selection?.sectionId ?? '');
              setStudentClass(selection?.className ?? '');
              setSection(selection?.sectionName ?? '');
            }}
            classError={fieldErrors.studentClass}
            sectionError={fieldErrors.section}
          />
          <TextField
            label="Roll number"
            value={rollNumber}
            onChange={(event) => setRollNumber(event.target.value)}
            required
            error={Boolean(fieldErrors.rollNumber)}
            inputProps={{ maxLength: 10 }}
            helperText={fieldErrors.rollNumber ?? '1–10 letters, numbers, or hyphens, such as 14'}
            fullWidth
          />
          <TextField
            label="Academic year"
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            required
            error={Boolean(fieldErrors.academicYear)}
            inputProps={{ maxLength: 9 }}
            helperText={fieldErrors.academicYear ?? 'Two consecutive years, such as 2025-2026'}
            fullWidth
          />
          {showTerms ? (
            <TextField
              label={`Current ${t.term.toLowerCase()}`}
              value={currentTerm}
              onChange={(event) => setCurrentTerm(event.target.value)}
              error={Boolean(termError)}
              inputProps={{ inputMode: 'numeric', maxLength: 2 }}
              helperText={termError ?? `Optional. ${t.term} number, such as 3`}
              fullWidth
            />
          ) : null}
        </FormSection>

        <FormSection title="Guardian details" maxWidth="100%">
          <TextField
            label="Guardian name"
            value={guardianName}
            onChange={(event) => setGuardianName(event.target.value)}
            required
            error={Boolean(fieldErrors.guardianName)}
            inputProps={{ maxLength: 120 }}
            helperText={fieldErrors.guardianName}
            fullWidth
          />
          <TextField
            label="Guardian phone"
            value={guardianPhone}
            onChange={(event) => setGuardianPhone(event.target.value)}
            required
            error={Boolean(fieldErrors.guardianPhone)}
            inputProps={{ maxLength: 16, inputMode: 'tel' }}
            helperText={fieldErrors.guardianPhone ?? INDIA_MOBILE_HELPER_TEXT}
            fullWidth
          />
        </FormSection>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      </FormPageShell>
    </Box>
  );
}
