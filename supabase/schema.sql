-- =============================================================================
-- Stoke Yange — FULL Supabase schema
-- Run this ENTIRE file once in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS)
-- =============================================================================

-- 1) PROFILES (extends your existing table with any missing columns)
create table if not exists public.profiles (
  id uuid not null primary key references auth.users (id) on delete cascade,
  shop_name text null default 'Iduka Ryanjye',
  email text null,
  full_name text null,
  phone text null,
  age text null,
  created_at timestamptz null default now(),
  updated_at timestamptz null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists age text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists shop_name text;
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- 2) PRODUCTS
create table if not exists public.products (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id bigint not null,
  name text not null,
  category text not null default 'Household',
  unit text not null default 'pcs',
  cost numeric not null default 0,
  price numeric not null default 0,
  stock numeric not null default 0,
  min numeric not null default 3,
  emoji text not null default '📦',
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);
create index if not exists products_user_idx on public.products (user_id);

-- 3) PARTIES (customers & suppliers)
create table if not exists public.parties (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id bigint not null,
  name text not null,
  phone text not null default '',
  kind text not null check (kind in ('customer', 'supplier')),
  created_at timestamptz not null default now(),
  unique (user_id, local_id)
);
create index if not exists parties_user_idx on public.parties (user_id);

-- 4) SALES
create table if not exists public.sales (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id bigint not null,
  product_local_id bigint not null,
  product_name text not null,
  qty numeric not null,
  unit_price numeric not null,
  unit_cost numeric not null default 0,
  total numeric not null,
  type text not null check (type in ('cash', 'credit')),
  party_local_id bigint null,
  created_at timestamptz not null default now(),
  reversed smallint not null default 0,
  unique (user_id, local_id)
);
create index if not exists sales_user_idx on public.sales (user_id);

-- 5) DEBTS
create table if not exists public.debts (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id bigint not null,
  party_local_id bigint not null,
  description text not null default '',
  amount numeric not null,
  created_at timestamptz not null default now(),
  sale_local_id bigint null,
  unique (user_id, local_id)
);
create index if not exists debts_user_idx on public.debts (user_id);

-- 6) PAYMENTS
create table if not exists public.payments (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id bigint not null,
  party_local_id bigint not null,
  amount numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, local_id)
);
create index if not exists payments_user_idx on public.payments (user_id);

-- 7) MOVEMENTS (stock in / sale / adjust)
create table if not exists public.movements (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id bigint not null,
  product_local_id bigint not null,
  type text not null,
  qty numeric not null,
  unit_cost numeric null,
  created_at timestamptz not null default now(),
  unique (user_id, local_id)
);
create index if not exists movements_user_idx on public.movements (user_id);

-- =============================================================================
-- RLS — each user only sees their own rows
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.parties enable row level security;
alter table public.sales enable row level security;
alter table public.debts enable row level security;
alter table public.payments enable row level security;
alter table public.movements enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Products
drop policy if exists "products_all_own" on public.products;
create policy "products_all_own" on public.products for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Parties
drop policy if exists "parties_all_own" on public.parties;
create policy "parties_all_own" on public.parties for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sales
drop policy if exists "sales_all_own" on public.sales;
create policy "sales_all_own" on public.sales for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Debts
drop policy if exists "debts_all_own" on public.debts;
create policy "debts_all_own" on public.debts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Payments
drop policy if exists "payments_all_own" on public.payments;
create policy "payments_all_own" on public.payments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Movements
drop policy if exists "movements_all_own" on public.movements;
create policy "movements_all_own" on public.movements for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- Auto-create profile row when a user signs up (Auth → profiles)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, shop_name, phone, age)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'business_name', 'Iduka Ryanjye'),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'age', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    shop_name = coalesce(nullif(excluded.shop_name, ''), profiles.shop_name),
    phone = coalesce(nullif(excluded.phone, ''), profiles.phone),
    age = coalesce(nullif(excluded.age, ''), profiles.age),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Done. Next:
-- Authentication → Providers → Email: enable, turn OFF "Confirm email" for faster login
-- Project Settings → API: copy anon/public key into Vercel as VITE_SUPABASE_ANON_KEY
