import { BadRequestException } from '@nestjs/common';
import { assertCsvHeaders, parseCsv, parseIsoDate } from './csv-import.util';

describe('csv import parsing', () => {
  it('keeps commas that are inside quotes', () => {
    const rows = parseCsv('name,note\n"Patel, Jr","Grade 8"\n');
    expect(rows).toEqual([
      ['name', 'note'],
      ['Patel, Jr', 'Grade 8'],
    ]);
  });

  it('rejects a missing required header before any row is saved', () => {
    expect(() => assertCsvHeaders(['firstName'], ['studentCode', 'firstName'], ['studentCode', 'firstName'])).toThrow(
      BadRequestException,
    );
  });

  it('rejects a column the importer does not understand', () => {
    expect(() =>
      assertCsvHeaders(['studentCode', 'firstName', 'lastName', 'status'], ['studentCode'], ['studentCode', 'firstName', 'lastName']),
    ).toThrow(/Unsupported CSV column: status/);
  });

  it('accepts only real calendar dates in YYYY-MM-DD', () => {
    expect(parseIsoDate('2012-05-10')).toBe(true);
    expect(parseIsoDate('2012-02-31')).toBe(false);
    expect(parseIsoDate('10/05/2012')).toBe(false);
  });
});
