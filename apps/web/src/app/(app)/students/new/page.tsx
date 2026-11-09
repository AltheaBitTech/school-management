'use client';

import Alert from '@mui/material/Alert';
import { resetSubmitting } from '@/lib/forms/submit-state';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import { validateEmail, validateRequiredMaxLength } from '@/lib/forms/validators';
import { INDIA_MOBILE_HELPER_TEXT } from '@/lib/validation/india-mobile';
import {
  validateStudentProfile,
  type StudentProfileField,
} from '@/lib/students/student-profile-rules';
import {
  createStudent,
  provisionStudentLogin,
  suggestNextStudentCode,
} from '@/lib/students/students-client';

export default function NewStudentPage() {
  const router = useRouter();
  const { showSuccess, showError } = useAppSnackbar();
  const [studentCode, setStudentCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [section, setSection] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<StudentProfileField, string>>>({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void suggestNextStudentCode()
      .then(setStudentCode)
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsForbidden(false);
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
    const nextEmailError = validateEmail(loginEmail) ?? null;
    setFirstNameError(nextFirstNameError);
    setLastNameError(nextLastNameError);
    setFieldErrors(profileErrors);
    setEmailError(nextEmailError);
    if (
      nextFirstNameError ||
      nextLastNameError ||
      Object.keys(profileErrors).length > 0 ||
      nextEmailError
    ) {
      setErrorMessage('Fill the highlighted fields before creating the student.');
      return;
    }
    setIsSubmitting(true);

    try {
      const student = await createStudent({
        studentCode: studentCode.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentClass: studentClass.trim(),
        section: section.trim(),
        rollNumber: rollNumber.trim(),
        academicYear: academicYear.trim(),
        guardianName: guardianName.trim(),
        guardianPhone: guardianPhone.trim(),
      });
      try {
        const invite = await provisionStudentLogin(student.id, loginEmail.trim());
        sessionStorage.setItem(
          `campusops:student-invite:${student.id}`,
          JSON.stringify({
            name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            inviteUrl: invite.inviteUrl,
            inviteExpiresAt: invite.inviteExpiresAt,
            userId: invite.userId,
            loginEmail: invite.loginEmail,
          }),
        );
        showSuccess('Student created. Share the sign-in link on the next screen.');
      } catch (inviteError) {
        showError(
          inviteError instanceof Error
            ? `Student saved, but the invite was not sent. ${inviteError.message}`
            : 'Student saved, but the invite was not sent. Use Send invite on the profile.',
        );
      }
      router.push(`/students/${student.id}`);
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create student');
      }
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Create student"
        description="Add a student record with academic and guardian details."
        icon={PersonAddOutlined}
        footer={
          <FormPageFooter
            cancelHref="/students"
            submitLabel="Create student"
            submittingLabel="Creating…"
            isSubmitting={isSubmitting}
          />
        }
      >
        <FormSection title="Basic information" maxWidth="100%">
          <TextField
            label="Student code"
            value={studentCode}
            onChange={(event) => setStudentCode(event.target.value)}
            required
            inputProps={{ maxLength: 32 }}
            helperText="Suggested next admission number in sequence (you can edit)"
            fullWidth
          />
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
            label="Login email"
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            required
            error={Boolean(emailError)}
            helperText={emailError ?? 'Used to send the student sign-in invite, the same way staff receive one'}
            fullWidth
          />
        </FormSection>

        <FormSection title="Academic details" maxWidth="100%">
          <TextField
            label="Class"
            value={studentClass}
            onChange={(event) => setStudentClass(event.target.value)}
            required
            error={Boolean(fieldErrors.studentClass)}
            inputProps={{ maxLength: 20 }}
            helperText={fieldErrors.studentClass ?? 'For example Grade 8'}
            fullWidth
          />
          <TextField
            label="Section"
            value={section}
            onChange={(event) => setSection(event.target.value)}
            required
            error={Boolean(fieldErrors.section)}
            inputProps={{ maxLength: 10 }}
            helperText={fieldErrors.section ?? 'For example A'}
            fullWidth
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
