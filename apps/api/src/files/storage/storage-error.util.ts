import { MAX_FILE_SIZE_LABEL } from '../constants/file.constants';

/** Storage lives on the project origin. A copied URL often includes `/rest/v1`. */
export function storageProjectOrigin(supabaseUrl: string): string {
  return new URL(supabaseUrl).origin;
}

/**
 * Turns a Supabase Storage error into a sentence that is safe to show in the UI.
 * The raw body is logged by the caller. Secrets and tokens are not copied through.
 */
export function describeStorageFailure(status: number, bodyText: string): string {
  const providerMessage = readProviderMessage(bodyText);
  const lower = providerMessage.toLowerCase();

  if (status === 404 || lower.includes('bucket not found') || lower.includes('bucket does not exist')) {
    return 'Storage bucket was not found. SUPABASE_STORAGE_BUCKET must match the bucket name in Supabase (campusops-files).';
  }

  if (
    status === 401 ||
    status === 403 ||
    lower.includes('unauthorized') ||
    lower.includes('invalid jwt') ||
    lower.includes('jwt')
  ) {
    return 'Storage rejected the key. SUPABASE_SERVICE_ROLE_KEY must be the secret key that starts with sb_secret_, not the publishable key.';
  }

  if (
    status === 413 ||
    lower.includes('payload too large') ||
    lower.includes('maximum allowed size') ||
    lower.includes('object exceeded')
  ) {
    return `This file is larger than the ${MAX_FILE_SIZE_LABEL} storage limit.`;
  }

  if (status === 415 || lower.includes('mime type') || lower.includes('invalid mime')) {
    return 'Storage rejected this file type. Use a PDF, JPEG, or PNG.';
  }

  const detail = sanitizeProviderMessage(providerMessage);
  if (detail) {
    return `The file could not be stored. Storage said: ${detail}`;
  }

  return `The file could not be stored. Storage responded with HTTP ${status}.`;
}

function readProviderMessage(bodyText: string): string {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const body = JSON.parse(trimmed) as { message?: unknown; error?: unknown; msg?: unknown };
    const parts = [body.error, body.message, body.msg].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0,
    );
    return parts.join(': ');
  } catch {
    return trimmed;
  }
}

function sanitizeProviderMessage(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, 180);
  if (!cleaned || /bearer|service_role|eyJ|supabase_service/i.test(cleaned)) {
    return '';
  }
  return cleaned;
}
