create extension if not exists pgcrypto;

create table if not exists public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text,
  instagram_sender_id text,
  instagram_username text,
  product_id text,
  source_media_id text,
  product_title text not null,
  product_description text,
  product_image_url text,
  product_permalink text,
  price_text text,
  amount numeric(12, 2),
  currency text not null default 'USD',
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation', 'confirmed', 'paid', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'failed')),
  payment_method text,
  confirmation_text text,
  source text not null default 'instagram_ai',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  paid_at timestamptz
);

create index if not exists commerce_orders_user_created_idx
  on public.commerce_orders (user_id, created_at desc);

create index if not exists commerce_orders_user_status_idx
  on public.commerce_orders (user_id, status, created_at desc);

create index if not exists commerce_orders_sender_status_idx
  on public.commerce_orders (user_id, instagram_sender_id, status, created_at desc);

create or replace function public.set_commerce_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists commerce_orders_updated_at on public.commerce_orders;

create trigger commerce_orders_updated_at
before update on public.commerce_orders
for each row
execute function public.set_commerce_orders_updated_at();

alter table public.commerce_orders enable row level security;

drop policy if exists commerce_orders_select_own on public.commerce_orders;
create policy commerce_orders_select_own
  on public.commerce_orders
  for select
  using (auth.uid() = user_id);

drop policy if exists commerce_orders_insert_own on public.commerce_orders;
create policy commerce_orders_insert_own
  on public.commerce_orders
  for insert
  with check (auth.uid() = user_id);

drop policy if exists commerce_orders_update_own on public.commerce_orders;
create policy commerce_orders_update_own
  on public.commerce_orders
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists commerce_orders_delete_own on public.commerce_orders;
create policy commerce_orders_delete_own
  on public.commerce_orders
  for delete
  using (auth.uid() = user_id);
