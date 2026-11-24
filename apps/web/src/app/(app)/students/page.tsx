'use client';

import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddOutlined from '@mui/icons-material/AddOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listClasses, type SchoolClass } from '@/lib/classes/classes-client';
import { StudentImportDialog } from '@/app/(app)/students/StudentImportDialog';
import { StudentRowActions } from '@/app/(app)/students/StudentRowActions';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import {
  formatStudentDate,
  formatStudentStatus,
  formatStudentClassLabel,
  getStudentDisplayName,
  getStudentInitials,
  listStudents,
  STUDENT_STATUSES,
  type Student,
  type StudentStatus,
} from '@/lib/students/students-client';
import { useTerminology } from '@/lib/terminology/use-terminology';

export default function StudentsPage() {
  const canCreate = useCan('student.create');
  const router = useRouter();
  const t = useTerminology();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | ''>('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [classOptions, setClassOptions] = useState<SchoolClass[]>([]);
  const sectionOptions = useMemo(
    () => classOptions.find((item) => item.id === classFilter)?.sections ?? [],
    [classOptions, classFilter],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    listClasses()
      .then(setClassOptions)
      .catch(() => setClassOptions([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listStudents({
          page: 1,
          pageSize: 100,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          classId: classFilter || undefined,
          sectionId: sectionFilter || undefined,
        });
        if (!cancelled) {
          setStudents(response.data);
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
          setIsLoading(false);
        }
      }
    }

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [search, statusFilter, classFilter, sectionFilter, refreshKey]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <>
    <ListPageShell
      title="Students"
      description="Manage students and enrollment information."
      icon={SchoolOutlined}
      actions={
        <Stack direction="row" spacing={1}>
          {canCreate ? (
            <Button
              variant="outlined"
              startIcon={<UploadFileOutlined />}
              onClick={() => setImportDialogOpen(true)}
            >
              Import CSV
            </Button>
          ) : null}
          {canCreate ? (
            <Button component={Link} href="/students/new" variant="contained" startIcon={<AddOutlined />}>
              Add student
            </Button>
          ) : null}
        </Stack>
      }
      filters={
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
        <TextField
          label="Search students"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Name, student code, or ${t.unit.toLowerCase()}`}
          sx={{ minWidth: { sm: 280 }, flex: 1 }}
        />
        <TextField
          select
          label={t.unit}
          value={classFilter}
          onChange={(event) => {
            setClassFilter(event.target.value);
            setSectionFilter('');
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All {t.unitPlural.toLowerCase()}</MenuItem>
          {classOptions.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
              {item.status !== 'ACTIVE' ? ' (inactive)' : ''}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t.group}
          value={sectionFilter}
          onChange={(event) => setSectionFilter(event.target.value)}
          disabled={!classFilter}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All {t.groupPlural.toLowerCase()}</MenuItem>
          {sectionOptions.map((section) => (
            <MenuItem key={section.id} value={section.id}>
              {section.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StudentStatus | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STUDENT_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {formatStudentStatus(status)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      }
    >
      {isLoading ? <LoadingState label="Loading students" columnCount={7} /> : null}

      {errorMessage && !isLoading ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && students.length === 0 ? (
        <EmptyState
          icon={SchoolOutlined}
          message={
            canCreate
              ? 'No students found. Add a student to begin using document generation.'
              : 'No students found.'
          }
          action={
            canCreate ? (
              <Button component={Link} href="/students/new" variant="contained" startIcon={<AddOutlined />}>
                Add student
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!isLoading && students.length > 0 && isCompact ? (
        <Stack spacing={1.5} aria-label="Students">
          {students.map((student) => (
            <Card
              key={student.id}
              variant="outlined"
              onClick={() => router.push(`/students/${student.id}`)}
              sx={{ cursor: 'pointer' }}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.dark', width: 40, height: 40, fontSize: 14 }}>
                    {getStudentInitials(student)}
                  </Avatar>
                  <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {getStudentDisplayName(student)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {student.studentCode}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {formatStudentClassLabel(student)}
                    </Typography>
                  </Stack>
                  <Stack spacing={0.5} alignItems="flex-end">
                    <StatusChip status={student.status} label={formatStudentStatus(student.status)} />
                    <StudentRowActions student={student} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : null}

      {!isLoading && students.length > 0 && !isCompact ? (
        <AppTable aria-label="Students">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>{t.unit}</TableCell>
              <TableCell>{t.group}</TableCell>
              <TableCell>Roll</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => (
              <TableRow
                key={student.id}
                hover
                onClick={() => router.push(`/students/${student.id}`)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.dark', width: 36, height: 36, fontSize: 13 }}>
                      {getStudentInitials(student)}
                    </Avatar>
                    <Stack spacing={0}>
                      <Typography variant="body2" fontWeight={600}>
                        {getStudentDisplayName(student)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.studentCode}
                      </Typography>
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell>{formatStudentClassLabel(student)}</TableCell>
                <TableCell>{student.section?.trim() || '—'}</TableCell>
                <TableCell>{student.rollNumber?.trim() || '—'}</TableCell>
                <TableCell>
                  <StatusChip status={student.status} label={formatStudentStatus(student.status)} />
                </TableCell>
                <TableCell>{formatStudentDate(student.createdAt)}</TableCell>
                <TableCell align="right">
                  <StudentRowActions student={student} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}
    </ListPageShell>

      <StudentImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImported={() => setRefreshKey((value) => value + 1)}
      />
    </>
  );
}
