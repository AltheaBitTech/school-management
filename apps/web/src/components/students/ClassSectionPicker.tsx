'use client';

import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import NextLink from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCan } from '@/lib/auth/use-can';
import { listClasses, type SchoolClass } from '@/lib/classes/classes-client';

export interface ClassSectionSelection {
  sectionId: string;
  className: string;
  sectionName: string;
}

interface ClassSectionPickerProps {
  /** Currently selected section ID ('' when none). */
  sectionId: string;
  onChange: (selection: ClassSectionSelection | null) => void;
  /**
   * Fallback for students saved before classes were set up: preselect by matching
   * these labels (case-insensitive) when sectionId is empty.
   */
  fallbackClassName?: string | null;
  fallbackSectionName?: string | null;
  classError?: string;
  sectionError?: string;
}

function sameLabel(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

/**
 * Class → Section dropdown pair backed by Classes & Sections. Renders as two fields so it
 * drops straight into a FormSection grid.
 */
export function ClassSectionPicker({
  sectionId,
  onChange,
  fallbackClassName,
  fallbackSectionName,
  classError,
  sectionError,
}: ClassSectionPickerProps) {
  const canManageClasses = useCan('class.manage');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listClasses({ status: 'ACTIVE' })
      .then((data) => {
        if (!cancelled) setClasses(data.filter((item) => item.sections.length > 0));
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Failed to load classes');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Preselect the class (and, for legacy records, the section) once classes have loaded.
  useEffect(() => {
    if (classes.length === 0 || classId) return;

    if (sectionId) {
      const owner = classes.find((item) => item.sections.some((section) => section.id === sectionId));
      if (owner) setClassId(owner.id);
      return;
    }

    if (fallbackClassName) {
      const owner = classes.find((item) => sameLabel(item.name, fallbackClassName));
      if (!owner) return;
      setClassId(owner.id);
      const section = owner.sections.find((item) => sameLabel(item.name, fallbackSectionName));
      if (section) {
        onChange({ sectionId: section.id, className: owner.name, sectionName: section.name });
      }
    }
    // onChange is intentionally excluded: callers pass inline handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, sectionId, fallbackClassName, fallbackSectionName, classId]);

  const selectedClass = useMemo(() => classes.find((item) => item.id === classId), [classes, classId]);

  function handleClassChange(nextClassId: string) {
    setClassId(nextClassId);
    const nextClass = classes.find((item) => item.id === nextClassId);
    // A class with a single section is selected in one step.
    if (nextClass && nextClass.sections.length === 1) {
      const only = nextClass.sections[0]!;
      onChange({ sectionId: only.id, className: nextClass.name, sectionName: only.name });
    } else {
      onChange(null);
    }
  }

  function handleSectionChange(nextSectionId: string) {
    const section = selectedClass?.sections.find((item) => item.id === nextSectionId);
    onChange(
      section && selectedClass
        ? { sectionId: section.id, className: selectedClass.name, sectionName: section.name }
        : null,
    );
  }

  if (!isLoading && !loadError && classes.length === 0) {
    return (
      <Alert severity="info">
        No classes are set up yet.{' '}
        {canManageClasses ? (
          <Link component={NextLink} href="/classes">
            Add classes and sections
          </Link>
        ) : (
          'Ask your school admin to add classes and sections'
        )}{' '}
        before adding students.
      </Alert>
    );
  }

  return (
    <>
      {loadError ? (
        <Alert severity="error">
          {loadError}
        </Alert>
      ) : null}
      <TextField
        select
        label="Class"
        value={selectedClass ? classId : ''}
        onChange={(event) => handleClassChange(event.target.value)}
        required
        disabled={isLoading}
        error={Boolean(classError)}
        helperText={classError ?? (isLoading ? 'Loading classes…' : undefined)}
        fullWidth
      >
        {classes.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Section"
        value={selectedClass?.sections.some((section) => section.id === sectionId) ? sectionId : ''}
        onChange={(event) => handleSectionChange(event.target.value)}
        required
        disabled={!selectedClass}
        error={Boolean(sectionError)}
        helperText={sectionError ?? (!selectedClass ? 'Pick a class first' : undefined)}
        fullWidth
      >
        {(selectedClass?.sections ?? []).map((section) => {
          const full = section.capacity !== null && section.studentCount >= section.capacity;
          return (
            <MenuItem key={section.id} value={section.id}>
              {section.name}
              {section.classTeacherName ? ` · ${section.classTeacherName}` : ''}
              {full ? ' (full)' : ''}
            </MenuItem>
          );
        })}
      </TextField>
    </>
  );
}
