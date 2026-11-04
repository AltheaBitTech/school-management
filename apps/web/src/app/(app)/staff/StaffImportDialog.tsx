'use client';

import Button from '@mui/material/Button';
import { useState } from 'react';
import { CsvImportDialog } from '@/components/import/CsvImportDialog';
import type { ImportCommitRow } from '@/lib/imports/csv-transfer';
import {
  downloadStaffImportGuidePdf,
  downloadStaffImportSampleCsv,
  importStaffCsv,
  previewStaffCsv,
} from '@/lib/staff/staff-client';

interface StaffImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

function CopyLinkButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button size="small" onClick={() => void handleCopy()}>
      {copied ? 'Copied!' : 'Copy link'}
    </Button>
  );
}

export function StaffImportDialog({ open, onClose, onImported }: StaffImportDialogProps) {
  return (
    <CsvImportDialog
      open={open}
      title="Import staff from CSV"
      noun="staff member"
      description="Required columns are firstName, lastName, email, and employeeCode. Optional columns are designation, departmentCode, joiningDate, phone, and roleCode. A blank roleCode becomes TEACHER. STUDENT cannot be assigned here."
      errorReportFilename="campusops-staff-import-errors.csv"
      onClose={onClose}
      onImported={onImported}
      onDownloadSample={downloadStaffImportSampleCsv}
      onDownloadGuide={downloadStaffImportGuidePdf}
      onPreview={previewStaffCsv}
      onCommit={importStaffCsv}
      renderImportedExtra={(row: ImportCommitRow) =>
        row.inviteUrl ? <CopyLinkButton inviteUrl={row.inviteUrl} /> : '—'
      }
    />
  );
}
