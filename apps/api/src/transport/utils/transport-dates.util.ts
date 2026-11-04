export function rangesOverlap(
  startA: string,
  endA: string | null,
  startB: string,
  endB: string | null,
): boolean {
  const aEnd = endA ?? '9999-12-31';
  const bEnd = endB ?? '9999-12-31';
  return startA <= bEnd && startB <= aEnd;
}

export function coversDate(start: string, end: string | null, day: string): boolean {
  return start <= day && (end === null || end >= day);
}
