export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function getLocalDateString(timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getLocalHour(timezone: string, date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);

  const hourPart = parts.find((part) => part.type === 'hour');
  return hourPart ? Number(hourPart.value) : date.getUTCHours();
}

export function getGreetingPeriod(timezone: string, date = new Date()): GreetingPeriod {
  const hour = getLocalHour(timezone, date);
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 17) {
    return 'afternoon';
  }
  return 'evening';
}

export function getLocalDayUtcRange(localDate: string, timezone: string): { startUtc: Date; endUtc: Date } {
  const startUtc = localDateTimeToUtc(`${localDate}T00:00`, timezone);
  const nextDay = addCalendarDay(localDate);
  const endUtc = localDateTimeToUtc(`${nextDay}T00:00`, timezone);
  return { startUtc, endUtc };
}

function addCalendarDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function localDateTimeToUtc(value: string, timezone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid local date time: ${value}`);
  }

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  let timestamp = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    );
    const interpreted = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );
    timestamp += Date.UTC(year, month - 1, day, hour, minute) - interpreted;
  }

  return new Date(timestamp);
}
