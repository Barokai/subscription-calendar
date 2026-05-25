"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Income,
  IncomeInput,
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
} from "@/lib/incomes";

function buildDemoIncome(input: IncomeInput): Income {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `demo-income-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    userId: "demo",
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    dayOfMonth: input.dayOfMonth,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function useIncomes(demoMode: boolean, mockData: Income[]) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (demoMode) {
      setIncomes(mockData);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getIncomes();
      setIncomes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incomes");
    } finally {
      setLoading(false);
    }
  }, [demoMode, mockData]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (input: IncomeInput): Promise<void> => {
    if (demoMode) {
      const created = buildDemoIncome(input);
      setIncomes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return;
    }
    const created = await createIncome(input);
    setIncomes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const update = async (id: string, input: Partial<IncomeInput>): Promise<void> => {
    if (demoMode) {
      setIncomes((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, ...input, dayOfMonth: input.dayOfMonth ?? s.dayOfMonth, updatedAt: new Date().toISOString() }
            : s
        )
      );
      return;
    }
    const updated = await updateIncome(id, input);
    setIncomes((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const remove = async (id: string): Promise<void> => {
    if (demoMode) {
      setIncomes((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    await deleteIncome(id);
    setIncomes((prev) => prev.filter((s) => s.id !== id));
  };

  return { incomes, loading, error, refresh: load, add, update, remove };
}
