import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  it('hashes passwords with Argon2id', async () => {
    const hash = await passwordService.hash('StrongPassword123!');

    expect(hash).toBeDefined();
    expect(hash).not.toBe('StrongPassword123!');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('verifies the correct password', async () => {
    const plainTextPassword = 'StrongPassword123!';
    const hash = await passwordService.hash(plainTextPassword);

    await expect(passwordService.verify(plainTextPassword, hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await passwordService.hash('StrongPassword123!');

    await expect(passwordService.verify('WrongPassword123!', hash)).resolves.toBe(false);
  });
});
