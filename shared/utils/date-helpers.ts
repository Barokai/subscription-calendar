// Helper functions for date operations used in both platforms

/**
 * Format a date as a human-readable string
 */
export function formatDateForDisplay(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Get a date object from ISO string safely
 */
export function safeParseDate(dateString?: string): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    // Check if valid date
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (e) {
    return null;
  }
}

/**
 * Get the first and last day of a month
 */
export function getMonthBoundaries(year: number, month: number): { firstDay: Date, lastDay: Date } {
  // Note: month is 0-based (0 = January)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0); // Day 0 is the last day of previous month
  
  return { firstDay, lastDay };
}

/**
 * Get an array of months (useful for dropdowns)
 */
export function getMonthsArray(): { value: number, label: string }[] {
  return [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ];
}
