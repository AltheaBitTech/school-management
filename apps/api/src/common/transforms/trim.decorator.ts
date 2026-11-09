import { Transform } from 'class-transformer';

/** Trim string inputs before class-validator runs. Non-strings are left unchanged. */
export function Trim() {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
}
