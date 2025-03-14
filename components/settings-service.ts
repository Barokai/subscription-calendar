// Settings service to handle storing and retrieving user preferences

export interface CalendarSettings {
  spreadsheetId?: string;
  apiKey?: string;
  locale: string;
  isDarkMode: boolean;
  demoMode?: boolean;
}

const STORAGE_KEYS = {
  SPREADSHEET_ID: 'subscriptionCalendarSpreadsheetId',
  API_KEY: 'subscriptionCalendarApiKey',
  LOCALE: 'subscriptionCalendarLocale',
  DARK_MODE: 'subscriptionCalendarDarkMode',
  DEMO_MODE: 'subscriptionCalendarDemoMode'
};

export const loadSettings = (): CalendarSettings => {
  // Make sure we're in a browser environment
  if (typeof window === 'undefined') {
    return {
      locale: 'de-AT',
      isDarkMode: true
    };
  }
  
  // Check URL for demo param
  const urlParams = new URLSearchParams(window.location.search);
  const demoParam = urlParams.get('demo');
  
  const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) || undefined;
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || undefined;
  
  // Get locale with fallback to browser default or de-AT
  const locale = localStorage.getItem(STORAGE_KEYS.LOCALE) || 
                navigator.language || 
                'de-AT';
  
  // Get dark mode preference with default true
  const darkModeValue = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
  const isDarkMode = darkModeValue !== null ? darkModeValue === 'true' : true;
  
  // Check for demo mode
  const demoMode = demoParam === 'true' || localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
  
  return {
    spreadsheetId,
    apiKey,
    locale,
    isDarkMode,
    demoMode
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
  
  if (settings.demoMode !== undefined) {
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, settings.demoMode.toString());
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

export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const demoParam = urlParams.get('demo');
  
  return demoParam === 'true' || localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
};
