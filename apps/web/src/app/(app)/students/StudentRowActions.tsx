'use client';

import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import FamilyRestroomOutlined from '@mui/icons-material/FamilyRestroomOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import Link from 'next/link';
import { useState } from 'react';
import { useCan } from '@/lib/auth/use-can';
import { isAttendanceEnabled } from '@/lib/features/feature-flags';
import { getStudentDisplayName, type Student } from '@/lib/students/students-client';

interface StudentRowActionsProps {
  student: Student;
}

interface RowAction {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  visible: boolean;
}

export function StudentRowActions({ student }: StudentRowActionsProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const canViewFees = useCan('fee.view');
  const canViewAttendance = useCan('student.attendance.view');
  const canGenerate = useCan('document.generate');

  const base = `/students/${student.id}`;
  const actions: RowAction[] = [
    { key: 'details', label: 'Student details', href: base, icon: PersonOutlined, visible: true },
    { key: 'fees', label: 'Fees', href: `${base}?tab=fees`, icon: PaymentsOutlined, visible: canViewFees },
    {
      key: 'attendance',
      label: 'Attendance',
      href: `${base}?tab=attendance`,
      icon: EventAvailableOutlined,
      visible: canViewAttendance && isAttendanceEnabled(),
    },
    { key: 'results', label: 'Results', href: `${base}?tab=results`, icon: AssignmentOutlined, visible: true },
    {
      key: 'parents',
      label: 'Linked parents',
      href: `${base}?tab=parents`,
      icon: FamilyRestroomOutlined,
      visible: true,
    },
    {
      key: 'id-card',
      label: 'Student ID card',
      href: `/documents/generate?studentId=${student.id}&type=STUDENT_ID_CARD`,
      icon: BadgeOutlined,
      visible: canGenerate && student.status === 'ACTIVE',
    },
  ];

  const menuId = `student-actions-${student.id}`;
  const label = `Options for ${getStudentDisplayName(student)}`;

  return (
    <>
      <Tooltip title="Options">
        <IconButton
          size="small"
          aria-label={label}
          aria-controls={anchorEl ? menuId : undefined}
          aria-haspopup="menu"
          aria-expanded={anchorEl ? 'true' : undefined}
          onClick={(event) => {
            event.stopPropagation();
            setAnchorEl(event.currentTarget);
          }}
        >
          <MoreVertOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        onClick={(event) => event.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {actions
          .filter((action) => action.visible)
          .map((action) => {
            const Icon = action.icon;
            return (
              <MenuItem
                key={action.key}
                component={Link}
                href={action.href}
                onClick={() => setAnchorEl(null)}
              >
                <ListItemIcon>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{action.label}</ListItemText>
              </MenuItem>
            );
          })}
      </Menu>
    </>
  );
}
