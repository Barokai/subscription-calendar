import { createClient } from "@/lib/supabase/client";

export type PaymentMethod = "bank" | "credit_card";

// UI-facing type (camelCase — matches existing component expectations)
export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  frequency: string;
  paymentMethod: PaymentMethod;
  creditCardId: string | null;
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
  paymentMethod?: PaymentMethod;
  creditCardId?: string | null;
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
  payment_method: PaymentMethod;
  credit_card_id: string | null;
  day_of_month: number;
  color: string | null;
  category: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

function fromDb(row: DbRow): Subscription {
  const paymentMethod = row.payment_method === "credit_card" ? "credit_card" : "bank";
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: parseFloat(String(row.amount)), // PostgREST may return numeric as string
    currency: row.currency,
    frequency: row.frequency,
    paymentMethod,
    creditCardId: paymentMethod === "credit_card" ? row.credit_card_id : null,
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
  const paymentMethod = input.paymentMethod ?? "bank";
  return {
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    frequency: input.frequency,
    payment_method: paymentMethod,
    credit_card_id: paymentMethod === "credit_card" ? input.creditCardId ?? null : null,
    day_of_month: input.dayOfMonth,
    color: input.color ?? null,
    category: input.category ?? null,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
  };
}

function ensureValidPaymentSelection(paymentMethod: PaymentMethod, creditCardId: string | null): void {
  if (paymentMethod === "credit_card" && !creditCardId) {
    throw new Error("Please select a credit card when payment method is credit card.");
  }
  if (paymentMethod === "bank" && creditCardId) {
    throw new Error("Bank payments cannot have a credit card selected.");
  }
}

async function assertCreditCardOwnedByUser(
  creditCardId: string | null,
  userId: string
): Promise<void> {
  if (!creditCardId) {
    return;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("credit_cards")
    .select("id")
    .eq("id", creditCardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Selected credit card was not found for your account.");
  }
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

  if (!user) {
    throw new Error("Not authenticated. Please sign in before adding subscriptions.");
  }

  const paymentMethod = input.paymentMethod ?? "bank";
  const creditCardId = paymentMethod === "credit_card" ? input.creditCardId ?? null : null;
  ensureValidPaymentSelection(paymentMethod, creditCardId);
  await assertCreditCardOwnedByUser(creditCardId, user.id);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ ...toDb({ ...input, paymentMethod, creditCardId }), user_id: user.id })
    .select()
    .single();

  if (error) { throw new Error(error.message); }
  return fromDb(data as DbRow);
}

export async function updateSubscription(id: string, input: Partial<SubscriptionInput>): Promise<Subscription> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated. Please sign in before updating subscriptions.");
  }

  const { data: existingData, error: existingError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = existingData as DbRow;
  const nextPaymentMethod = input.paymentMethod ?? existing.payment_method ?? "bank";
  const nextCreditCardId =
    input.creditCardId !== undefined
      ? (input.creditCardId ?? null)
      : nextPaymentMethod === "credit_card"
      ? existing.credit_card_id
      : null;
  ensureValidPaymentSelection(nextPaymentMethod, nextCreditCardId);
  await assertCreditCardOwnedByUser(nextCreditCardId, user.id);

  const updates: Partial<ReturnType<typeof toDb>> = {};
  if (input.name !== undefined) { updates.name = input.name; }
  if (input.amount !== undefined) { updates.amount = input.amount; }
  if (input.currency !== undefined) { updates.currency = input.currency; }
  if (input.frequency !== undefined) { updates.frequency = input.frequency; }
  if (input.paymentMethod !== undefined) { updates.payment_method = nextPaymentMethod; }
  if (input.creditCardId !== undefined || input.paymentMethod !== undefined) {
    updates.credit_card_id = nextPaymentMethod === "credit_card" ? nextCreditCardId : null;
  }
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
