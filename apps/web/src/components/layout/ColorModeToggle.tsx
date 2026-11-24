'use client';

import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlined from '@mui/icons-material/SettingsBrightnessOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';
import { useState } from 'react';

type Mode = 'light' | 'dark' | 'system';

const OPTIONS: { value: Mode; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: LightModeOutlined },
  { value: 'dark', label: 'Dark', icon: DarkModeOutlined },
  { value: 'system', label: 'System', icon: SettingsBrightnessOutlined },
];

export function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const resolved = mode === 'system' ? systemMode : mode;
  const TriggerIcon = resolved === 'dark' ? DarkModeOutlined : LightModeOutlined;

  return (
    <>
      <Tooltip title="Appearance">
        <IconButton
          aria-label="Change appearance"
          aria-haspopup="menu"
          aria-expanded={anchorEl ? 'true' : undefined}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <TriggerIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 168 } } }}
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = (mode ?? 'system') === option.value;
          return (
            <MenuItem
              key={option.value}
              selected={selected}
              onClick={() => {
                setMode(option.value);
                setAnchorEl(null);
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={option.label} />
              {selected ? <CheckOutlined fontSize="small" sx={{ ml: 1, color: 'primary.main' }} /> : null}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
