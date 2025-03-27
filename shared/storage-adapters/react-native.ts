import { Subscription } from '../subscription-logic';
import AsyncStorage from '@react-native-async-storage/async-storage';

// React Native specific storage implementation with async/await
export async function saveSubscriptions(subscriptions: Subscription[]): Promise<void> {
  try {
    await AsyncStorage.setItem('subscriptions', JSON.stringify(subscriptions));
  } catch (error) {
    console.error('Error saving subscriptions to AsyncStorage:', error);
  }
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  try {
    const stored = await AsyncStorage.getItem('subscriptions');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading subscriptions from AsyncStorage:', error);
    return [];
  }
}

// Export a storageAdapter object for unified access
export const storageAdapter = {
  saveSubscriptions: async (subscriptions: Subscription[]): Promise<void> => {
    await saveSubscriptions(subscriptions);
  },
  
  loadSubscriptions: async (): Promise<Subscription[]> => {
    return await loadSubscriptions();
  },
  
  // Add settings storage methods
  saveSettings: async (settings: Record<string, any>): Promise<void> => {
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to AsyncStorage:', error);
    }
  },
  
  loadSettings: async (): Promise<Record<string, any>> => {
    try {
      const stored = await AsyncStorage.getItem('settings');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading settings from AsyncStorage:', error);
      return {};
    }
  }
};
