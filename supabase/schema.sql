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
  payment_method text      not null default 'bank',
  credit_card_id uuid,
  day_of_month integer     not null,
  color        text,
  category     text,
  start_date   date        not null,
  end_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists payment_method text not null default 'bank';

alter table public.subscriptions
  add column if not exists credit_card_id uuid;

update public.subscriptions
set payment_method = 'bank'
where payment_method is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_payment_method_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_payment_method_check
      check (payment_method in ('bank', 'credit_card'));
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Read-only sharing
-- ---------------------------------------------------------------------------

create table if not exists public.subscription_shares (
  id            uuid        primary key default gen_random_uuid(),
  owner_user_id uuid        not null references auth.users(id) on delete cascade,
  viewer_email  text        not null,
  role          text        not null default 'viewer',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint subscription_shares_role_check check (role in ('viewer')),
  constraint subscription_shares_viewer_email_lower_check check (viewer_email = lower(viewer_email))
);

grant select, insert, update, delete on public.subscription_shares to authenticated;

alter table public.subscription_shares enable row level security;

create policy "Owners can manage their own shares"
  on public.subscription_shares
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "Viewers can see shares granted to their email"
  on public.subscription_shares
  for select
  using (viewer_email = lower(coalesce(auth.jwt()->>'email', '')));

create trigger set_subscription_shares_updated_at
  before update on public.subscription_shares
  for each row execute function public.handle_updated_at();

create unique index if not exists subscription_shares_owner_email_unique
  on public.subscription_shares(owner_user_id, viewer_email);

create index if not exists subscription_shares_lookup_idx
  on public.subscription_shares(owner_user_id, viewer_email, role);

create policy "Shared viewers can read subscriptions"
  on public.subscriptions
  for select
  using (
    exists (
      select 1
      from public.subscription_shares shares
      where shares.owner_user_id = subscriptions.user_id
        and shares.role = 'viewer'
        and shares.viewer_email = lower(coalesce(auth.jwt()->>'email', ''))
    )
  );

create policy "Shared viewers can read incomes"
  on public.incomes
  for select
  using (
    exists (
      select 1
      from public.subscription_shares shares
      where shares.owner_user_id = incomes.user_id
        and shares.role = 'viewer'
        and shares.viewer_email = lower(coalesce(auth.jwt()->>'email', ''))
    )
  );

create policy "Shared viewers can read credit cards"
  on public.credit_cards
  for select
  using (
    exists (
      select 1
      from public.subscription_shares shares
      where shares.owner_user_id = credit_cards.user_id
        and shares.role = 'viewer'
        and shares.viewer_email = lower(coalesce(auth.jwt()->>'email', ''))
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_payment_method_card_pair_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_payment_method_card_pair_check
      check (
        (payment_method = 'bank' and credit_card_id is null)
        or (payment_method = 'credit_card' and credit_card_id is not null)
      );
  end if;
end
$$;

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

create index if not exists subscriptions_credit_card_id_idx
  on public.subscriptions(credit_card_id);

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

-- ---------------------------------------------------------------------------
-- Credit cards
-- ---------------------------------------------------------------------------

create table if not exists public.credit_cards (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  statement_day integer    not null,
  due_day      integer     not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint credit_cards_statement_day_check check (statement_day between 1 and 31),
  constraint credit_cards_due_day_check check (due_day between 1 and 31)
);

grant select, insert, update, delete on public.credit_cards to authenticated;

alter table public.credit_cards enable row level security;

create policy "Users can manage their own credit cards"
  on public.credit_cards
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_credit_cards_updated_at
  before update on public.credit_cards
  for each row execute function public.handle_updated_at();

create index if not exists credit_cards_user_id_idx
  on public.credit_cards(user_id);

create unique index if not exists credit_cards_user_id_id_key
  on public.credit_cards(user_id, id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_credit_card_owner_fk'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_credit_card_owner_fk
      foreign key (user_id, credit_card_id)
      references public.credit_cards(user_id, id)
      on delete restrict;
  end if;
end
$$;
