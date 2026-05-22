import { createClient } from "@/lib/supabase/client";

export interface Income {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  dayOfMonth: number;
  startDate: string;   // ISO YYYY-MM-DD
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeInput {
  name: string;
  amount: number;
  currency: string;
  dayOfMonth: number;
  startDate: string;
  endDate?: string | null;
}

interface DbRow {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

function fromDb(row: DbRow): Income {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: parseFloat(String(row.amount)),
    currency: row.currency,
    dayOfMonth: row.day_of_month,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDb(input: IncomeInput): Omit<DbRow, "id" | "user_id" | "created_at" | "updated_at"> {
  return {
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    day_of_month: input.dayOfMonth,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
  };
}

export async function getIncomes(): Promise<Income[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("incomes")
    .select("*")
    .order("name");

  if (error) { throw new Error(error.message); }
  return (data as DbRow[]).map(fromDb);
}

export async function createIncome(input: IncomeInput): Promise<Income> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated. Please sign in before adding income sources.");
  }

  const { data, error } = await supabase
    .from("incomes")
    .insert({ ...toDb(input), user_id: user.id })
    .select()
    .single();

  if (error) { throw new Error(error.message); }
  return fromDb(data as DbRow);
}

export async function updateIncome(id: string, input: Partial<IncomeInput>): Promise<Income> {
  const supabase = createClient();

  const updates: Partial<ReturnType<typeof toDb>> = {};
  if (input.name !== undefined) { updates.name = input.name; }
  if (input.amount !== undefined) { updates.amount = input.amount; }
  if (input.currency !== undefined) { updates.currency = input.currency; }
  if (input.dayOfMonth !== undefined) { updates.day_of_month = input.dayOfMonth; }
  if (input.startDate !== undefined) { updates.start_date = input.startDate; }
  if (input.endDate !== undefined) { updates.end_date = input.endDate ?? null; }

  const { data, error } = await supabase
    .from("incomes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) { throw new Error(error.message); }
  return fromDb(data as DbRow);
}

export async function deleteIncome(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("incomes")
    .delete()
    .eq("id", id);

  if (error) { throw new Error(error.message); }
}
