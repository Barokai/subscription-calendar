"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Subscription,
  SubscriptionInput,
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "@/lib/subscriptions";

export function useSubscriptions(demoMode: boolean, mockData: Subscription[]) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (demoMode) {
      setSubscriptions(mockData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSubscriptions();
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [demoMode, mockData]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (input: SubscriptionInput): Promise<void> => {
    const created = await createSubscription(input);
    setSubscriptions((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const update = async (id: string, input: Partial<SubscriptionInput>): Promise<void> => {
    const updated = await updateSubscription(id, input);
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? updated : s))
    );
  };

  const remove = async (id: string): Promise<void> => {
    await deleteSubscription(id);
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  };

  return { subscriptions, loading, error, refresh: load, add, update, remove };
}
