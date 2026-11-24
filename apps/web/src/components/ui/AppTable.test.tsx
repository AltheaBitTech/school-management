import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { AppTable } from '@/components/ui/AppTable';

describe('AppTable', () => {
  it('labels body cells with their column header for the mobile card layout', () => {
    render(
      <AppTable aria-label="Staff">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Asha</TableCell>
            <TableCell>Active</TableCell>
            <TableCell align="right">View</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>No more rows</TableCell>
          </TableRow>
        </TableBody>
      </AppTable>,
    );

    expect(screen.getByText('Asha')).toHaveAttribute('data-label', 'Name');
    expect(screen.getByText('Active')).toHaveAttribute('data-label', 'Status');
    expect(screen.getByText('View')).toHaveAttribute('data-label', '');
    expect(screen.getByText('No more rows')).toHaveAttribute('data-label', '');
  });

  it('skips labels when mobile cards are disabled', () => {
    render(
      <AppTable mobileCards={false}>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Ravi</TableCell>
          </TableRow>
        </TableBody>
      </AppTable>,
    );

    expect(screen.getByText('Ravi')).not.toHaveAttribute('data-label');
  });
});
