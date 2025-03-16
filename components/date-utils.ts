/**
 * Parse a date string correctly based on locale
 * 
 * @param dateString - Date string to parse
 * @param locale - User's locale
 * @returns JavaScript Date object
 */
export const parseDate = (dateString: string, locale: string): Date => {
  console.log(`Parsing date: ${dateString} with locale: ${locale}`);
  
  // If the date is already in ISO format (YYYY-MM-DD), parse directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString);
  }

  try {
    // European format (DD.MM.YYYY)
    if (dateString.includes('.')) {
      const parts = dateString.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JS
        const year = parseInt(parts[2], 10);
        
        // Validate the parts
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          console.log(`Parsed European date: ${day}.${month+1}.${year}`);
          return new Date(year, month, day);
        }
      }
    }
    
    // US format (MM/DD/YYYY)
    if (dateString.includes('/')) {
      // This may still be ambiguous, so use locale to determine format
      const parts = dateString.split('/');
      if (parts.length === 3) {
        let day: number, month: number, year: number;
        
        if (locale.startsWith('en-US')) {
          // US format: MM/DD/YYYY
          month = parseInt(parts[0], 10) - 1;
          day = parseInt(parts[1], 10);
        } else {
          // For other locales that use slashes, assume DD/MM/YYYY
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
        }
        
        year = parseInt(parts[2], 10);
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          return new Date(year, month, day);
        }
      }
    }
    
    // Try automatic date parsing with sanity checks
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      // Verify this worked correctly by checking if parts match up
      const dateStr = date.toISOString(); // Will be in YYYY-MM-DDTHH:mm:ss.sssZ format
      
      // Log the result
      console.log(`Parsed with built-in Date constructor: ${dateStr}`);
      return date;
    }
    
    // Last resort: just return today and log error
    console.error(`Failed to parse date: ${dateString} with locale: ${locale}`);
    return new Date();
  } catch (error) {
    console.error(`Error parsing date: ${dateString}`, error);
    return new Date(); // Return today's date as fallback
  }
};

/**
 * Format a date in ISO format (YYYY-MM-DD)
 * 
 * @param date - The date to format
 * @returns ISO formatted date string
 */
export const formatISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
