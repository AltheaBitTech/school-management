'use client';

import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { DetailFactRow, DetailPageShell } from '@/components/ui/DetailPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan, useCanEvery } from '@/lib/auth/use-can';
import { validateEmail } from '@/lib/forms/validators';
import {
  downloadGeneratedDocument,
  formatDocumentType,
  listDocuments,
  type GeneratedDocument,
} from '@/lib/documents/documents-client';
import { isAttendanceEnabled } from '@/lib/features/feature-flags';
import { formatCurrency, getStudentFeeSummary, type StudentFeeSummary } from '@/lib/fees/fees-client';
import { requiredText } from '@/lib/forms/field-rules';
import {
  formatStudentClassLabel,
  formatStudentDate,
  formatStudentStatus,
  getStudent,
  provisionStudentLogin,
  getStudentDisplayName,
  getStudentInitials,
  linkParent,
  listLinkedParents,
  searchParentCandidates,
  type LinkedParent,
  type ParentCandidate,
  type Student,
} from '@/lib/students/students-client';
import { useTerminology } from '@/lib/terminology/use-terminology';
import { usesTerms } from '@/lib/terminology/terminology';

function displayValue(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

export default function StudentDetailPage() {
  const canEdit = useCan('student.update');
  const t = useTerminology();
  const canLinkParents = useCan('parent.link.manage');
  const canGenerate = useCan('document.generate');
  const canViewAttendance = useCan('attendance.view');
  const canViewFees = useCan('fee.view');
  const canViewDocuments = useCan('document.view');
  const canInviteParent = useCanEvery(['staff.create', 'role.assign']);
  const canSendInvite = useCanEvery(['user.create', 'role.assign']);
  const { showSuccess } = useAppSnackbar();
  const params = useParams<{ id: string }>();
  const consumedInviteKey = useRef<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
  const [parentsError, setParentsError] = useState<string | null>(null);
  const [parentSearch, setParentSearch] = useState('');
  const [parentCandidates, setParentCandidates] = useState<ParentCandidate[]>([]);
  const [isSearchingParents, setIsSearchingParents] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentCandidate | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkSeverity, setLinkSeverity] = useState<'success' | 'error' | 'info'>('info');
  const [isLinking, setIsLinking] = useState(false);

  const [feeSummary, setFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [isFeeLoading, setIsFeeLoading] = useState(true);

  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionEmailError, setProvisionEmailError] = useState<string | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteDialogData, setInviteDialogData] = useState<{
    name: string;
    inviteUrl: string;
    inviteExpiresAt: string;
  } | null>(null);

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

  useEffect(() => {
    if (!student) {
      return;
    }
    const storageKey = `campusops:student-invite:${student.id}`;
    if (consumedInviteKey.current === storageKey) {
      return;
    }
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      return;
    }
    consumedInviteKey.current = storageKey;
    sessionStorage.removeItem(storageKey);
    try {
      const parsed = JSON.parse(raw) as {
        name?: string;
        inviteUrl?: string;
        inviteExpiresAt?: string;
        userId?: string;
        loginEmail?: string;
      };
      if (!parsed.inviteUrl) {
        return;
      }
      if (parsed.loginEmail) {
        setLoginEmail(parsed.loginEmail);
      }
      if (!student.userId && (parsed.userId || parsed.loginEmail)) {
        setStudent((current) =>
          current && !current.userId
            ? { ...current, userId: parsed.userId ?? 'linked' }
            : current,
        );
      }
      setInviteDialogData({
        name: parsed.name?.trim() || getStudentDisplayName(student),
        inviteUrl: parsed.inviteUrl,
        inviteExpiresAt: parsed.inviteExpiresAt ?? '',
      });
    } catch {
      // Ignore a stored invite the browser cannot read.
    }
  }, [student]);

  useEffect(() => {
    if (!student) {
      return;
    }
    const studentId = student.id;
    let cancelled = false;

    async function loadRelated(): Promise<void> {
      setIsFeeLoading(true);
      setIsDocumentsLoading(true);
      setParentsError(null);
      setFeeError(null);
      setDocumentsError(null);

      const [parentsResult, feesResult, documentsResult] = await Promise.allSettled([
        listLinkedParents(studentId),
        getStudentFeeSummary(studentId),
        listDocuments({ studentId, page: 1, pageSize: 10 }),
      ]);

      if (cancelled) {
        return;
      }

      if (parentsResult.status === 'fulfilled') {
        setLinkedParents(parentsResult.value);
      } else {
        const error = parentsResult.reason;
        setParentsError(
          error instanceof ApiError && error.statusCode === 403
            ? 'You do not have permission to view linked parent accounts.'
            : 'Linked parent accounts could not be loaded.',
        );
      }

      if (feesResult.status === 'fulfilled') {
        setFeeSummary(feesResult.value);
      } else {
        const error = feesResult.reason;
        setFeeError(
          error instanceof ApiError && error.statusCode === 403
            ? 'You do not have permission to view this student’s fees.'
            : 'Fee records could not be loaded.',
        );
        setFeeSummary(null);
      }

      if (documentsResult.status === 'fulfilled') {
        setDocuments(documentsResult.value.data);
      } else {
        const error = documentsResult.reason;
        setDocumentsError(
          error instanceof ApiError && error.statusCode === 403
            ? 'You do not have permission to view this student’s documents.'
            : 'Documents could not be loaded.',
        );
        setDocuments([]);
      }

      setIsFeeLoading(false);
      setIsDocumentsLoading(false);
    }

    void loadRelated();

    return () => {
      cancelled = true;
    };
  }, [student]);

  useEffect(() => {
    if (!canLinkParents || !student) {
      return;
    }
    const studentId = student.id;
    const term = parentSearch.trim();
    if (term.length < 2) {
      setParentCandidates([]);
      setIsSearchingParents(false);
      return;
    }

    let cancelled = false;
    setIsSearchingParents(true);

    const timer = window.setTimeout(() => {
      void searchParentCandidates(studentId, term)
        .then((candidates) => {
          if (!cancelled) {
            const linkedIds = new Set(linkedParents.map((parent) => parent.parentUserId));
            setParentCandidates(candidates.filter((candidate) => !linkedIds.has(candidate.id)));
            setLinkSeverity('info');
            setLinkMessage(null);
          }
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }
          setParentCandidates([]);
          setLinkSeverity('error');
          setLinkMessage(
            error instanceof ApiError && error.statusCode === 403
              ? 'You do not have permission to search parent accounts.'
              : error instanceof Error
                ? error.message
                : 'Parent search failed',
          );
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearchingParents(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canLinkParents, linkedParents, parentSearch, student]);

  async function refreshLinkedParents(studentId: string): Promise<void> {
    const parents = await listLinkedParents(studentId);
    setLinkedParents(parents);
  }

  async function submitParentLink(parentUserId: string): Promise<void> {
    if (!student) {
      return;
    }
    const studentId = student.id;
    const validationError = requiredText(parentUserId, 'Parent account', 8);
    if (validationError) {
      setLinkSeverity('error');
      setLinkMessage(validationError);
      return;
    }

    setIsLinking(true);
    setLinkMessage(null);
    try {
      await linkParent(studentId, parentUserId.trim());
      setLinkSeverity('success');
      setLinkMessage('Parent linked');
      setSelectedParent(null);
      setParentSearch('');
      setParentCandidates([]);
      await refreshLinkedParents(studentId);
    } catch (error) {
      setLinkSeverity('error');
      setLinkMessage(error instanceof ApiError ? error.message : 'Failed to link parent');
    } finally {
      setIsLinking(false);
    }
  }

  async function viewDocument(documentId: string): Promise<void> {
    try {
      const blob = await downloadGeneratedDocument(documentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'The document could not be opened.');
    }
  }

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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading student" />
      </Box>
    );
  }

  if (errorMessage || !student) {
    return <Alert severity="error">{errorMessage ?? 'Failed to load student'}</Alert>;
  }

  const hasFeeRecords = (feeSummary?.fees.length ?? 0) > 0;
  const canProvisionLogin = canSendInvite && !student.userId && student.status === 'ACTIVE';

  async function handleProvisionLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!student) {
      return;
    }
    const studentId = student.id;
    const studentName = getStudentDisplayName(student);
    const emailError = validateEmail(provisionEmail) ?? null;
    setProvisionEmailError(emailError);
    if (emailError) {
      return;
    }
    setIsProvisioning(true);
    setProvisionError(null);
    try {
      const result = await provisionStudentLogin(studentId, provisionEmail.trim());
      setStudent((current) => (current ? { ...current, userId: result.userId } : current));
      setLoginEmail(result.loginEmail);
      setProvisionDialogOpen(false);
      setProvisionEmail('');
      showSuccess('Login invite sent');
      setInviteDialogData({
        name: studentName,
        inviteUrl: result.inviteUrl,
        inviteExpiresAt: result.inviteExpiresAt,
      });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setProvisionError('You do not have permission to create login accounts.');
      } else {
        setProvisionError(error instanceof Error ? error.message : 'Failed to create login account');
      }
    } finally {
      setIsProvisioning(false);
    }
  }

  return (
    <>
    <DetailPageShell
      title={getStudentDisplayName(student)}
      description={`Student code ${student.studentCode}`}
      icon={SchoolOutlined}
      actions={
        <>
          <Button component={Link} href="/students" variant="outlined">
            Back to students
          </Button>
          {canEdit ? (
            <Button component={Link} href={`/students/${student.id}/edit`} variant="outlined">
              Edit
            </Button>
          ) : null}
          {canProvisionLogin ? (
            <Button variant="contained" onClick={() => setProvisionDialogOpen(true)}>
              Send invite
            </Button>
          ) : null}
          {canGenerate && student.status === 'ACTIVE' ? (
            <Button
              component={Link}
              href={`/documents/generate?studentId=${student.id}`}
              variant="contained"
            >
              Generate bonafide
            </Button>
          ) : null}
        </>
      }
      meta={
        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary">
            Overview
          </Typography>
          <Avatar sx={{ bgcolor: 'primary.dark', width: 56, height: 56 }}>
            {getStudentInitials(student)}
          </Avatar>
          <Typography variant="body2" color="text.secondary">
            No photo is stored for this student.
          </Typography>
          <DetailFactRow label="Student code">{student.studentCode}</DetailFactRow>
          <DetailFactRow label="Status">
            <StatusChip status={student.status} label={formatStudentStatus(student.status)} />
          </DetailFactRow>
          <DetailFactRow label="Record created">{formatStudentDate(student.createdAt)}</DetailFactRow>
          <DetailFactRow label="Sign-in">{student.userId ? 'Linked' : 'Not set up yet'}</DetailFactRow>
          {loginEmail ? <DetailFactRow label="Login email">{loginEmail}</DetailFactRow> : null}
        </Stack>
      }
    >
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Academic details</Typography>
            <DetailFactRow label={t.unit}>{formatStudentClassLabel(student)}</DetailFactRow>
            <DetailFactRow label={t.group}>{displayValue(student.section)}</DetailFactRow>
            {usesTerms(t.institutionType) ? (
              <DetailFactRow label={`Current ${t.term.toLowerCase()}`}>{displayValue(student.currentTerm?.toString())}</DetailFactRow>
            ) : null}
            <DetailFactRow label="Roll number">{displayValue(student.rollNumber)}</DetailFactRow>
            <DetailFactRow label="Academic year">{displayValue(student.academicYear)}</DetailFactRow>
            <DetailFactRow label="Date of birth">
              {student.dateOfBirth ? formatStudentDate(student.dateOfBirth) : '—'}
            </DetailFactRow>
            <Typography variant="body2" color="text.secondary">
              Admission date is not stored on the student record.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Parent and guardian</Typography>
            <DetailFactRow label="Guardian name">{displayValue(student.guardianName)}</DetailFactRow>
            <DetailFactRow label="Phone">{displayValue(student.guardianPhone)}</DetailFactRow>
            <Typography variant="body2" color="text.secondary">
              Guardian email and relationship are not stored separately from the guardian name.
            </Typography>

            {parentsError ? <Alert severity="warning">{parentsError}</Alert> : null}
            {!parentsError && linkedParents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No parent account is linked yet.
              </Typography>
            ) : null}
            {linkedParents.map((parent) => (
              <DetailFactRow key={parent.linkId} label="Linked account">
                {parent.name} · {parent.email}
              </DetailFactRow>
            ))}

            {canLinkParents ? (
              <>
                <Typography variant="subtitle2">Link a parent</Typography>
                <Typography variant="body2" color="text.secondary">
                  Search parent accounts in this institution by name or email, then link the one you select. An account that is already linked is left out of the results.
                </Typography>
                <TextField
                  label="Search parent accounts"
                  value={parentSearch}
                  onChange={(event) => {
                    setParentSearch(event.target.value);
                    setSelectedParent(null);
                  }}
                  placeholder="Name or email"
                  helperText={isSearchingParents ? 'Searching…' : 'Type at least 2 characters'}
                />
                {parentCandidates.length > 0 ? (
                  <List dense disablePadding aria-label="Parent accounts">
                    {parentCandidates.map((candidate) => (
                      <ListItemButton
                        key={candidate.id}
                        selected={selectedParent?.id === candidate.id}
                        onClick={() => setSelectedParent(candidate)}
                      >
                        <ListItemText primary={candidate.name} secondary={candidate.email} />
                      </ListItemButton>
                    ))}
                  </List>
                ) : null}
                {parentSearch.trim().length >= 2 && !isSearchingParents && parentCandidates.length === 0 && !linkMessage ? (
                  <Typography variant="body2" color="text.secondary">
                    No parent accounts match that search.
                  </Typography>
                ) : null}
                <Button
                  variant="outlined"
                  disabled={!selectedParent || isLinking}
                  onClick={() => {
                    if (selectedParent) {
                      void submitParentLink(selectedParent.id);
                    }
                  }}
                >
                  Link selected parent
                </Button>
                {canInviteParent ? (
                  <Typography variant="body2" color="text.secondary">
                    If the guardian has no account yet, create one from Staff with the Parent role and send the invite. Use the same email only once. That invite does not create a second account.
                  </Typography>
                ) : null}
                {canInviteParent ? (
                  <Button component={Link} href="/staff/new" variant="text">
                    Invite a new parent
                  </Button>
                ) : null}
                {linkMessage ? <Alert severity={linkSeverity}>{linkMessage}</Alert> : null}
              </>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {isAttendanceEnabled() && canViewAttendance ? (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Attendance</Typography>
            <Typography variant="body2" color="text.secondary">
              CampusOps records staff attendance. This profile has no student attendance history, so a percentage is not shown.
            </Typography>
            <Button component={Link} href="/attendance" variant="outlined">
              Open attendance
            </Button>
          </Stack>
        </CardContent>
      </Card>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Fees</Typography>
            {isFeeLoading ? <CircularProgress size={22} aria-label="Loading fees" /> : null}
            {feeError ? <Alert severity="warning">{feeError}</Alert> : null}
            {!isFeeLoading && !feeError && !hasFeeRecords ? (
              <Typography variant="body2" color="text.secondary">
                No fees are assigned to this student.
              </Typography>
            ) : null}
            {!isFeeLoading && !feeError && feeSummary && hasFeeRecords ? (
              <>
                <DetailFactRow label="Total fees">{formatCurrency(feeSummary.totalAssigned)}</DetailFactRow>
                <DetailFactRow label="Paid">{formatCurrency(feeSummary.totalPaid)}</DetailFactRow>
                <DetailFactRow label="Outstanding">{formatCurrency(feeSummary.totalOutstanding)}</DetailFactRow>
              </>
            ) : null}
            {canViewFees ? (
              <Button component={Link} href="/fees" variant="outlined">
                Open fees
              </Button>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Documents</Typography>
            {isDocumentsLoading ? <CircularProgress size={22} aria-label="Loading documents" /> : null}
            {documentsError ? <Alert severity="warning">{documentsError}</Alert> : null}
            {!isDocumentsLoading && !documentsError && documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No documents have been generated for this student.
              </Typography>
            ) : null}
            {documents.map((document) => (
              <Stack
                key={document.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
              >
                <Typography variant="body2">
                  {formatDocumentType(document.documentType)} · {formatStudentDate(document.createdAt)}
                </Typography>
                <Button variant="outlined" onClick={() => void viewDocument(document.id)}>
                  View
                </Button>
              </Stack>
            ))}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {canViewDocuments ? (
                <Button component={Link} href="/documents" variant="outlined">
                  Open documents
                </Button>
              ) : null}
              {canGenerate && student.status === 'ACTIVE' ? (
                <Button
                  component={Link}
                  href={`/documents/generate?studentId=${student.id}`}
                  variant="outlined"
                >
                  Generate document
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {student.status !== 'ACTIVE' ? (
        <Alert severity="info">
          Only active students can be used for bonafide certificate generation.
        </Alert>
      ) : null}
    </DetailPageShell>

    <Dialog
      open={provisionDialogOpen}
      onClose={() => {
        if (!isProvisioning) {
          setProvisionDialogOpen(false);
        }
      }}
      fullWidth
      maxWidth="sm"
    >
      <Box component="form" onSubmit={(event) => void handleProvisionLogin(event)}>
        <DialogTitle>Send sign-in invite</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This creates a Student login for {getStudentDisplayName(student)}. They set their own password from the link.
            </Typography>
            <TextField
              label="Login email"
              type="email"
              value={provisionEmail}
              onChange={(event) => setProvisionEmail(event.target.value)}
              required
              error={Boolean(provisionEmailError)}
              helperText={provisionEmailError ?? 'Used only for this student sign-in'}
              fullWidth
              autoFocus
            />
            {provisionError ? <Alert severity="error">{provisionError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProvisionDialogOpen(false)} disabled={isProvisioning}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isProvisioning || !provisionEmail.trim()}>
            {isProvisioning ? 'Sending invite…' : 'Send invite'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>

    <Dialog open={Boolean(inviteDialogData)} onClose={() => setInviteDialogData(null)} fullWidth maxWidth="sm">
      <DialogTitle>Login created for {inviteDialogData?.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="success">Share this invite link — it expires in 60 minutes.</Alert>
          <TextField value={inviteDialogData?.inviteUrl ?? ''} fullWidth InputProps={{ readOnly: true }} />
          <Button
            variant="outlined"
            onClick={() => {
              if (!inviteDialogData?.inviteUrl) {
                return;
              }
              void navigator.clipboard.writeText(inviteDialogData.inviteUrl).then(() => {
                setInviteCopied(true);
                window.setTimeout(() => setInviteCopied(false), 2000);
              });
            }}
          >
            {inviteCopied ? 'Copied!' : 'Copy link'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            The student will be prompted to set their own password when they open the link.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setInviteDialogData(null)}>Done</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
