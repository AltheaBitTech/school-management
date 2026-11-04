'use client';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';
import { downloadReportCsv } from '@/lib/reports/report-csv-download';

interface ReportExportCsvButtonProps {
  exportPath: string;
  queryParams: Record<string, string | number | boolean | undefined>;
  filename: string;
  rowCount: number;
  onError?: (message: string) => void;
}

export function ReportExportCsvButton({
  exportPath,
  queryParams,
  filename,
  rowCount,
  onError,
}: ReportExportCsvButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const canExport = rowCount > 0;

  const pdfPath = exportPath.replace(/export\.csv$/, 'export.pdf');
  const pdfName = filename.replace(/\.csv$/i, '.pdf');

  return (
    <Stack direction="row" spacing={1}>
      <Tooltip title={canExport ? '' : 'No rows to export for the current filters'}>
        <span>
          <Button
            variant="outlined"
            size="small"
            disabled={isExporting || !canExport}
            onClick={() => {
              setIsExporting(true);
              void downloadReportCsv(exportPath, queryParams, filename)
                .catch((error) =>
                  onError?.(error instanceof Error ? error.message : 'Export failed'),
                )
                .finally(() => setIsExporting(false));
            }}
          >
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </span>
      </Tooltip>
      <ReportExportPdfButton
        exportPath={pdfPath}
        queryParams={queryParams}
        filename={pdfName}
        rowCount={rowCount}
        onError={onError}
      />
    </Stack>
  );
}

export function ReportExportPdfButton({
  exportPath,
  queryParams,
  filename,
  rowCount,
  onError,
}: ReportExportCsvButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const canExport = rowCount > 0;
  const pdfPath = exportPath.replace(/export\.csv$/, 'export.pdf');
  const pdfName = filename.replace(/\.csv$/i, '.pdf');

  return (
    <Tooltip title={canExport ? '' : 'No rows to export for the current filters'}>
      <span>
        <Button
          variant="outlined"
          size="small"
          disabled={isExporting || !canExport}
          onClick={() => {
            setIsExporting(true);
            void downloadReportCsv(pdfPath, queryParams, pdfName)
              .catch((error) =>
                onError?.(error instanceof Error ? error.message : 'Export failed'),
              )
              .finally(() => setIsExporting(false));
          }}
        >
          {isExporting ? 'Exporting…' : 'Export PDF'}
        </Button>
      </span>
    </Tooltip>
  );
}
