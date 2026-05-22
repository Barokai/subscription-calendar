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
    const created = await createIncome(input);
    setIncomes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const update = async (id: string, input: Partial<IncomeInput>): Promise<void> => {
    const updated = await updateIncome(id, input);
    setIncomes((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const remove = async (id: string): Promise<void> => {
    await deleteIncome(id);
    setIncomes((prev) => prev.filter((s) => s.id !== id));
  };

  return { incomes, loading, error, refresh: load, add, update, remove };
}
