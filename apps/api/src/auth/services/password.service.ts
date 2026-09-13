import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  async hash(plainTextPassword: string): Promise<string> {
    return argon2.hash(plainTextPassword, {
      type: argon2.argon2id,
    });
  }

  async verify(plainTextPassword: string, passwordHash: string): Promise<boolean> {
    return argon2.verify(passwordHash, plainTextPassword);
  }
}
