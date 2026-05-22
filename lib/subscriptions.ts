import { createClient } from "@/lib/supabase/client";

// UI-facing type (camelCase — matches existing component expectations)
export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  frequency: string;
  dayOfMonth: number;
  color: string | null;
  category: string | null;
  startDate: string;   // ISO YYYY-MM-DD
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// What we send to Supabase (snake_case, no server-managed fields)
export interface SubscriptionInput {
  name: string;
  amount: number;
  currency: string;
  frequency: string;
  dayOfMonth: number;
  color?: string | null;
  category?: string | null;
  startDate: string;
  endDate?: string | null;
}

// Raw DB row shape (snake_case from Supabase)
interface DbRow {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: string;
  day_of_month: number;
  color: string | null;
  category: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

function fromDb(row: DbRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    frequency: row.frequency,
    dayOfMonth: row.day_of_month,
    color: row.color,
    category: row.category,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDb(input: SubscriptionInput): Omit<DbRow, "id" | "user_id" | "created_at" | "updated_at"> {
  return {
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    frequency: input.frequency,
    day_of_month: input.dayOfMonth,
    color: input.color ?? null,
    category: input.category ?? null,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
  };
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("name");

  if (error) { throw new Error(error.message); }
  return (data as DbRow[]).map(fromDb);
}

export async function createSubscription(input: SubscriptionInput): Promise<Subscription> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ ...toDb(input), user_id: user!.id })
    .select()
    .single();

  if (error) { throw new Error(error.message); }
  return fromDb(data as DbRow);
}

export async function updateSubscription(id: string, input: Partial<SubscriptionInput>): Promise<Subscription> {
  const supabase = createClient();

  const updates: Partial<ReturnType<typeof toDb>> = {};
  if (input.name !== undefined) { updates.name = input.name; }
  if (input.amount !== undefined) { updates.amount = input.amount; }
  if (input.currency !== undefined) { updates.currency = input.currency; }
  if (input.frequency !== undefined) { updates.frequency = input.frequency; }
  if (input.dayOfMonth !== undefined) { updates.day_of_month = input.dayOfMonth; }
  if (input.color !== undefined) { updates.color = input.color ?? null; }
  if (input.category !== undefined) { updates.category = input.category ?? null; }
  if (input.startDate !== undefined) { updates.start_date = input.startDate; }
  if (input.endDate !== undefined) { updates.end_date = input.endDate ?? null; }

  const { data, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) { throw new Error(error.message); }
  return fromDb(data as DbRow);
}

export async function deleteSubscription(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id);

  if (error) { throw new Error(error.message); }
}

