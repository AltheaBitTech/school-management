const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'resettoken',
  'tokenhash',
  'authorization',
  'secret',
  'apikey',
  'clientsecret',
  'servicerolekey',
]);

const REDACTED = '[REDACTED]';

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (SENSITIVE_KEYS.has(normalized)) {
    return true;
  }

  return (
    normalized.includes('password') ||
    normalized.includes('secret') ||
    normalized.endsWith('token') ||
    normalized.includes('apikey')
  );
}

export function sanitizeAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeAuditValue(entry));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        isSensitiveKey(key) ? REDACTED : sanitizeAuditValue(entry),
      ]),
    );
  }

  return value;
}
