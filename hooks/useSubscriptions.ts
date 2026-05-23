"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Subscription,
  SubscriptionInput,
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "@/lib/subscriptions";
import {
  findOverlappingSubscriptionVersion,
  findSubscriptionWithSameStartDate,
  getPreviousIsoDate,
} from "@/lib/subscription-versioning";

export function useSubscriptions(demoMode: boolean, mockData: Subscription[]) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionsRef = useRef<Subscription[]>([]);

  const load = useCallback(async () => {
    if (demoMode) {
      setSubscriptions(mockData);
      subscriptionsRef.current = mockData;
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSubscriptions();
      setSubscriptions(data);
      subscriptionsRef.current = data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [demoMode, mockData]);

  useEffect(() => {
    load();
  }, [load]);

  const updateSubscriptionState = useCallback(
    (updater: (prev: Subscription[]) => Subscription[]) => {
      setSubscriptions((prev) => {
        const next = updater(prev);
        subscriptionsRef.current = next;
        return next;
      });
    },
    []
  );

  const buildDemoSubscription = useCallback((input: SubscriptionInput): Subscription => {
    const now = new Date().toISOString();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return {
      id,
      userId: "demo",
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      frequency: input.frequency,
      dayOfMonth: input.dayOfMonth,
      color: input.color ?? null,
      category: input.category ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }, []);

  const add = async (input: SubscriptionInput): Promise<void> => {
    const current = subscriptionsRef.current;
    const sameStartVersion = findSubscriptionWithSameStartDate(current, input);

    if (sameStartVersion) {
      if (demoMode) {
        const now = new Date().toISOString();
        updateSubscriptionState((prev) =>
          prev.map((s) =>
            s.id === sameStartVersion.id
              ? {
                  ...s,
                  ...input,
                  color: input.color ?? null,
                  category: input.category ?? null,
                  endDate: input.endDate ?? null,
                  updatedAt: now,
                }
              : s
          )
        );
        return;
      }

      const updated = await updateSubscription(sameStartVersion.id, input);
      updateSubscriptionState((prev) =>
        prev.map((s) => (s.id === sameStartVersion.id ? updated : s))
      );
      return;
    }

    const overlappingVersion = findOverlappingSubscriptionVersion(current, input);
    let closedExisting: Subscription | null = null;

    if (overlappingVersion) {
      const autoEndDate = getPreviousIsoDate(input.startDate);
      if (autoEndDate && autoEndDate >= overlappingVersion.startDate) {
        if (demoMode) {
          closedExisting = {
            ...overlappingVersion,
            endDate: autoEndDate,
            updatedAt: new Date().toISOString(),
          };
        } else {
          closedExisting = await updateSubscription(overlappingVersion.id, {
            endDate: autoEndDate,
          });
        }
      }
    }

    if (demoMode) {
      const created = buildDemoSubscription(input);
      updateSubscriptionState((prev) => {
        const withClosed = closedExisting
          ? prev.map((s) => (s.id === closedExisting?.id ? closedExisting : s))
          : prev;
        return [...withClosed, created].sort((a, b) => a.name.localeCompare(b.name));
      });
      return;
    }

    const created = await createSubscription(input);
    updateSubscriptionState((prev) => {
      const withClosed = closedExisting
        ? prev.map((s) => (s.id === closedExisting?.id ? closedExisting : s))
        : prev;
      return [...withClosed, created].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const update = async (id: string, input: Partial<SubscriptionInput>): Promise<void> => {
    if (demoMode) {
      const now = new Date().toISOString();
      updateSubscriptionState((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                ...input,
                color: input.color !== undefined ? input.color ?? null : s.color,
                category: input.category !== undefined ? input.category ?? null : s.category,
                endDate: input.endDate !== undefined ? input.endDate ?? null : s.endDate,
                updatedAt: now,
              }
            : s
        )
      );
      return;
    }

    const updated = await updateSubscription(id, input);
    updateSubscriptionState((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const remove = async (id: string): Promise<void> => {
    if (!demoMode) {
      await deleteSubscription(id);
    }
    updateSubscriptionState((prev) => prev.filter((s) => s.id !== id));
  };

  return { subscriptions, loading, error, refresh: load, add, update, remove };
}
