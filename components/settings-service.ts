// Settings service to handle storing and retrieving user preferences

// Updated interface to track if env vars are available and being used
export interface CalendarSettings {
  spreadsheetId?: string;
  apiKey?: string;
  hasEnvSpreadsheetId?: boolean;
  hasEnvApiKey?: boolean;
  useEnvSpreadsheetId?: boolean; 
  useEnvApiKey?: boolean;
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

// Load environment variables if on server side
const getEnvVariables = () => {
  if (typeof process !== 'undefined' && process.env) {
    return {
      envSpreadsheetId: process.env.SHEETS_SPREADSHEET_ID || undefined,
      envApiKey: process.env.SHEETS_API_KEY || undefined
    };
  }
  return { envSpreadsheetId: undefined, envApiKey: undefined };
};

// Check if environment variables are available (client-side call)
export const checkEnvVariables = async (): Promise<{ hasEnvSpreadsheetId: boolean; hasEnvApiKey: boolean }> => {
  try {
    const response = await fetch('/api/env-config');
    if (!response.ok) {
      return { hasEnvSpreadsheetId: false, hasEnvApiKey: false };
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to check environment variables:', error);
    return { hasEnvSpreadsheetId: false, hasEnvApiKey: false };
  }
};

// Load settings with environment variable awareness
export const loadSettings = async (): Promise<CalendarSettings> => {
  // Default settings for server-side rendering
  if (typeof window === 'undefined') {
    return {
      locale: 'de-AT',
      isDarkMode: true,
    };
  }
  
  // Check if environment variables are available
  const { hasEnvSpreadsheetId, hasEnvApiKey } = await checkEnvVariables();
  
  // Get client-side stored values
  const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) || undefined;
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || undefined;
  
  // Get user preferences for using env vars
  const useEnvSpreadsheetId = hasEnvSpreadsheetId && 
    (localStorage.getItem('useEnvSpreadsheetId') === 'true' || !spreadsheetId);
    
  const useEnvApiKey = hasEnvApiKey &&
    (localStorage.getItem('useEnvApiKey') === 'true' || !apiKey);
  
  // Check URL for demo param
  const urlParams = new URLSearchParams(window.location.search);
  const demoParam = urlParams.get('demo');
  
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
    spreadsheetId: useEnvSpreadsheetId ? undefined : spreadsheetId,
    apiKey: useEnvApiKey ? undefined : apiKey,
    hasEnvSpreadsheetId,
    hasEnvApiKey,
    useEnvSpreadsheetId,
    useEnvApiKey,
    locale,
    isDarkMode,
    demoMode
  };
};

export const saveSettings = (settings: Partial<CalendarSettings>): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Save standard settings
  if (settings.spreadsheetId !== undefined) {
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, settings.spreadsheetId);
  }
  
  if (settings.apiKey !== undefined) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, settings.apiKey);
  }
  
  // Save environment variable preferences
  if (settings.useEnvSpreadsheetId !== undefined) {
    localStorage.setItem('useEnvSpreadsheetId', settings.useEnvSpreadsheetId.toString());
  }
  
  if (settings.useEnvApiKey !== undefined) {
    localStorage.setItem('useEnvApiKey', settings.useEnvApiKey.toString());
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

// Check if connection is configured either via env vars or client settings
export const isConnected = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    // Server-side check
    return !!(process.env.SHEETS_SPREADSHEET_ID && process.env.SHEETS_API_KEY);
  }
  
  // Client-side check
  const settings = await loadSettings();
  
  // Check if we're using env variables and they're available
  if (
    (settings.useEnvSpreadsheetId && settings.hasEnvSpreadsheetId) &&
    (settings.useEnvApiKey && settings.hasEnvApiKey)
  ) {
    return true;
  }
  
  // Check for client-side stored values
  return !!(
    (!settings.useEnvSpreadsheetId && settings.spreadsheetId) &&
    (!settings.useEnvApiKey && settings.apiKey)
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
