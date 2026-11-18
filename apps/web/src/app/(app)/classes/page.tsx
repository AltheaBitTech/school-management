'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ClassOutlined from '@mui/icons-material/ClassOutlined';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import { usesTerms } from '@/lib/terminology/terminology';
import { useTerminology } from '@/lib/terminology/use-terminology';
import {
  createClass,
  createSection,
  listClasses,
  parseSectionNames,
  setClassActive,
  setSectionActive,
  updateClass,
  updateSection,
  type SchoolClass,
  type SchoolSection,
} from '@/lib/classes/classes-client';
import { listStaff, type StaffMember } from '@/lib/staff/staff-client';

const CLASS_NAME_MAX = 20;
const SECTION_NAME_MAX = 10;

type ClassDialogState = { mode: 'create' } | { mode: 'edit'; schoolClass: SchoolClass } | null;
type SectionDialogState =
  | { mode: 'create'; schoolClass: SchoolClass }
  | { mode: 'edit'; schoolClass: SchoolClass; section: SchoolSection }
  | null;
type ConfirmState =
  | { kind: 'class'; schoolClass: SchoolClass; activate: boolean }
  | { kind: 'section'; section: SchoolSection; activate: boolean }
  | null;

function staffName(staff: StaffMember): string {
  return staff.displayName?.trim() || `${staff.firstName} ${staff.lastName}`.trim();
}

