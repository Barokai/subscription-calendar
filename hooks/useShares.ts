"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SubscriptionShare,
  ShareInput,
  getSharesOwnedByMe,
  createShare,
  deleteShare,
} from "@/lib/shares";

export function useShares(demoMode: boolean, mockShares: SubscriptionShare[] = []) {
  const [shares, setShares] = useState<SubscriptionShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (demoMode) {
      setShares(mockShares);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSharesOwnedByMe();
      setShares(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sharing settings");
    } finally {
      setLoading(false);
    }
  }, [demoMode, mockShares]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (input: ShareInput): Promise<void> => {
    if (demoMode) {
      const now = new Date().toISOString();
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `demo-share-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setShares((prev) =>
        [
          ...prev,
          {
            id,
            ownerUserId: "demo",
            viewerEmail: input.viewerEmail.trim().toLowerCase(),
            role: "viewer" as const,
            createdAt: now,
            updatedAt: now,
          },
        ].sort((a, b) => a.viewerEmail.localeCompare(b.viewerEmail))
      );
      return;
    }
    const created = await createShare(input);
    setShares((prev) => [...prev, created].sort((a, b) => a.viewerEmail.localeCompare(b.viewerEmail)));
  };

  const remove = async (id: string): Promise<void> => {
    if (!demoMode) {
      await deleteShare(id);
    }
    setShares((prev) => prev.filter((share) => share.id !== id));
  };

  return { shares, loading, error, refresh: load, add, remove };
}
