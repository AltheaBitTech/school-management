'use client';

import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState, TableIconLink } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Link from 'next/link';
import { ApiError, apiClient } from '@/lib/api/client';

interface TemplateRow {
  documentType: string;
  name: string;
  version: number;
  title: string;
  editable: boolean;
}

const LABELS: Record<string, string> = {
  BONAFIDE_CERTIFICATE: 'Bonafide certificate',
  CHARACTER_CERTIFICATE: 'Character certificate',
  EXPERIENCE_LETTER: 'Experience letter',
  SALARY_CERTIFICATE: 'Salary certificate',
  VISITOR_PASS: 'Visitor pass',
  STUDENT_ID_CARD: 'Student ID card',
  STAFF_ID_CARD: 'Staff ID card',
};

export default function DocumentTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    void apiClient
      .get<{ data: TemplateRow[] }>('/documents/templates', { auth: true })
      .then((response) => setRows(response.data))
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Could not load templates');
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isForbidden) return <ForbiddenState />;

  return (
    <ListPageShell
      title="Certificate wording"
      description="Edit the title and body of letters. ID cards and visitor passes use the ID card layout instead."
      icon={ArticleOutlined}
      actions={
        <Button component={Link} href="/settings/documents" variant="outlined">
          ID card layout
        </Button>
      }
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {isLoading ? <LoadingState label="Loading templates" columnCount={4} /> : null}
      {!isLoading && rows.length === 0 ? (
        <EmptyState icon={ArticleOutlined} message="No templates are seeded for this school yet." />
      ) : null}
      {!isLoading && rows.length > 0 ? (
        <AppTable minWidth={640} aria-label="Document templates">
          <TableHead>
            <TableRow>
              <TableCell>Document</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Version</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.documentType} hover>
                <TableCell>{LABELS[row.documentType] ?? row.name}</TableCell>
                <TableCell>{row.editable ? row.title : 'Layout'}</TableCell>
                <TableCell>{row.version}</TableCell>
                <TableCell align="right">
                  {row.editable ? (
                    <TableIconLink href={`/documents/templates/${row.documentType}`} label="Edit wording" />
                  ) : (
                    <Button component={Link} href="/settings/documents" size="small">
                      Layout
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}
    </ListPageShell>
  );
}
