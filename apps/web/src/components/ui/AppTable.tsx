'use client';

import InboxOutlined from '@mui/icons-material/InboxOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

interface AppTableProps {
  children: React.ReactNode;
  minWidth?: number;
  'aria-label'?: string;
}

export function AppTable({ children, minWidth = 720, 'aria-label': ariaLabel }: AppTableProps) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth }} aria-label={ariaLabel}>
          {children}
        </Table>
      </TableContainer>
    </Paper>
  );
}

interface TableIconLinkProps {
  href: string;
  label?: string;
  icon?: React.ElementType;
}

export function TableIconLink({
  href,
  label = 'View',
  icon: Icon = VisibilityOutlined,
}: TableIconLinkProps) {
  return (
    <Tooltip title={label}>
      <IconButton component={Link} href={href} size="small" aria-label={label}>
        <Icon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

interface LoadingStateProps {
  label: string;
  columnCount?: number;
  rowCount?: number;
  minWidth?: number;
}

export function LoadingState({
  label,
  columnCount = 4,
  rowCount = 5,
  minWidth = 720,
}: LoadingStateProps) {
  const columns = Array.from({ length: columnCount }, (_, index) => index);
  const rows = Array.from({ length: rowCount }, (_, index) => index);

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }} aria-label={label}>
      <TableContainer>
        <Table sx={{ minWidth }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column}>
                  <Skeleton variant="text" width="70%" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row}>
                {columns.map((column) => (
                  <TableCell key={column}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

interface EmptyStateProps {
  message: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export function EmptyState({ message, icon: Icon = InboxOutlined, action }: EmptyStateProps) {
  return (
    <Paper variant="outlined" sx={{ px: 3, py: 5, textAlign: 'center' }}>
      <Icon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
      <Typography color="text.secondary" sx={{ mb: action ? 2 : 0 }}>
        {message}
      </Typography>
      {action ? <Box>{action}</Box> : null}
    </Paper>
  );
}

interface TablePaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function TablePaginationBar({ page, totalPages, onPageChange }: TablePaginationBarProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" flexWrap="wrap" useFlexGap>
      <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <Typography variant="body2" color="text.secondary">
        Page {page} of {totalPages}
      </Typography>
      <Button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </Stack>
  );
}
