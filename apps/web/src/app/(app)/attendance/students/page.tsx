'use client';

import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AttendanceFeatureGate } from '@/components/features/AttendanceFeatureGate';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { SubstituteDialog } from '@/components/student-attendance/SubstituteDialog';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import {
  formatAttendanceDateLabel,
  getSectionAttendance,
  listMyAttendanceSections,
  saveSectionAttendance,
  STUDENT_ATTENDANCE_STATUS_OPTIONS,
  type AttendanceSection,
  type SectionAttendance,
  type StudentAttendanceStatus,
} from '@/lib/student-attendance/student-attendance-client';

function todayDateInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const STATUS_COLOR: Record<StudentAttendanceStatus, 'success' | 'error' | 'warning' | 'info'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  HALF_DAY: 'warning',
  ON_LEAVE: 'info',
};

function roleLabel(section: AttendanceSection): string {
  if (section.role === 'CLASS_TEACHER') return 'Class teacher';
  if (section.role === 'SUBSTITUTE') {
    return section.substituteUntil ? `Substitute until ${formatAttendanceDateLabel(section.substituteUntil)}` : 'Substitute';
  }
  return 'Admin';
}

function StudentAttendancePageContent() {
  const canManage = useCan('student.attendance.manage');
  const { showSuccess } = useAppSnackbar();
  const [attendanceDate, setAttendanceDate] = useState(todayDateInputValue());
  const [sections, setSections] = useState<AttendanceSection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [data, setData] = useState<SectionAttendance | null>(null);
  const [draftStatus, setDraftStatus] = useState<Record<string, StudentAttendanceStatus>>({});
  const [draftRemarks, setDraftRemarks] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [sectionsVersion, setSectionsVersion] = useState(0);

  const today = todayDateInputValue();
  const isFuture = attendanceDate > today;

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSections(true);
    listMyAttendanceSections(attendanceDate)
      .then((result) => {
        if (cancelled) return;
        setSections(result.sections);
        setSectionId((current) => {
          if (current && result.sections.some((section) => section.id === current)) return current;
          return result.sections.length === 1 ? result.sections[0].id : '';
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Failed to load sections');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSections(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attendanceDate, sectionsVersion]);

  const applyData = useCallback((next: SectionAttendance) => {
    setData(next);
    setDraftStatus(
      Object.fromEntries(next.students.map((student) => [student.id, student.attendance?.status ?? 'PRESENT'])),
    );
    setDraftRemarks(Object.fromEntries(next.students.map((student) => [student.id, student.attendance?.remarks ?? ''])));
    setIsDirty(false);
  }, []);

  useEffect(() => {
    if (!sectionId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setIsLoadingStudents(true);
    setErrorMessage(null);
    getSectionAttendance(sectionId, attendanceDate)
      .then((result) => {
        if (!cancelled) applyData(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setData(null);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load students');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStudents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sectionId, attendanceDate, applyData]);

  const summary = useMemo(() => {
    const counts: Record<StudentAttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, ON_LEAVE: 0 };
    for (const student of data?.students ?? []) {
      counts[draftStatus[student.id] ?? 'PRESENT'] += 1;
    }
    return counts;
  }, [data, draftStatus]);

  const savedCount = data?.students.filter((student) => student.attendance).length ?? 0;
  const selectedSection = sections.find((section) => section.id === sectionId) ?? null;
  const canEdit = Boolean(data?.canMark) && !isFuture;

  function setStatus(studentId: string, status: StudentAttendanceStatus) {
    setDraftStatus((current) => ({ ...current, [studentId]: status }));
    setIsDirty(true);
  }

  function markAllPresent() {
    if (!data) return;
    setDraftStatus(Object.fromEntries(data.students.map((student) => [student.id, 'PRESENT' as const])));
    setIsDirty(true);
  }

  async function handleSave() {
    if (!data) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await saveSectionAttendance(data.section.id, {
        attendanceDate,
        entries: data.students.map((student) => ({
          studentId: student.id,
          status: draftStatus[student.id] ?? 'PRESENT',
          remarks: draftRemarks[student.id]?.trim() || undefined,
        })),
      });
      applyData(saved);
      showSuccess(`Attendance saved for ${saved.section.label}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <ListPageShell
      title="Student attendance"
      description="Mark daily attendance for a whole section in one go."
      icon={GroupsOutlined}
      actions={
        canManage && selectedSection ? (
          <Button variant="outlined" startIcon={<PersonAddAltOutlined />} onClick={() => setSubstituteOpen(true)}>
            Substitute teacher
          </Button>
        ) : undefined
      }
      filters={
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            label="Date"
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
            inputProps={{ max: today }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            label="Section"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            sx={{ minWidth: 260 }}
            disabled={isLoadingSections || sections.length === 0}
          >
            {sections.map((section) => (
              <MenuItem key={section.id} value={section.id}>
                {section.label}
                {section.role === 'SUBSTITUTE' ? ' (substitute)' : ''}
              </MenuItem>
            ))}
          </TextField>
          {selectedSection ? (
            <Chip
              size="small"
              color={selectedSection.role === 'SUBSTITUTE' ? 'warning' : 'default'}
              label={roleLabel(selectedSection)}
            />
          ) : null}
        </Stack>
      }
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {isLoadingSections ? <LoadingState label="Loading sections" columnCount={4} /> : null}

      {!isLoadingSections && sections.length === 0 ? (
        <EmptyState
          icon={GroupsOutlined}
          message="You are not class teacher of any section, and no substitute assignment covers this date."
        />
      ) : null}

      {!isLoadingSections && sections.length > 0 && !sectionId ? (
        <EmptyState icon={GroupsOutlined} message="Choose a section to take attendance." />
      ) : null}

      {isLoadingStudents ? <LoadingState label="Loading students" columnCount={4} /> : null}

      {!isLoadingStudents && data && data.students.length === 0 ? (
        <EmptyState icon={GroupsOutlined} message="No active students in this section." />
      ) : null}

      {!isLoadingStudents && data && data.students.length > 0 ? (
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {STUDENT_ATTENDANCE_STATUS_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  size="small"
                  variant="outlined"
                  color={STATUS_COLOR[option.value]}
                  label={`${summary[option.value]} ${option.label.toLowerCase()}`}
                />
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                {savedCount === 0 ? 'Not taken yet' : `Saved for ${savedCount} of ${data.students.length}`}
                {isDirty ? ' · unsaved changes' : ''}
              </Typography>
            </Stack>
            {canEdit ? (
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={markAllPresent} disabled={isSaving}>
                  Mark all present
                </Button>
                <Button variant="contained" onClick={() => void handleSave()} disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save attendance'}
                </Button>
              </Stack>
            ) : null}
          </Stack>

          {isFuture ? <Alert severity="info">Attendance cannot be marked for a future date.</Alert> : null}

          <AppTable minWidth={720} aria-label="Student attendance">
            <TableHead>
              <TableRow>
                <TableCell>Roll no</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.students.map((student) => {
                const status = draftStatus[student.id] ?? 'PRESENT';
                return (
                  <TableRow key={student.id} hover>
                    <TableCell>{student.rollNumber ?? '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{student.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.studentCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={status}
                        disabled={!canEdit}
                        onChange={(_event, value: StudentAttendanceStatus | null) => {
                          if (value) setStatus(student.id, value);
                        }}
                        aria-label={`Attendance for ${student.name}`}
                      >
                        {STUDENT_ATTENDANCE_STATUS_OPTIONS.map((option) => (
                          <ToggleButton
                            key={option.value}
                            value={option.value}
                            color={STATUS_COLOR[option.value]}
                            aria-label={option.label}
                            title={option.label}
                            sx={{ minWidth: 40 }}
                          >
                            {option.short}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Optional note"
                        value={draftRemarks[student.id] ?? ''}
                        disabled={!canEdit}
                        inputProps={{ maxLength: 500 }}
                        onChange={(event) => {
                          setDraftRemarks((current) => ({ ...current, [student.id]: event.target.value }));
                          setIsDirty(true);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </AppTable>
        </Stack>
      ) : null}

      <SubstituteDialog
        open={substituteOpen}
        onClose={() => setSubstituteOpen(false)}
        section={selectedSection}
        defaultDate={attendanceDate}
        onChanged={() => setSectionsVersion((version) => version + 1)}
      />
    </ListPageShell>
  );
}

export default function StudentAttendancePage() {
  return (
    <AttendanceFeatureGate>
      <StudentAttendancePageContent />
    </AttendanceFeatureGate>
  );
}
