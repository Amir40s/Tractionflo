create extension if not exists pgcrypto;

create table if not exists public.ros_business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  products jsonb not null default '[]'::jsonb,
  services jsonb not null default '[]'::jsonb,
  pricing jsonb not null default '{}'::jsonb,
  guarantees jsonb not null default '[]'::jsonb,
  policies jsonb not null default '[]'::jsonb,
  brand_voice jsonb not null default '{}'::jsonb,
  offers jsonb not null default '[]'::jsonb,
  success_stories jsonb not null default '[]'::jsonb,
  source_summary text,
  confidence integer not null default 0,
  last_extracted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ros_business_profiles_confidence_check check (confidence >= 0 and confidence <= 100)
);

create table if not exists public.ros_conversion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.ros_prospects(id) on delete set null,
  decision_id uuid references public.ros_revenue_decisions(id) on delete set null,
  outcome_id uuid references public.ros_revenue_outcomes(id) on delete set null,
  commerce_order_id uuid,
  conversation_id text,
  instagram_sender_id text,
  event_type text not null,
  outcome_type text not null,
  status text not null default 'recorded',
  value numeric(12, 2),
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ros_conversion_events_status_check check (status in ('recorded', 'pending', 'completed', 'won', 'lost', 'failed', 'cancelled', 'refunded'))
);

create index if not exists ros_conversion_events_user_occurred_idx
  on public.ros_conversion_events (user_id, occurred_at desc);

create index if not exists ros_conversion_events_prospect_occurred_idx
  on public.ros_conversion_events (prospect_id, occurred_at desc);

create index if not exists ros_conversion_events_order_idx
  on public.ros_conversion_events (commerce_order_id);

create table if not exists public.ros_learning_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  summary text not null default '',
  conversion_patterns jsonb not null default '[]'::jsonb,
  objections jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ros_business_profiles_updated_at on public.ros_business_profiles;
create trigger ros_business_profiles_updated_at
before update on public.ros_business_profiles
for each row
execute function public.set_ros_updated_at();

drop trigger if exists ros_learning_summaries_updated_at on public.ros_learning_summaries;
create trigger ros_learning_summaries_updated_at
before update on public.ros_learning_summaries
for each row
execute function public.set_ros_updated_at();

alter table public.ros_business_profiles enable row level security;
alter table public.ros_conversion_events enable row level security;
alter table public.ros_learning_summaries enable row level security;

drop policy if exists ros_business_profiles_select_own on public.ros_business_profiles;
create policy ros_business_profiles_select_own on public.ros_business_profiles
  for select using (auth.uid() = user_id);

drop policy if exists ros_business_profiles_insert_own on public.ros_business_profiles;
create policy ros_business_profiles_insert_own on public.ros_business_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists ros_business_profiles_update_own on public.ros_business_profiles;
create policy ros_business_profiles_update_own on public.ros_business_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ros_conversion_events_select_own on public.ros_conversion_events;
create policy ros_conversion_events_select_own on public.ros_conversion_events
  for select using (auth.uid() = user_id);

drop policy if exists ros_conversion_events_insert_own on public.ros_conversion_events;
create policy ros_conversion_events_insert_own on public.ros_conversion_events
  for insert with check (auth.uid() = user_id);

drop policy if exists ros_conversion_events_update_own on public.ros_conversion_events;
create policy ros_conversion_events_update_own on public.ros_conversion_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ros_learning_summaries_select_own on public.ros_learning_summaries;
create policy ros_learning_summaries_select_own on public.ros_learning_summaries
  for select using (auth.uid() = user_id);

drop policy if exists ros_learning_summaries_insert_own on public.ros_learning_summaries;
create policy ros_learning_summaries_insert_own on public.ros_learning_summaries
  for insert with check (auth.uid() = user_id);

drop policy if exists ros_learning_summaries_update_own on public.ros_learning_summaries;
create policy ros_learning_summaries_update_own on public.ros_learning_summaries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
