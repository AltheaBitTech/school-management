'use client';

import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { PermissionCatalogGroup } from '@/lib/rbac/roles-client';

interface PermissionPickerProps {
  groups: PermissionCatalogGroup[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}

/** Module-by-module permission checklist used by the role editor. */
export function PermissionPicker({ groups, selected, onChange, disabled = false }: PermissionPickerProps) {
  function toggle(code: string, checked: boolean): void {
    const next = new Set(selected);
    if (checked) {
      next.add(code);
    } else {
      next.delete(code);
    }
    onChange(next);
  }

  function toggleGroup(group: PermissionCatalogGroup, checked: boolean): void {
    const next = new Set(selected);
    for (const permission of group.permissions) {
      if (checked) {
        next.add(permission.code);
      } else {
        next.delete(permission.code);
      }
    }
    onChange(next);
  }

  return (
    <Box>
      {groups.map((group) => {
        const selectedCount = group.permissions.filter((p) => selected.has(p.code)).length;
        const allSelected = selectedCount === group.permissions.length;
        const someSelected = selectedCount > 0 && !allSelected;

        return (
          <Accordion key={group.key} disableGutters variant="outlined" sx={{ '&:not(:last-of-type)': { borderBottom: 0 } }}>
            <AccordionSummary
              expandIcon={<ExpandMoreOutlined />}
              aria-controls={`permissions-${group.key}`}
              id={`permissions-${group.key}-header`}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={disabled}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => toggleGroup(group, event.target.checked)}
                  inputProps={{ 'aria-label': `Select all ${group.label} permissions` }}
                />
                <Typography sx={{ fontWeight: 600 }}>{group.label}</Typography>
                <Chip
                  size="small"
                  label={`${selectedCount}/${group.permissions.length}`}
                  color={selectedCount > 0 ? 'primary' : 'default'}
                  variant={selectedCount > 0 ? 'filled' : 'outlined'}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails id={`permissions-${group.key}`}>
              <Stack spacing={0.5} sx={{ pl: { xs: 0, sm: 5 } }}>
                {group.permissions.map((permission) => (
                  <FormControlLabel
                    key={permission.code}
                    control={
                      <Checkbox
                        size="small"
                        checked={selected.has(permission.code)}
                        disabled={disabled}
                        onChange={(event) => toggle(permission.code, event.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{permission.description}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {permission.code}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
