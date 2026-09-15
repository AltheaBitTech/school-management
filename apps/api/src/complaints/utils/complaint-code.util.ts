import { COMPLAINT_CODE_PATTERN, COMPLAINT_CODE_PREFIX } from '../constants/complaint.constants';

export function formatComplaintCode(sequence: number): string {
  return `${COMPLAINT_CODE_PREFIX}${String(sequence).padStart(6, '0')}`;
}

export function isValidComplaintCode(code: string): boolean {
  return COMPLAINT_CODE_PATTERN.test(code);
}

export function parseComplaintCodeSequence(code: string): number | null {
  if (!code.startsWith(COMPLAINT_CODE_PREFIX)) {
    return null;
  }

  const suffix = code.slice(COMPLAINT_CODE_PREFIX.length);
  if (!/^[0-9]+$/.test(suffix)) {
    return null;
  }

  const sequence = Number.parseInt(suffix, 10);
  return Number.isNaN(sequence) ? null : sequence;
}
