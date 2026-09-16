import { VISITOR_CODE_PATTERN, VISITOR_CODE_PREFIX } from '../constants/visitor.constants';

export function formatVisitorCode(sequence: number): string {
  return `${VISITOR_CODE_PREFIX}${String(sequence).padStart(6, '0')}`;
}

export function isValidVisitorCode(code: string): boolean {
  return VISITOR_CODE_PATTERN.test(code);
}

export function parseVisitorCodeSequence(code: string): number | null {
  if (!code.startsWith(VISITOR_CODE_PREFIX)) {
    return null;
  }

  const suffix = code.slice(VISITOR_CODE_PREFIX.length);
  if (!/^[0-9]+$/.test(suffix)) {
    return null;
  }

  const sequence = Number.parseInt(suffix, 10);
  return Number.isNaN(sequence) ? null : sequence;
}
