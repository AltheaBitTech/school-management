/** Comma-separated origins in CORS_ORIGIN; first non-wildcard entry is the primary frontend URL for email links. */
export function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => origin.length > 0);
}

function originPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+');
  return new RegExp(`^${escaped}$`);
}

export function isCorsOriginAllowed(requestOrigin: string, corsOriginConfig: string): boolean {
  const normalized = requestOrigin.replace(/\/$/, '');
  for (const pattern of parseCorsOrigins(corsOriginConfig)) {
    if (pattern.includes('*')) {
      if (originPatternToRegExp(pattern).test(normalized)) {
        return true;
      }
      continue;
    }
    if (pattern === normalized) {
      return true;
    }
  }
  return false;
}

export function primaryFrontendOrigin(raw: string): string {
  const origins = parseCorsOrigins(raw);
  const explicit = origins.find((origin) => !origin.includes('*'));
  return explicit ?? 'http://localhost:3000';
}