export default function ClassesPage() {
  const canManage = useCan('class.manage');
  const canViewStaff = useCan('staff.view');
  const { showSuccess } = useAppSnackbar();
  const t = useTerminology();
  const unitLc = t.unit.toLowerCase();
  const unitsLc = t.unitPlural.toLowerCase();
  const groupLc = t.group.toLowerCase();
  const groupsLc = t.groupPlural.toLowerCase();
  const showTerms = usesTerms(t.institutionType);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [classDialog, setClassDialog] = useState<ClassDialogState>(null);
  const [className, setClassName] = useState('');
  const [displayOrder, setDisplayOrder] = useState('');
  const [termCount, setTermCount] = useState('');

  const [sectionDialog, setSectionDialog] = useState<SectionDialogState>(null);
  const [sectionNames, setSectionNames] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [capacity, setCapacity] = useState('');

  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setClasses(await listClasses());
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : `Failed to load ${unitsLc}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (!canManage || !canViewStaff) return;
    listStaff({ page: 1, pageSize: 100, employmentStatus: 'ACTIVE', sortBy: 'firstName' })
      .then((response) => setStaff(response.data))
      .catch(() => setStaff([]));
  }, [canManage, canViewStaff]);

  const visibleClasses = useMemo(
    () =>
      classes
        .filter((item) => showInactive || item.status === 'ACTIVE')
        .map((item) => ({
          ...item,
          sections: item.sections.filter((section) => showInactive || section.status === 'ACTIVE'),
        })),
    [classes, showInactive],
  );

  const totals = useMemo(() => {
    const active = classes.filter((item) => item.status === 'ACTIVE');
    return {
      classes: active.length,
      sections: active.reduce(
        (sum, item) => sum + item.sections.filter((section) => section.status === 'ACTIVE').length,
        0,
      ),
      students: active.reduce((sum, item) => sum + item.studentCount, 0),
    };
  }, [classes]);

  function openClassDialog(state: ClassDialogState) {
    setClassDialog(state);
    setDialogError(null);
    if (state?.mode === 'edit') {
      setClassName(state.schoolClass.name);
      setDisplayOrder(String(state.schoolClass.displayOrder));
      setTermCount(state.schoolClass.termCount ? String(state.schoolClass.termCount) : '');
    } else {
      setClassName('');
      setTermCount('');
      setDisplayOrder(String(classes.length > 0 ? Math.max(...classes.map((c) => c.displayOrder)) + 1 : 1));
    }
  }

  function openSectionDialog(state: SectionDialogState) {
    setSectionDialog(state);
    setDialogError(null);
    if (state?.mode === 'edit') {
      setSectionNames(state.section.name);
      setClassTeacherId(state.section.classTeacherId ?? '');
      setCapacity(state.section.capacity ? String(state.section.capacity) : '');
    } else {
      setSectionNames('');
      setClassTeacherId('');
      setCapacity('');
    }
  }

  function parseOptionalInt(value: string, label: string, min: number, max: number): number | null | string {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      return `${label} must be a whole number between ${min} and ${max}`;
    }
    return parsed;
  }

  async function handleClassSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classDialog) return;
    const name = className.trim();
    if (!name) return setDialogError(`${t.unit} name is required`);
    if (name.length > CLASS_NAME_MAX) return setDialogError(`${t.unit} name must be ${CLASS_NAME_MAX} characters or fewer`);
    const order = parseOptionalInt(displayOrder, 'Sort order', 0, 1000);
    if (typeof order === 'string') return setDialogError(order);
    const terms = showTerms ? parseOptionalInt(termCount, `Number of ${t.termPlural.toLowerCase()}`, 1, 20) : null;
    if (typeof terms === 'string') return setDialogError(terms);

    setIsSubmitting(true);
    setDialogError(null);
    try {
      if (classDialog.mode === 'create') {
        await createClass({
          name,
          ...(order !== null ? { displayOrder: order } : {}),
          ...(terms !== null ? { termCount: terms } : {}),
        });
        showSuccess(`${t.unit} ${name} created. Now add its ${groupsLc}.`);
      } else {
        await updateClass(classDialog.schoolClass.id, {
          name,
          ...(order !== null ? { displayOrder: order } : {}),
          ...(showTerms ? { termCount: terms } : {}),
        });
        showSuccess(`${t.unit} updated`);
      }
      setClassDialog(null);
      await loadClasses();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : `Failed to save ${unitLc}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sectionDialog) return;
    const names = parseSectionNames(sectionNames);
    if (names.length === 0) return setDialogError(`${t.group} name is required`);
    const tooLong = names.find((name) => name.length > SECTION_NAME_MAX);
    if (tooLong) return setDialogError(`${t.group} "${tooLong}" must be ${SECTION_NAME_MAX} characters or fewer`);
    if (sectionDialog.mode === 'edit' && names.length > 1) {
      return setDialogError(`Enter a single ${groupLc} name when editing`);
    }
    const cap = parseOptionalInt(capacity, 'Capacity', 1, 500);
    if (typeof cap === 'string') return setDialogError(cap);

    setIsSubmitting(true);
    setDialogError(null);
    try {
      if (sectionDialog.mode === 'create') {
        const created: string[] = [];
        for (const name of names) {
          await createSection(sectionDialog.schoolClass.id, {
            name,
            ...(classTeacherId && names.length === 1 ? { classTeacherId } : {}),
            ...(cap !== null ? { capacity: cap } : {}),
          });
          created.push(name);
        }
        showSuccess(
          created.length === 1
            ? `${t.group} ${created[0]} added to ${sectionDialog.schoolClass.name}`
            : `${created.length} ${groupsLc} added to ${sectionDialog.schoolClass.name}`,
        );
      } else {
        await updateSection(sectionDialog.section.id, {
          name: names[0],
          classTeacherId: classTeacherId || null,
          capacity: cap,
        });
        showSuccess(`${t.group} updated`);
      }
      setSectionDialog(null);
      await loadClasses();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : `Failed to save ${groupLc}`);
      await loadClasses();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (confirm.kind === 'class') {
        await setClassActive(confirm.schoolClass.id, confirm.activate);
        showSuccess(`${t.unit} ${confirm.activate ? 'reactivated' : 'deactivated'}`);
      } else {
        await setSectionActive(confirm.section.id, confirm.activate);
        showSuccess(`${t.group} ${confirm.activate ? 'reactivated' : 'deactivated'}`);
      }
      await loadClasses();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
      setConfirm(null);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  const isMultiCreate = sectionDialog?.mode === 'create' && parseSectionNames(sectionNames).length > 1;

  return (
    <ListPageShell
      title={`${t.unitPlural} & ${t.groupPlural}`}
      description={`Set up your ${unitsLc} and ${groupsLc} once. Students are then assigned by picking from a list.`}
      icon={ClassOutlined}
      actions={
        canManage ? (
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => openClassDialog({ mode: 'create' })}>
            Add {unitLc}
          </Button>
        ) : undefined
      }
      filters={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            {totals.classes} {unitsLc} · {totals.sections} {groupsLc} · {totals.students} students
          </Typography>
          <FormControlLabel
            control={<Switch checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />}
            label="Show inactive"
          />
        </Stack>
      }
    >
      {errorMessage && !isLoading ? <Alert severity="error">{errorMessage}</Alert> : null}
      {isLoading ? <LoadingState label={`Loading ${unitsLc}`} columnCount={4} /> : null}

      {!isLoading && visibleClasses.length === 0 ? (
        <EmptyState
          icon={ClassOutlined}
          message={
            canManage
              ? `No ${unitsLc} yet. Click "Add ${unitLc}" to create your first ${unitLc}.`
              : `No ${unitsLc} have been set up yet.`
          }
        />
      ) : null}

      {!isLoading
        ? visibleClasses.map((schoolClass) => (
            <Paper key={schoolClass.id} variant="outlined" sx={{ p: 2 }} data-testid={`class-${schoolClass.name}`}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: schoolClass.sections.length > 0 ? 1.5 : 0 }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="h6" component="h2">
                    {schoolClass.name}
                  </Typography>
                  {schoolClass.termCount && showTerms ? (
                    <Typography variant="body2" color="text.secondary">
                      {schoolClass.termCount} {t.termPlural.toLowerCase()}
                    </Typography>
                  ) : null}
                  <Typography variant="body2" color="text.secondary">
                    {schoolClass.studentCount} {schoolClass.studentCount === 1 ? 'student' : 'students'}
                  </Typography>
                  {schoolClass.status !== 'ACTIVE' ? <StatusChip status={schoolClass.status} /> : null}
                </Stack>
                {canManage ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {schoolClass.status === 'ACTIVE' ? (
                      <Button
                        size="small"
                        startIcon={<AddOutlined />}
                        onClick={() => openSectionDialog({ mode: 'create', schoolClass })}
                      >
                        Add {groupLc}
                      </Button>
                    ) : null}
                    <Button size="small" onClick={() => openClassDialog({ mode: 'edit', schoolClass })}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color={schoolClass.status === 'ACTIVE' ? 'error' : 'primary'}
                      onClick={() =>
                        setConfirm({ kind: 'class', schoolClass, activate: schoolClass.status !== 'ACTIVE' })
                      }
                    >
                      {schoolClass.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </Stack>
                ) : null}
              </Stack>

              {schoolClass.sections.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  No {groupsLc} yet.{canManage && schoolClass.status === 'ACTIVE' ? ` Click "Add ${groupLc}" to add A, B, C…` : ''}
                </Typography>
              ) : (
                <AppTable aria-label={`${t.groupPlural} of ${schoolClass.name}`}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t.group}</TableCell>
                      <TableCell>{t.groupTeacher}</TableCell>
                      <TableCell>Students</TableCell>
                      <TableCell>Status</TableCell>
                      {canManage ? <TableCell align="right">Actions</TableCell> : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schoolClass.sections.map((section) => {
                      const full = section.capacity !== null && section.studentCount >= section.capacity;
                      return (
                        <TableRow key={section.id}>
                          <TableCell>{section.name}</TableCell>
                          <TableCell>{section.classTeacherName ?? <Box component="span" color="text.secondary">Not assigned</Box>}</TableCell>
                          <TableCell>
                            <Box component="span" color={full ? 'warning.main' : undefined}>
                              {section.studentCount}
                              {section.capacity !== null ? ` / ${section.capacity}` : ''}
                              {full ? ' (full)' : ''}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <StatusChip status={section.status} />
                          </TableCell>
                          {canManage ? (
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  onClick={() => openSectionDialog({ mode: 'edit', schoolClass, section })}
                                >
                                  Edit
                                </Button>
                                {schoolClass.status === 'ACTIVE' ? (
                                  <Button
                                    size="small"
                                    color={section.status === 'ACTIVE' ? 'error' : 'primary'}
                                    onClick={() =>
                                      setConfirm({ kind: 'section', section, activate: section.status !== 'ACTIVE' })
                                    }
                                  >
                                    {section.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                                  </Button>
                                ) : null}
                              </Stack>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </AppTable>
              )}
            </Paper>
          ))
        : null}

      <Dialog open={classDialog !== null} onClose={() => !isSubmitting && setClassDialog(null)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleClassSubmit} noValidate>
          <DialogTitle>{classDialog?.mode === 'edit' ? `Edit ${unitLc}` : `Add ${unitLc}`}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}
              <TextField
                label={`${t.unit} name`}
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                helperText={
                  classDialog?.mode === 'edit'
                    ? `Renaming updates every student in this ${unitLc}.`
                    : t.institutionType === 'COLLEGE'
                      ? 'For example B.Com, B.Sc Computer Science or MBA'
                      : t.institutionType === 'INSTITUTE'
                        ? 'For example JEE Foundation, Full Stack Development or IELTS'
                        : 'For example Grade 8, Class 10 or Nursery'
                }
                inputProps={{ maxLength: CLASS_NAME_MAX }}
                autoFocus
                required
                fullWidth
              />
              <TextField
                label="Sort order"
                value={displayOrder}
                onChange={(event) => setDisplayOrder(event.target.value)}
                helperText="Lower numbers are listed first"
                inputProps={{ inputMode: 'numeric' }}
                fullWidth
              />
              {showTerms ? (
                <TextField
                  label={`Number of ${t.termPlural.toLowerCase()}`}
                  value={termCount}
                  onChange={(event) => setTermCount(event.target.value)}
                  helperText={`Optional. For example 6 ${t.termPlural.toLowerCase()} for a 3-year ${unitLc}.`}
                  inputProps={{ inputMode: 'numeric' }}
                  fullWidth
                />
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClassDialog(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <SubmitButton isSubmitting={isSubmitting} submittingLabel="Saving…">
              {classDialog?.mode === 'edit' ? 'Save' : `Add ${unitLc}`}
            </SubmitButton>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={sectionDialog !== null} onClose={() => !isSubmitting && setSectionDialog(null)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSectionSubmit} noValidate>
          <DialogTitle>
            {sectionDialog?.mode === 'edit'
              ? `Edit ${groupLc} of ${sectionDialog.schoolClass.name}`
              : `Add ${groupLc} to ${sectionDialog?.schoolClass.name ?? ''}`}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}
              <TextField
                label={sectionDialog?.mode === 'edit' ? `${t.group} name` : `${t.group} name(s)`}
                value={sectionNames}
                onChange={(event) => setSectionNames(event.target.value)}
                helperText={
                  sectionDialog?.mode === 'edit'
                    ? `Renaming updates every student in this ${groupLc}.`
                    : `Tip: type A, B, C to add several ${groupsLc} at once`
                }
                autoFocus
                required
                fullWidth
              />
              {canViewStaff && !isMultiCreate ? (
                <TextField
                  select
                  label={t.groupTeacher}
                  value={classTeacherId}
                  onChange={(event) => setClassTeacherId(event.target.value)}
                  helperText="Optional"
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Not assigned</em>
                  </MenuItem>
                  {staff.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {staffName(member)}
                      {member.designation ? ` · ${member.designation}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
              <TextField
                label="Capacity"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                helperText={isMultiCreate ? `Optional. Applied to every new ${groupLc}.` : 'Optional. Maximum number of students.'}
                inputProps={{ inputMode: 'numeric' }}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSectionDialog(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <SubmitButton isSubmitting={isSubmitting} submittingLabel="Saving…">
              {sectionDialog?.mode === 'edit' ? 'Save' : isMultiCreate ? `Add ${groupsLc}` : `Add ${groupLc}`}
            </SubmitButton>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.activate
            ? 'Reactivate?'
            : confirm?.kind === 'class'
              ? `Deactivate ${confirm.schoolClass.name}?`
              : `Deactivate ${groupLc} ${confirm?.kind === 'section' ? confirm.section.name : ''}?`
        }
        description={
          confirm?.activate
            ? 'It will be available again when adding or editing students.'
            : confirm?.kind === 'class'
              ? `The ${unitLc} and all its ${groupsLc} will be hidden from student forms. ${t.unitPlural} with active students cannot be deactivated.`
              : `The ${groupLc} will be hidden from student forms. ${t.groupPlural} with active students cannot be deactivated.`
        }
        confirmLabel={confirm?.activate ? 'Reactivate' : 'Deactivate'}
        confirmColor={confirm?.activate ? 'primary' : 'error'}
        isConfirming={isSubmitting}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </ListPageShell>
  );
}
