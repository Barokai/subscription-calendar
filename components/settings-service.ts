// Settings service to handle storing and retrieving user preferences

export interface CalendarSettings {
  spreadsheetId?: string;
  apiKey?: string;
  locale: string;
  isDarkMode: boolean;
}

const STORAGE_KEYS = {
  SPREADSHEET_ID: 'subscriptionCalendarSpreadsheetId',
  API_KEY: 'subscriptionCalendarApiKey',
  LOCALE: 'subscriptionCalendarLocale',
  DARK_MODE: 'subscriptionCalendarDarkMode'
};

export const loadSettings = (): CalendarSettings => {
  // Make sure we're in a browser environment
  if (typeof window === 'undefined') {
    return {
      locale: 'en-US',
      isDarkMode: true
    };
  }
  
  const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) || undefined;
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || undefined;
  
  // Get locale with fallback to browser default or en-US
  const locale = localStorage.getItem(STORAGE_KEYS.LOCALE) || 
                navigator.language || 
                'en-US';
  
  // Get dark mode preference with default true
  const darkModeValue = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
  const isDarkMode = darkModeValue !== null ? darkModeValue === 'true' : true;
  
  return {
    spreadsheetId,
    apiKey,
    locale,
    isDarkMode
  };
};

export const saveSettings = (settings: Partial<CalendarSettings>): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  if (settings.spreadsheetId !== undefined) {
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, settings.spreadsheetId);
  }
  
  if (settings.apiKey !== undefined) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, settings.apiKey);
  }
  
  if (settings.locale !== undefined) {
    localStorage.setItem(STORAGE_KEYS.LOCALE, settings.locale);
  }
  
  if (settings.isDarkMode !== undefined) {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, settings.isDarkMode.toString());
  }
};

export const isConnected = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return !!(
    localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) && 
    localStorage.getItem(STORAGE_KEYS.API_KEY)
  );
};
