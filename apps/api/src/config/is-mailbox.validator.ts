import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { parseMailbox } from './mailbox.util';

@ValidatorConstraint({ name: 'isMailbox', async: false })
class IsMailboxConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && parseMailbox(value) !== null;
  }

  defaultMessage(): string {
    return 'must be an email address or "Display Name <email@domain>"';
  }
}

export function IsMailbox(validationOptions?: ValidationOptions) {
  return function registerIsMailbox(object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMailboxConstraint,
    });
  };
}
