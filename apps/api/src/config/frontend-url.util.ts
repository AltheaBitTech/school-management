import { primaryFrontendOrigin } from './cors.util';

/** Email links use FRONTEND_URL when set, otherwise the first concrete CORS origin. */
export function resolveFrontendBaseUrl(
  corsOrigin: string | undefined,
  frontendUrl: string | undefined,
): string {
  const explicit = frontendUrl?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  return primaryFrontendOrigin(corsOrigin ?? 'http://localhost:3000');
}
