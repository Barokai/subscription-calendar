-- Read-only sharing v1 migration
-- Apply this on databases that already have subscriptions/incomes/credit_cards.

create extension if not exists pgcrypto;

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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscription_shares'
      and policyname = 'Owners can manage their own shares'
  ) then
    create policy "Owners can manage their own shares"
      on public.subscription_shares
      for all
      using (auth.uid() = owner_user_id)
      with check (auth.uid() = owner_user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscription_shares'
      and policyname = 'Viewers can see shares granted to their email'
  ) then
    create policy "Viewers can see shares granted to their email"
      on public.subscription_shares
      for select
      using (viewer_email = lower(coalesce(auth.jwt()->>'email', '')));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_subscription_shares_updated_at'
      and tgrelid = 'public.subscription_shares'::regclass
  ) then
    create trigger set_subscription_shares_updated_at
      before update on public.subscription_shares
      for each row execute function public.handle_updated_at();
  end if;
end
$$;

create unique index if not exists subscription_shares_owner_email_unique
  on public.subscription_shares(owner_user_id, viewer_email);

create index if not exists subscription_shares_lookup_idx
  on public.subscription_shares(owner_user_id, viewer_email, role);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'Shared viewers can read subscriptions'
  ) then
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
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'incomes'
      and policyname = 'Shared viewers can read incomes'
  ) then
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
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_cards'
      and policyname = 'Shared viewers can read credit cards'
  ) then
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
  end if;
end
$$;
