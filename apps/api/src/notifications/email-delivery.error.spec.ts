import { classifyResendFailure, EMAIL_DELIVERY_ERROR_CODES } from './email-delivery.error';

describe('classifyResendFailure', () => {
  it('maps an invalid API key', () => {
    const problem = classifyResendFailure(401, JSON.stringify({ message: 'API key is invalid' }));
    expect(problem.code).toBe(EMAIL_DELIVERY_ERROR_CODES.INVALID_API_KEY);
    expect(problem.message).toContain('API key');
  });

  it('maps an unverified domain', () => {
    const problem = classifyResendFailure(
      403,
      JSON.stringify({ message: 'The domain is not verified' }),
    );
    expect(problem.code).toBe(EMAIL_DELIVERY_ERROR_CODES.DOMAIN_NOT_VERIFIED);
  });

  it('maps a rate limit', () => {
    const problem = classifyResendFailure(429, JSON.stringify({ message: 'Too many requests' }));
    expect(problem.code).toBe(EMAIL_DELIVERY_ERROR_CODES.RATE_LIMITED);
  });

  it('maps a sandbox recipient restriction', () => {
    const problem = classifyResendFailure(
      403,
      JSON.stringify({ message: 'You can only send testing emails to your own email address' }),
    );
    expect(problem.code).toBe(EMAIL_DELIVERY_ERROR_CODES.RECIPIENT_RESTRICTED);
  });
});
