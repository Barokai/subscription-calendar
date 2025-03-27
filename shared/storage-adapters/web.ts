import { Subscription } from '../subscription-logic';

// Web-specific storage implementation using localStorage
export function saveSubscriptions(subscriptions: Subscription[]): void {
  try {
    localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
  } catch (error) {
    console.error('Error saving subscriptions to localStorage:', error);
  }
}

export function loadSubscriptions(): Subscription[] {
  try {
    const stored = localStorage.getItem('subscriptions');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading subscriptions from localStorage:', error);
    return [];
  }
}

// Export a storageAdapter object for consistency with React Native
export const storageAdapter = {
  saveSubscriptions,
  loadSubscriptions,
  
  // Add settings storage methods
  saveSettings: (settings: Record<string, any>): void => {
    try {
      localStorage.setItem('settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  },
  
  loadSettings: (): Record<string, any> => {
    try {
      const stored = localStorage.getItem('settings');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      return {};
    }
  }
};
