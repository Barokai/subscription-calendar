"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  CreditCardInput,
  getCreditCards,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
} from "@/lib/credit-cards";

function buildDemoCreditCard(input: CreditCardInput): CreditCard {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `demo-card-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  return {
    id,
    userId: "demo",
    name: input.name,
    statementDay: input.statementDay,
    dueDay: input.dueDay,
    createdAt: now,
    updatedAt: now,
  };
}

export function useCreditCards(demoMode: boolean, mockData: CreditCard[]) {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (demoMode) {
      setCreditCards(mockData);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getCreditCards();
      setCreditCards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load credit cards");
    } finally {
      setLoading(false);
    }
  }, [demoMode, mockData]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (input: CreditCardInput): Promise<void> => {
    if (demoMode) {
      const created = buildDemoCreditCard(input);
      setCreditCards((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return;
    }
    const created = await createCreditCard(input);
    setCreditCards((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const update = async (id: string, input: Partial<CreditCardInput>): Promise<void> => {
    if (demoMode) {
      setCreditCards((prev) =>
        prev.map((card) =>
          card.id === id
            ? {
                ...card,
                ...input,
                statementDay: input.statementDay ?? card.statementDay,
                dueDay: input.dueDay ?? card.dueDay,
                updatedAt: new Date().toISOString(),
              }
            : card
        )
      );
      return;
    }

    const updated = await updateCreditCard(id, input);
    setCreditCards((prev) => prev.map((card) => (card.id === id ? updated : card)));
  };

  const remove = async (id: string): Promise<void> => {
    if (demoMode) {
      setCreditCards((prev) => prev.filter((card) => card.id !== id));
      return;
    }
    await deleteCreditCard(id);
    setCreditCards((prev) => prev.filter((card) => card.id !== id));
  };

  return { creditCards, loading, error, refresh: load, add, update, remove };
}
