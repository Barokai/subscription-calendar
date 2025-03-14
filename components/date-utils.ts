/**
 * Parse a date string considering the user's locale
 * @param dateStr - Date string in YYYY-MM-DD format (ISO) or localized format
 * @param locale - User's locale (e.g., 'en-US', 'de-DE')
 * @returns A Date object
 */
export function parseDate(dateStr: string, locale: string = 'en-US'): Date {
  // First try parsing as ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  
  try {
    // Try to parse the date using the browser's built-in parser with locale
    const dateParts = dateStr.split(/[.\/\-]/);
    
    // Handle different date formats based on locale
    if (locale.startsWith('en')) {
      // For English locales (MM/DD/YYYY)
      if (dateParts.length === 3) {
        const month = parseInt(dateParts[0]) - 1; // Adjust for 0-based months
        const day = parseInt(dateParts[1]);
        const year = parseInt(dateParts[2]);
        return new Date(year, month, day);
      }
    } else if (locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es') || locale.startsWith('it')) {
      // For European locales (DD.MM.YYYY or DD/MM/YYYY)
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Adjust for 0-based months
        const year = parseInt(dateParts[2]);
        return new Date(year, month, day);
      }
    }
    
    // Fallback: try the browser's date parsing
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    // If all else fails, return today's date
    console.warn(`Could not parse date: ${dateStr}, using current date instead`);
    return new Date();
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
    return new Date(); // Return today's date as fallback
  }
}

/**
 * Format a date in ISO format (YYYY-MM-DD)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate months between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of months between dates
 */
export function monthsBetweenDates(startDate: Date, endDate: Date): number {
  return (
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth())
  );
}

/**
 * Get the first day of the week based on locale
 * 0 = Sunday, 1 = Monday, etc.
 * @param locale - User's locale (e.g., 'en-US', 'de-DE')
 * @returns Number representing the first day of the week (0-6)
 */
export function getFirstDayOfWeek(locale: string = 'en-US'): number {
  // Most European countries and many others use Monday as first day
  const mondayFirstLocales = [
    'de', 'fr', 'es', 'it', 'pt', 'nl', 'be', 'dk', 'fi', 'is', 'no', 'se',
    'al', 'ba', 'bg', 'hr', 'cz', 'gr', 'hu', 'pl', 'ro', 'ru', 'sk', 'si', 'rs',
    'ua', 'tr', 'cy', 'il', 'cn', 'jp', 'kr'
  ];
  
  // Check if the locale starts with any of the Monday-first locales
  const localePrefix = locale.split('-')[0].toLowerCase();
  return mondayFirstLocales.includes(localePrefix) ? 1 : 0;
}

/**
 * Reorder weekdays array based on the first day of week for locale
 * @param weekdays - Array of weekday names (starting with Sunday)
 * @param firstDayOfWeek - Index of first day (0 for Sunday, 1 for Monday, etc.)
 * @returns Reordered array of weekday names
 */
export function reorderWeekdaysForLocale(weekdays: string[], firstDayOfWeek: number): string[] {
  if (firstDayOfWeek === 0) return weekdays; // Sunday first, no reordering needed
  
  // For other starting days, split and reorder
  const firstPart = weekdays.slice(0, firstDayOfWeek);
  const secondPart = weekdays.slice(firstDayOfWeek);
  return [...secondPart, ...firstPart];
}

/**
 * Adjust day of week considering locale's first day of week
 * @param dayOfWeek - Standard day of week (0 = Sunday)
 * @param firstDayOfWeek - First day of week for locale (0 = Sunday, 1 = Monday)
 * @returns Adjusted day of week
 */
export function adjustDayOfWeek(dayOfWeek: number, firstDayOfWeek: number): number {
  return (dayOfWeek + 7 - firstDayOfWeek) % 7;
}
