/**
 * Suggests the next code in a prefixed numeric sequence (e.g. emp-001, emp-002).
 */
export function suggestNextPrefixedCode(
  existingCodes: string[],
  options: { prefix: string; padLength?: number },
): string {
  const prefix = options.prefix.toLowerCase();
  const padLength = options.padLength ?? 3;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}(\\d+)$`, 'i');

  let maxSequence = 0;
  for (const code of existingCodes) {
    const match = code.trim().toLowerCase().match(pattern);
    if (match) {
      maxSequence = Math.max(maxSequence, Number.parseInt(match[1], 10));
    }
  }

  const next = maxSequence + 1;
  return `${prefix}${String(next).padStart(padLength, '0')}`;
}
