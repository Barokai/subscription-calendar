import { useState, useEffect, useCallback } from 'react';
import { Subscription } from '../subscription-logic';
import { Platform } from '../utils/platform';

// Import the right storage adapter based on platform
const getStorageAdapter = async () => {
  if (Platform.isWeb) {
    return (await import('../storage-adapters/web')).storageAdapter;
  } else {
    return (await import('../storage-adapters/react-native')).storageAdapter;
  }
};

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load subscriptions when component mounts
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const adapter = await getStorageAdapter();
        const data = await adapter.loadSubscriptions();
        setSubscriptions(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load subscriptions'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Save subscriptions
  const saveSubscriptions = useCallback(async (newSubscriptions: Subscription[]) => {
    try {
      const adapter = await getStorageAdapter();
      await adapter.saveSubscriptions(newSubscriptions);
      setSubscriptions(newSubscriptions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save subscriptions'));
      throw err;
    }
  }, []);

  // Add a subscription
  const addSubscription = useCallback(async (subscription: Subscription) => {
    try {
      const newList = [...subscriptions, subscription];
      await saveSubscriptions(newList);
      return newList;
    } catch (err) {
      throw err;
    }
  }, [subscriptions, saveSubscriptions]);

  // Update a subscription
  const updateSubscription = useCallback(async (updatedSubscription: Subscription) => {
    try {
      const newList = subscriptions.map(sub => 
        sub.id === updatedSubscription.id ? updatedSubscription : sub
      );
      await saveSubscriptions(newList);
      return newList;
    } catch (err) {
      throw err;
    }
  }, [subscriptions, saveSubscriptions]);

  // Delete a subscription
  const deleteSubscription = useCallback(async (id: string) => {
    try {
      const newList = subscriptions.filter(sub => sub.id !== id);
      await saveSubscriptions(newList);
      return newList;
    } catch (err) {
      throw err;
    }
  }, [subscriptions, saveSubscriptions]);

  return {
    subscriptions,
    loading,
    error,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    saveSubscriptions
  };
}
