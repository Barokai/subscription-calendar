-- Run this in the Supabase SQL editor to set up the schema.

create table if not exists public.subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  amount       numeric(10,2) not null,
  currency     text        not null default 'EUR',
  frequency    text        not null default 'monthly',
  day_of_month integer     not null,
  color        text,
  category     text,
  start_date   date        not null,
  end_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Row Level Security: every user sees only their own rows
alter table public.subscriptions enable row level security;

create policy "Users can manage their own subscriptions"
  on public.subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on row changes
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();

-- Useful index for per-user queries
create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);
