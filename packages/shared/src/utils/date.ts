import { format, parseISO, differenceInMinutes } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Australia/Melbourne';

export function formatDateAEST(isoString: string): string {
  return formatInTimeZone(parseISO(isoString), TIMEZONE, 'EEEE d MMMM yyyy');
}

export function formatTimeAEST(isoString: string): string {
  return formatInTimeZone(parseISO(isoString), TIMEZONE, 'h:mm a');
}

export function formatDateTimeAEST(isoString: string): string {
  return formatInTimeZone(parseISO(isoString), TIMEZONE, 'd MMM yyyy, h:mm a');
}

export function formatShortDateAEST(isoString: string): string {
  return formatInTimeZone(parseISO(isoString), TIMEZONE, 'd/MM/yyyy');
}

export function getCurrentDateAEST(): string {
  const now = new Date();
  const zoned = toZonedTime(now, TIMEZONE);
  return format(zoned, 'yyyy-MM-dd');
}

export function getCurrentTimeAEST(): string {
  const now = new Date();
  return formatInTimeZone(now, TIMEZONE, 'h:mm a');
}

export function getCurrentDayLabelAEST(): string {
  const now = new Date();
  return formatInTimeZone(now, TIMEZONE, 'EEEE d MMMM yyyy');
}

export function calculateHours(signInTime: string, signOutTime: string): number {
  const minutes = differenceInMinutes(parseISO(signOutTime), parseISO(signInTime));
  return Math.round((minutes / 60) * 100) / 100;
}

export function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} minutes`;
  if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
  return `${h} hour${h !== 1 ? 's' : ''} ${m} minutes`;
}

export function isTuesday(): boolean {
  const now = new Date();
  const zoned = toZonedTime(now, TIMEZONE);
  return zoned.getDay() === 2;
}

export function getNextTuesday(): string {
  const now = new Date();
  const zoned = toZonedTime(now, TIMEZONE);
  const daysUntilTuesday = (2 - zoned.getDay() + 7) % 7 || 7;
  zoned.setDate(zoned.getDate() + daysUntilTuesday);
  return format(zoned, 'yyyy-MM-dd');
}
