import { createClient } from "@/lib/supabase/client";

export type ShareRole = "viewer";

export interface SubscriptionShare {
  id: string;
  ownerUserId: string;
  viewerEmail: string;
  role: ShareRole;
  createdAt: string;
  updatedAt: string;
}

export interface ShareInput {
  viewerEmail: string;
}

interface DbRow {
  id: string;
  owner_user_id: string;
  viewer_email: string;
  role: ShareRole;
  created_at: string;
  updated_at: string;
}

function fromDb(row: DbRow): SubscriptionShare {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    viewerEmail: row.viewer_email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getSharesOwnedByMe(): Promise<SubscriptionShare[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscription_shares")
    .select("*")
    .order("viewer_email");

  if (error) {
    throw new Error(error.message);
  }
  return (data as DbRow[]).map(fromDb);
}

export async function createShare(input: ShareInput): Promise<SubscriptionShare> {
  const viewerEmail = normalizeEmail(input.viewerEmail);
  if (!viewerEmail) {
    throw new Error("Viewer email is required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(viewerEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error(userError.message);
  }
  if (!userData.user) {
    throw new Error("Not authenticated.");
  }
  if ((userData.user.email ?? "").toLowerCase() === viewerEmail) {
    throw new Error("You already have access to your own data.");
  }

  const { data, error } = await supabase
    .from("subscription_shares")
    .insert({
      owner_user_id: userData.user.id,
      viewer_email: viewerEmail,
      role: "viewer",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return fromDb(data as DbRow);
}

export async function deleteShare(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("subscription_shares")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
