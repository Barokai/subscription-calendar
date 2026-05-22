-- Run this in the Supabase SQL editor to set up the schema.

-- pgcrypto is required for gen_random_uuid(); most Supabase projects have it
-- enabled by default, but this makes the script self-contained.
create extension if not exists pgcrypto;

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

-- Grant access to authenticated users (required alongside RLS)
grant select, insert, update, delete on public.subscriptions to authenticated;

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
  for each row execute function public.handle_updated_at();

-- Useful index for per-user queries
create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);

-- ---------------------------------------------------------------------------
-- Income sources
-- ---------------------------------------------------------------------------

create table if not exists public.incomes (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  amount       numeric(10,2) not null,
  currency     text        not null default 'EUR',
  day_of_month integer     not null,
  start_date   date        not null,
  end_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

grant select, insert, update, delete on public.incomes to authenticated;

alter table public.incomes enable row level security;

create policy "Users can manage their own incomes"
  on public.incomes
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_incomes_updated_at
  before update on public.incomes
  for each row execute function public.handle_updated_at();

create index if not exists incomes_user_id_idx
  on public.incomes(user_id);
