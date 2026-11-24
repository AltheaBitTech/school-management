'use client';

import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import type { TableProps } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';

interface AppTableProps {
  children: React.ReactNode;
  minWidth?: number;
  'aria-label'?: string;
  /** On phones, render each row as a labelled card instead of a sideways-scrolling table. */
  mobileCards?: boolean;
}

/**
 * Copies each header cell's text onto the body cells in the same column as `data-label`,
 * so the mobile card layout can show "Label  value" pairs without each page passing labels.
 */
export function applyHeaderLabels(table: HTMLTableElement): void {
  const headerRow = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!headerRow) {
    return;
  }

  const labels: string[] = [];
  for (const cell of Array.from(headerRow.cells)) {
    const text = (cell.textContent ?? '').trim();
    for (let span = 0; span < Math.max(cell.colSpan, 1); span += 1) {
      labels.push(text);
    }
  }

  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      let column = 0;
      for (const cell of Array.from(row.cells)) {
        const label = cell.colSpan > 1 ? '' : (labels[column] ?? '');
        if (cell.getAttribute('data-label') !== label) {
          cell.setAttribute('data-label', label);
        }
        column += Math.max(cell.colSpan, 1);
      }
    }
  }
}

function useHeaderLabels(enabled: boolean) {
  const ref = useRef<HTMLTableElement>(null);

  useLayoutEffect(() => {
    const table = ref.current;
    if (!enabled || !table) {
      return undefined;
    }
    applyHeaderLabels(table);
    const observer = new MutationObserver(() => applyHeaderLabels(table));
    observer.observe(table, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}

function mobileCardSx(nested: boolean) {
  return (theme: Theme) => ({
    [theme.breakpoints.down('sm')]: {
      minWidth: 0,
      '&, & tbody, & tr, & td': { display: 'block', width: '100%' },
      '& thead': { display: 'none' },
      '& tbody tr': nested
        ? {
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }
        : {
            position: 'relative',
            mb: 1.5,
            px: 2,
            py: 1.25,
            border: 1,
            borderColor: 'divider',
            borderRadius: '16px',
            bgcolor: 'background.paper',
            boxShadow: 'var(--mui-palette-brand-shadow)',
          },
      '& tbody tr:last-of-type': nested ? { borderBottom: 0 } : { mb: 0 },
      '& tbody td': {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 0,
        py: nested ? 0.5 : 0.75,
        border: 0,
        textAlign: 'right',
        minHeight: nested ? 28 : 36,
        wordBreak: 'break-word',
        '& > *': { maxWidth: '100%' },
      },
      ...(nested
        ? {}
        : { '& tbody td + td': { borderTop: 1, borderColor: 'divider', borderTopStyle: 'dashed' } }),
      '& tbody td::before': {
        content: 'attr(data-label)',
        flexShrink: 0,
        maxWidth: '45%',
        textAlign: 'left',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      },
      '& tbody td[data-label=""]': { justifyContent: 'flex-end' },
      '& tbody td[data-label=""]::before': { display: 'none' },
      '& tbody td:first-of-type': { fontWeight: 650 },
      '& tbody td[colspan]': { justifyContent: 'center', textAlign: 'center' },
    },
  });
}

type ResponsiveTableProps = TableProps & {
  /** Keep a sideways-scrolling table on phones instead of stacked rows. */
  mobileCards?: boolean;
};

/**
 * A bare table (no outer Paper) for use inside an existing Card/Paper — e.g. report breakdowns.
 * On phones each row stacks into labelled "Label  value" lines separated by dividers.
 */
export function ResponsiveTable({ mobileCards = true, sx, children, ...props }: ResponsiveTableProps) {
  const tableRef = useHeaderLabels(mobileCards);
  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table
        ref={tableRef}
        {...props}
        sx={[mobileCards ? mobileCardSx(true) : {}, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        {children}
      </Table>
    </TableContainer>
  );
}

export function AppTable({
  children,
  minWidth = 720,
  'aria-label': ariaLabel,
  mobileCards = true,
}: AppTableProps) {
  const tableRef = useHeaderLabels(mobileCards);

  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        overflow: 'hidden',
        ...(mobileCards
          ? {
              [theme.breakpoints.down('sm')]: {
                overflow: 'visible',
                border: 0,
                boxShadow: 'none',
                bgcolor: 'transparent',
                borderRadius: 0,
              },
            }
          : {}),
      })}
    >
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table
          ref={tableRef}
          aria-label={ariaLabel}
          sx={[{ minWidth }, mobileCards ? mobileCardSx(false) : {}]}
        >
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
    <Box aria-label={label} aria-busy="true">
      <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
        {rows.slice(0, 3).map((row) => (
          <Paper key={row} variant="outlined" sx={{ p: 2 }}>
            <Skeleton variant="text" width="55%" sx={{ mb: 1 }} />
            {columns.slice(1).map((column) => (
              <Stack key={column} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="35%" />
              </Stack>
            ))}
          </Paper>
        ))}
      </Stack>
      <Paper variant="outlined" sx={{ overflow: 'hidden', display: { xs: 'none', sm: 'block' } }}>
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
    </Box>
  );
}

interface EmptyStateProps {
  message: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export function EmptyState({ message, icon: Icon = InboxOutlined, action }: EmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 3,
        py: { xs: 5, sm: 8 },
        textAlign: 'center',
        borderStyle: 'dashed',
        backgroundImage: 'radial-gradient(circle at 50% 0%, var(--mui-palette-primary-light) 0%, transparent 55%)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 72,
          height: 72,
          mx: 'auto',
          mb: 2.5,
          borderRadius: '20px',
          background: 'var(--mui-palette-brand-gradientSoft)',
          border: 1,
          borderColor: 'divider',
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--mui-palette-brand-shadow)',
        }}
      >
        <Icon sx={{ fontSize: 32 }} />
      </Box>
      <Typography
        color="text.secondary"
        sx={{ mb: action ? 3 : 0, maxWidth: 440, mx: 'auto', fontWeight: 500 }}
      >
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
    <Stack
      direction="row"
      spacing={1}
      justifyContent={{ xs: 'space-between', sm: 'flex-end' }}
      alignItems="center"
    >
      <Button
        variant="outlined"
        size="small"
        startIcon={<ChevronLeftOutlined />}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ px: 1, fontVariantNumeric: 'tabular-nums' }}>
        Page {page} of {totalPages}
      </Typography>
      <Button
        variant="outlined"
        size="small"
        endIcon={<ChevronRightOutlined />}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </Stack>
  );
}
