export const EMAIL_DELIVERY_ERROR_CODES = {
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  DOMAIN_NOT_VERIFIED: 'DOMAIN_NOT_VERIFIED',
  RECIPIENT_RESTRICTED: 'RECIPIENT_RESTRICTED',
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
} as const;

export type EmailDeliveryErrorCode =
  (typeof EMAIL_DELIVERY_ERROR_CODES)[keyof typeof EMAIL_DELIVERY_ERROR_CODES];

const SAFE_MESSAGES: Record<EmailDeliveryErrorCode, string> = {
  NOT_CONFIGURED: 'Email is not configured on the server.',
  INVALID_API_KEY: 'The email service rejected the API key.',
  DOMAIN_NOT_VERIFIED: 'The sender domain is not verified with the email provider.',
  RECIPIENT_RESTRICTED:
    'This address cannot receive mail from the current sender. Use a verified domain or an allowed test address.',
  INVALID_RECIPIENT: 'The recipient email address was rejected.',
  RATE_LIMITED: 'The email provider rate limit was reached. Try again shortly.',
  TIMEOUT: 'The email provider did not respond in time.',
  UNKNOWN: 'The email could not be sent.',
};

export interface EmailDeliveryProblem {
  code: EmailDeliveryErrorCode;
  message: string;
}

export class EmailDeliveryError extends Error {
  readonly code: EmailDeliveryErrorCode;

  constructor(code: EmailDeliveryErrorCode, message?: string) {
    super(message ?? SAFE_MESSAGES[code]);
    this.name = 'EmailDeliveryError';
    this.code = code;
  }

  toProblem(): EmailDeliveryProblem {
    return { code: this.code, message: this.message };
  }
}

export function publicEmailErrorMessage(
  code: EmailDeliveryErrorCode,
  providerMessage?: string,
): string {
  const safe = SAFE_MESSAGES[code];
  const detail = providerMessage?.replace(/\s+/g, ' ').trim();
  if (!detail || detail.length > 180 || /re_[A-Za-z0-9]/.test(detail)) {
    return safe;
  }
  if (detail.toLowerCase() === safe.toLowerCase()) {
    return safe;
  }
  return `${safe} ${detail}`;
}

export function classifyResendFailure(
  status: number,
  rawBody: string,
): EmailDeliveryProblem {
  let providerMessage = '';
  try {
    const parsed = JSON.parse(rawBody) as { message?: unknown };
    if (typeof parsed.message === 'string') {
      providerMessage = parsed.message;
    }
  } catch {
    providerMessage = rawBody.slice(0, 180);
  }

  const haystack = providerMessage.toLowerCase();
  let code: EmailDeliveryErrorCode = EMAIL_DELIVERY_ERROR_CODES.UNKNOWN;

  if (status === 401 || haystack.includes('api key')) {
    code = EMAIL_DELIVERY_ERROR_CODES.INVALID_API_KEY;
  } else if (status === 429 || haystack.includes('rate limit') || haystack.includes('too many')) {
    code = EMAIL_DELIVERY_ERROR_CODES.RATE_LIMITED;
  } else if (
    haystack.includes('only send') ||
    haystack.includes('testing emails') ||
    haystack.includes('your own email')
  ) {
    code = EMAIL_DELIVERY_ERROR_CODES.RECIPIENT_RESTRICTED;
  } else if (haystack.includes('domain') && (haystack.includes('verif') || haystack.includes('not'))) {
    code = EMAIL_DELIVERY_ERROR_CODES.DOMAIN_NOT_VERIFIED;
  } else if (status === 422 || (haystack.includes('invalid') && haystack.includes('recipient'))) {
    code = EMAIL_DELIVERY_ERROR_CODES.INVALID_RECIPIENT;
  }

  return {
    code,
    message: publicEmailErrorMessage(code, providerMessage),
  };
}

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) {
    return '***';
  }
  return `${trimmed.slice(0, 1)}***@${trimmed.slice(at + 1)}`;
}
