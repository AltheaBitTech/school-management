import { Organization, OrganizationSettings } from '@prisma/client';

export function formatDocumentDate(value: Date): string {
  return value.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDocumentDateTime(value: Date): string {
  return value.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSalaryMonth(value: string): string {
  const [year, month] = value.split('-');
  if (!year || !month) {
    return value;
  }
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatCurrencyInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function shortDocumentReference(documentId: string): string {
  return documentId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function parseOrganizationContact(settings: OrganizationSettings | null): {
  city?: string;
  phone?: string;
  email?: string;
} {
  if (!settings?.documentSettings || typeof settings.documentSettings !== 'object') {
    return {};
  }

  const raw = settings.documentSettings as Record<string, unknown>;
  return {
    city: typeof raw.city === 'string' ? raw.city : undefined,
    phone: typeof raw.phone === 'string' ? raw.phone : undefined,
    email: typeof raw.contactEmail === 'string' ? raw.contactEmail : undefined,
  };
}

export function buildOrganizationBlock(
  organization: Organization,
  settings: OrganizationSettings | null,
): { name: string; city?: string; phone?: string; email?: string } {
  return {
    name: organization.name,
    ...parseOrganizationContact(settings),
  };
}

export function formatStaffDisplayName(staff: {
  firstName: string;
  lastName: string;
  displayName?: string | null;
}): string {
  if (staff.displayName?.trim()) {
    return staff.displayName.trim();
  }
  return `${staff.firstName} ${staff.lastName}`.trim();
}

export function splitClassName(className?: string | null): { class?: string; section?: string } {
  if (!className?.trim()) {
    return {};
  }
  const parts = className.trim().split('-');
  if (parts.length >= 2) {
    return { class: parts[0]?.trim(), section: parts.slice(1).join('-').trim() };
  }
  return { class: className.trim() };
}

export function currentAcademicYear(reference = new Date()): string {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const startYear = month >= 3 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
