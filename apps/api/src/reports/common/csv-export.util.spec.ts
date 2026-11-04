import { buildCsv, escapeCsvField } from './csv-export.util';

describe('csv-export.util', () => {
  it('escapes commas and quotes', () => {
    expect(escapeCsvField('hello, world')).toBe('"hello, world"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('builds csv with header row', () => {
    const csv = buildCsv(['A', 'B'], [['1', '2']]);
    expect(csv).toBe('A,B\n1,2\n');
  });
});
