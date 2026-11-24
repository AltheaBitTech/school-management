import { ConfigService } from '@nestjs/config';
import { EMAIL_DELIVERY_ERROR_CODES, EmailDeliveryError } from '../email-delivery.error';
import { ResendEmailProvider } from './resend-email.provider';

describe('ResendEmailProvider', () => {
  const configService = {
    get: () => ({
      provider: 'resend',
      resendApiKey: 're_test',
      resendFromEmail: 'CampusOps <noreply@example.com>',
      replyTo: 'support@example.com',
    }),
  } as unknown as ConfigService;

  const input = {
    to: 'person@example.com',
    subject: 'Hello',
    text: 'Hello',
    html: '<p>Hello</p>',
    purpose: 'account_invite',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends through Resend and records the message id', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }),
    );

    await new ResendEmailProvider(configService).sendEmail(input);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer re_test' }),
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.from).toBe('CampusOps <noreply@example.com>');
    expect(body.reply_to).toBe('support@example.com');
    expect(body.to).toEqual(['person@example.com']);
  });

  it('raises a typed error when Resend rejects the key', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'API key is invalid' }), { status: 401 }),
    );

    await expect(new ResendEmailProvider(configService).sendEmail(input)).rejects.toMatchObject({
      code: EMAIL_DELIVERY_ERROR_CODES.INVALID_API_KEY,
    });
  });

  it('raises a timeout error when the request is aborted', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    await expect(new ResendEmailProvider(configService).sendEmail(input)).rejects.toBeInstanceOf(
      EmailDeliveryError,
    );
    await expect(new ResendEmailProvider(configService).sendEmail(input)).rejects.toMatchObject({
      code: EMAIL_DELIVERY_ERROR_CODES.TIMEOUT,
    });
  });
});
