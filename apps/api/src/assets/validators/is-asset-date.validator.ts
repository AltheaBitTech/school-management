import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ASSET_DATE_PATTERN } from '../constants/asset.constants';

@ValidatorConstraint({ name: 'isAssetDate', async: false })
class IsAssetDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    if (!ASSET_DATE_PATTERN.test(value)) {
      return false;
    }

    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }

  defaultMessage(): string {
    return 'Date must use YYYY-MM-DD format';
  }
}

export function IsAssetDate(validationOptions?: ValidationOptions) {
  return function registerIsAssetDate(object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAssetDateConstraint,
    });
  };
}
