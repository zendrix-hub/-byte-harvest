export const EXAM_DATE = '2026-10-25';
export const LAST_REVIEW_DAY = '2026-10-24';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function utc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** The player's local calendar day as YYYY-MM-DD. */
export function localDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(date: string, n: number): string {
  return new Date(utc(date) + n * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export const daysToExam = (today: string) => daysBetween(today, EXAM_DATE);

/** today + gap, pulled back to the last review day, but never onto today itself. */
export function capDue(today: string, gapDays: number): string {
  const due = addDays(today, gapDays);
  if (due > LAST_REVIEW_DAY && today < LAST_REVIEW_DAY) return LAST_REVIEW_DAY;
  return due;
}

export function formatDay(date: string): string {
  const d = new Date(utc(date));
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export const fmtClock = (secs: number) => `${Math.floor(secs / 60)}:${pad(secs % 60)}`;
