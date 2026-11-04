import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 500;

const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

export interface CsvFieldError {
  column: string;
  message: string;
}

export function assertCsvUpload(file: Express.Multer.File | undefined): void {
  if (!file) {
    throw new BadRequestException('CSV file is required');
  }

  if (file.size > MAX_IMPORT_BYTES || file.buffer.length > MAX_IMPORT_BYTES) {
    throw new BadRequestException('CSV file must be 2MB or smaller');
  }

  const fileName = file.originalname?.trim().toLowerCase() ?? '';
  if (fileName && !fileName.endsWith('.csv')) {
    throw new UnsupportedMediaTypeException('Only CSV files are supported');
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new UnsupportedMediaTypeException('Only CSV files are supported');
  }
}

export function parseCsv(content: string): string[][] {
  if (content.includes('\0')) {
    throw new BadRequestException('CSV file is not valid text');
  }

  const text = content.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
      row.push(cell.trim());
      cell = '';
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new BadRequestException('CSV has an unmatched quote');
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length < 2) {
    throw new BadRequestException('CSV must include a header row and at least one data row');
  }

  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`CSV can include at most ${MAX_IMPORT_ROWS} data rows`);
  }

  return rows;
}

export function assertCsvHeaders(
  header: string[],
  required: readonly string[],
  allowed: readonly string[],
): void {
  const unknown = header.filter((name) => name.length > 0 && !allowed.includes(name));
  if (unknown.length > 0) {
    throw new BadRequestException(`Unsupported CSV column: ${unknown.join(', ')}`);
  }

  const duplicate = header.find((name, index) => header.indexOf(name) !== index);
  if (duplicate) {
    throw new BadRequestException(`Duplicate CSV column: ${duplicate}`);
  }

  for (const column of required) {
    if (!header.includes(column)) {
      throw new BadRequestException(`Missing required CSV column: ${column}`);
    }
  }
}

export function readCsvRow<T extends string>(
  cells: string[],
  header: string[],
  columns: readonly T[],
): { values: Record<T, string>; errors: CsvFieldError[] } {
  const values = {} as Record<T, string>;
  const errors: CsvFieldError[] = [];
  const indexByName = new Map(header.map((name, index) => [name, index]));

  if (cells.length > header.length) {
    errors.push({
      column: 'row',
      message: 'This row has more values than the header has columns',
    });
  }

  for (const column of columns) {
    const index = indexByName.get(column);
    const value = index === undefined ? '' : (cells[index] ?? '').trim();
    if (value.length > 300) {
      errors.push({ column, message: 'Value is too long' });
      values[column] = value.slice(0, 300);
    } else {
      values[column] = value;
    }
  }

  return { values, errors };
}

export function parseIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

export function errorText(errors: CsvFieldError[]): string {
  return errors.map((error) => `${error.column}: ${error.message}`).join('; ');
}

export function httpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string' && response.trim()) {
      return response;
    }
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
      if (Array.isArray(message)) {
        const text = message.filter((item) => typeof item === 'string').join('; ');
        if (text) {
          return text;
        }
      }
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

@Catch(MulterError)
export class CsvUploadExceptionFilter implements ExceptionFilter {
  catch(error: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'CSV file must be 2MB or smaller'
        : 'CSV upload could not be read';
    response.status(400).json({ statusCode: 400, message });
  }
}
