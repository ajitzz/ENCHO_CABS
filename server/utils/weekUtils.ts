import { startOfWeek, endOfWeek } from "date-fns";

/**
 * Calculate week boundaries (Sunday to Saturday) for a given date
 * @param date The date to calculate week boundaries for
 * @returns Object with weekStart (Sunday) and weekEnd (Saturday)
 */
export function getWeekBoundaries(date: Date): { weekStart: Date; weekEnd: Date } {
  // Week starts on Sunday (0) and ends on Saturday (6)
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 });     // Saturday
  
  return { weekStart, weekEnd };
}

/**
 * Format a date to YYYY-MM-DD string for database queries
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get current week boundaries
 */
export function getCurrentWeekBoundaries(): { weekStart: Date; weekEnd: Date } {
  return getWeekBoundaries(new Date());
}

/**
 * Check if two dates are in the same week
 */
export function isSameWeek(date1: Date, date2: Date): boolean {
  const week1 = getWeekBoundaries(date1);
  const week2 = getWeekBoundaries(date2);
  
  return week1.weekStart.getTime() === week2.weekStart.getTime();
}