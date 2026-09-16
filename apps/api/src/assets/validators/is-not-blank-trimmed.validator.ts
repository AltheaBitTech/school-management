import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isNotBlankTrimmed', async: false })
class IsNotBlankTrimmedConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value !== 'string') {
      return false;
    }

    return value.trim().length > 0;
  }

  defaultMessage(): string {
    return 'Value must not be empty or whitespace only';
  }
}

export function IsNotBlankTrimmed(validationOptions?: ValidationOptions) {
  return function registerIsNotBlankTrimmed(object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotBlankTrimmedConstraint,
    });
  };
}
