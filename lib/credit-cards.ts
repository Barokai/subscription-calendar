import { createClient } from "@/lib/supabase/client";

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  statementDay: number;
  dueDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardInput {
  name: string;
  statementDay: number;
  dueDay: number;
}

interface DbRow {
  id: string;
  user_id: string;
  name: string;
  statement_day: number;
  due_day: number;
  created_at: string;
  updated_at: string;
}

function fromDb(row: DbRow): CreditCard {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    statementDay: row.statement_day,
    dueDay: row.due_day,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDb(input: CreditCardInput): Omit<DbRow, "id" | "user_id" | "created_at" | "updated_at"> {
  return {
    name: input.name.trim(),
    statement_day: input.statementDay,
    due_day: input.dueDay,
  };
}

function validateInput(input: CreditCardInput): void {
  if (!input.name.trim()) {
    throw new Error("Card name is required.");
  }
  if (input.statementDay < 1 || input.statementDay > 31) {
    throw new Error("Statement day must be between 1 and 31.");
  }
  if (input.dueDay < 1 || input.dueDay > 31) {
    throw new Error("Due day must be between 1 and 31.");
  }
}

export async function getCreditCards(): Promise<CreditCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("credit_cards")
    .select("*")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }
  return (data as DbRow[]).map(fromDb);
}

export async function createCreditCard(input: CreditCardInput): Promise<CreditCard> {
  validateInput(input);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated. Please sign in before adding credit cards.");
  }

  const { data, error } = await supabase
    .from("credit_cards")
    .insert({ ...toDb(input), user_id: user.id })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return fromDb(data as DbRow);
}

export async function updateCreditCard(id: string, input: Partial<CreditCardInput>): Promise<CreditCard> {
  const updates: Partial<ReturnType<typeof toDb>> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new Error("Card name is required.");
    }
    updates.name = input.name.trim();
  }
  if (input.statementDay !== undefined) {
    if (input.statementDay < 1 || input.statementDay > 31) {
      throw new Error("Statement day must be between 1 and 31.");
    }
    updates.statement_day = input.statementDay;
  }
  if (input.dueDay !== undefined) {
    if (input.dueDay < 1 || input.dueDay > 31) {
      throw new Error("Due day must be between 1 and 31.");
    }
    updates.due_day = input.dueDay;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("credit_cards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return fromDb(data as DbRow);
}

export async function deleteCreditCard(id: string): Promise<void> {
  const supabase = createClient();
  const { data: linked, error: linkedError } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact" })
    .eq("credit_card_id", id)
    .limit(1);

  if (linkedError) {
    throw new Error(linkedError.message);
  }
  if (linked && linked.length > 0) {
    throw new Error("This credit card is assigned to subscriptions. Reassign them before deleting the card.");
  }

  const { error } = await supabase
    .from("credit_cards")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
