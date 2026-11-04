export function requiredText(value: string, label: string, min = 1): string | null {
  const trimmed = value.trim();
  if (trimmed.length < min) {
    return `${label} is required`;
  }
  return null;
}

export function optionalPositiveAmount(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return 'Amount must be zero or greater';
  }
  return null;
}
