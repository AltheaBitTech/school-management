'use client';

import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import FilterListOutlined from '@mui/icons-material/FilterListOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

interface ListPageShellProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function ListPageShell({
  title,
  description,
  icon,
  actions,
  filters,
  footer,
  children,
}: ListPageShellProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <Stack spacing={{ xs: 2.5, sm: 3 }}>
      <PageHeader title={title} description={description} icon={icon} actions={actions} />

      {filters ? (
        <Box>
          {/* Phones: filters collapse behind a toggle so results stay above the fold. */}
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            startIcon={<FilterListOutlined />}
            endIcon={
              <ExpandMoreOutlined
                sx={{ transition: 'transform 200ms ease', transform: filtersOpen ? 'rotate(180deg)' : 'none' }}
              />
            }
            sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'space-between', mb: filtersOpen ? 1.5 : 0 }}
          >
            <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>
              {filtersOpen ? 'Hide filters' : 'Filters'}
            </Box>
          </Button>
          <Paper
            variant="outlined"
            sx={{ p: 2, display: { xs: filtersOpen ? 'block' : 'none', sm: 'block' } }}
          >
            {filters}
          </Paper>
        </Box>
      ) : null}

      {children}

      {footer}
    </Stack>
  );
}
