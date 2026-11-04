'use client';

import { CsvImportDialog } from '@/components/import/CsvImportDialog';
import {
  downloadStudentImportGuidePdf,
  downloadStudentImportSampleCsv,
  importStudentsCsv,
  previewStudentsCsv,
} from '@/lib/students/students-client';

interface StudentImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function StudentImportDialog({ open, onClose, onImported }: StudentImportDialogProps) {
  return (
    <CsvImportDialog
      open={open}
      title="Import students from CSV"
      noun="student"
      description="Required columns are studentCode, firstName, lastName, studentClass, section, rollNumber, academicYear, guardianName, and guardianPhone. Optional columns are displayName and dateOfBirth. Academic year must look like 2025-2026."
      errorReportFilename="campusops-student-import-errors.csv"
      onClose={onClose}
      onImported={onImported}
      onDownloadSample={downloadStudentImportSampleCsv}
      onDownloadGuide={downloadStudentImportGuidePdf}
      onPreview={previewStudentsCsv}
      onCommit={importStudentsCsv}
    />
  );
}
