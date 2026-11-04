'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { ReactNode, useState } from 'react';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { ApiError } from '@/lib/api/client';
import {
  buildImportErrorReportCsv,
  downloadTextFile,
  type ImportCommitResult,
  type ImportCommitRow,
  type ImportPreviewResult,
} from '@/lib/imports/csv-transfer';

interface CsvImportDialogProps {
  open: boolean;
  title: string;
  noun: string;
  description: string;
  errorReportFilename: string;
  onClose: () => void;
  onImported: () => void;
  onDownloadSample: () => Promise<void>;
  onDownloadGuide: () => Promise<void>;
  onPreview: (file: File) => Promise<ImportPreviewResult>;
  onCommit: (file: File) => Promise<ImportCommitResult>;
  renderImportedExtra?: (row: ImportCommitRow) => ReactNode;
}

function statusLabel(status: string): string {
  if (status === 'valid' || status === 'imported') return 'Ready';
  if (status === 'duplicate') return 'Duplicate';
  return 'Needs a fix';
}

export function CsvImportDialog({
  open,
  title,
  noun,
  description,
  errorReportFilename,
  onClose,
  onImported,
  onDownloadSample,
  onDownloadGuide,
  onPreview,
  onCommit,
  renderImportedExtra,
}: CsvImportDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSuccess } = useAppSnackbar();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportCommitResult | null>(null);

  function reset(): void {
    setFile(null);
    setErrorMessage(null);
    setPreview(null);
    setResult(null);
  }

  function handleClose(): void {
    if (isLoading) {
      return;
    }
    reset();
    onClose();
  }

  async function handlePreview(): Promise<void> {
    if (!file) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setPreview(await onPreview(file));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'The CSV could not be checked');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCommit(): Promise<void> {
    if (!file || !preview || preview.validRows === 0) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const importResult = await onCommit(file);
      setResult(importResult);
      setPreview(null);
      if (importResult.imported > 0) {
        showSuccess(
          `${importResult.imported} ${noun}${importResult.imported === 1 ? '' : 's'} imported`,
        );
        onImported();
      }
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'The CSV could not be imported');
    } finally {
      setIsLoading(false);
    }
  }

  const importedRows = result?.rows.filter((row) => row.status === 'imported') ?? [];
  const failedRows = result?.rows.filter((row) => row.status !== 'imported') ?? [];
  const duplicateRows = failedRows.filter((row) => row.category === 'duplicate');

  return (
    <Dialog open={open} onClose={handleClose} fullScreen={fullScreen} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary" variant="body2">
            {description} The CSV is the file that gets imported. The PDF is only the instruction guide.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="text" onClick={() => void onDownloadSample().catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Download failed'))}>
              Download sample CSV
            </Button>
            <Button variant="text" onClick={() => void onDownloadGuide().catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Download failed'))}>
              Download import guide (PDF)
            </Button>
          </Stack>

          {result ? (
            <>
              <Alert severity={result.imported > 0 ? 'success' : 'warning'}>
                {result.imported} imported. {result.skipped} not saved
                {duplicateRows.length > 0 ? `, including ${duplicateRows.length} duplicate${duplicateRows.length === 1 ? '' : 's'}` : ''}.
                Invalid and duplicate rows were not saved. Correct the CSV and check it again to include them.
              </Alert>
              {importedRows.length > 0 ? (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" aria-label="Imported rows">
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Name</TableCell>
                        {renderImportedExtra ? <TableCell>Invite</TableCell> : null}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importedRows.map((row) => (
                        <TableRow key={`imported-${row.row}`}>
                          <TableCell>{row.row}</TableCell>
                          <TableCell>{row.name ?? row.studentCode ?? row.employeeCode ?? '—'}</TableCell>
                          {renderImportedExtra ? <TableCell>{renderImportedExtra(row)}</TableCell> : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ) : null}
              {failedRows.length > 0 ? (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" aria-label="Rows that were not saved">
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Outcome</TableCell>
                        <TableCell>Column</TableCell>
                        <TableCell>Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {failedRows.map((row) => (
                        <TableRow key={`failed-${row.row}`}>
                          <TableCell>{row.row}</TableCell>
                          <TableCell>{row.category === 'duplicate' ? 'Duplicate' : 'Needs a fix'}</TableCell>
                          <TableCell>{row.column ?? '—'}</TableCell>
                          <TableCell>{row.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ) : null}
              {failedRows.length > 0 ? (
                <Button
                  variant="outlined"
                  onClick={() =>
                    downloadTextFile(
                      errorReportFilename,
                      buildImportErrorReportCsv(result.rows),
                      'text/csv;charset=utf-8',
                    )
                  }
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Download error report
                </Button>
              ) : null}
            </>
          ) : null}

          {preview ? (
            <>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${preview.totalRows} rows`} />
                <Chip color="success" label={`${preview.validRows} valid`} />
                <Chip color="warning" label={`${preview.invalidRows} need a fix`} />
                <Chip label={`${preview.duplicateRows} duplicates`} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {preview.validRows > 0
                  ? `${preview.validRows} ${noun}${preview.validRows === 1 ? '' : 's'} will be created. Rows that need a fix or are duplicates will not be saved.`
                  : 'Nothing will be saved until the file has at least one valid row.'}
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" aria-label="CSV preview">
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Record</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>What to fix</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.rows.map((row) => (
                      <TableRow key={`preview-${row.row}`}>
                        <TableCell>{row.row}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.label}</Typography>
                          {row.detail ? (
                            <Typography variant="caption" color="text.secondary">
                              {row.detail}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>{statusLabel(row.status)}</TableCell>
                        <TableCell>
                          {row.errors.length === 0
                            ? '—'
                            : row.errors.map((error) => `${error.column}: ${error.message}`).join('; ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          ) : null}

          {!result ? (
            <>
              <Button variant="outlined" component="label" sx={{ alignSelf: 'flex-start' }}>
                Choose CSV file
                <input
                  hidden
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setPreview(null);
                    setErrorMessage(null);
                  }}
                />
              </Button>
              {file ? (
                <Typography variant="body2">
                  Selected file: <strong>{file.name}</strong>
                </Typography>
              ) : null}
            </>
          ) : null}

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {isLoading ? (
            <Stack spacing={1}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary">
                {preview ? `Importing ${noun}s…` : 'Checking the CSV…'}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Close
        </Button>
        {!result && preview ? (
          <Button onClick={() => setPreview(null)} disabled={isLoading}>
            Choose a different file
          </Button>
        ) : null}
        {result ? (
          <Button
            onClick={() => {
              setResult(null);
              setFile(null);
              setErrorMessage(null);
            }}
            disabled={isLoading}
          >
            Check another file
          </Button>
        ) : null}
        {!result && !preview ? (
          <Button variant="contained" onClick={() => void handlePreview()} disabled={!file || isLoading}>
            Check file
          </Button>
        ) : null}
        {!result && preview ? (
          <Button
            variant="contained"
            onClick={() => void handleCommit()}
            disabled={isLoading || preview.validRows === 0}
          >
            Import {preview.validRows} valid {preview.validRows === 1 ? 'row' : 'rows'}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
