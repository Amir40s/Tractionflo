create extension if not exists pgcrypto;

create table if not exists public.ros_prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instagram_sender_id text,
  instagram_username text,
  display_name text,
  buyer_profile jsonb not null default '{}'::jsonb,
  readiness text,
  last_intent text,
  last_objection text,
  last_best_next_action text,
  last_confidence integer,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ros_prospects_confidence_check check (last_confidence is null or (last_confidence >= 0 and last_confidence <= 100))
);

create unique index if not exists ros_prospects_user_instagram_sender_idx
  on public.ros_prospects (user_id, instagram_sender_id)
  where instagram_sender_id is not null;

create index if not exists ros_prospects_user_seen_idx
  on public.ros_prospects (user_id, last_seen_at desc);

create table if not exists public.ros_conversation_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.ros_prospects(id) on delete set null,
  conversation_id text,
  instagram_sender_id text,
  message_count integer not null default 0,
  latest_message text,
  conversation_intelligence jsonb not null default '{}'::jsonb,
  buyer_intelligence jsonb not null default '{}'::jsonb,
  revenue_intelligence jsonb not null default '{}'::jsonb,
  memory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ros_conversation_insights_user_created_idx
  on public.ros_conversation_insights (user_id, created_at desc);

create index if not exists ros_conversation_insights_prospect_created_idx
  on public.ros_conversation_insights (prospect_id, created_at desc);

create table if not exists public.ros_revenue_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.ros_prospects(id) on delete set null,
  conversation_id text,
  instagram_sender_id text,
  source text not null default 'ai_workflow',
  best_next_action text not null,
  confidence integer not null default 0,
  rationale text,
  cta text,
  outcome_probabilities jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ros_revenue_decisions_confidence_check check (confidence >= 0 and confidence <= 100)
);

create index if not exists ros_revenue_decisions_user_created_idx
  on public.ros_revenue_decisions (user_id, created_at desc);

create index if not exists ros_revenue_decisions_prospect_created_idx
  on public.ros_revenue_decisions (prospect_id, created_at desc);

create table if not exists public.ros_revenue_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.ros_prospects(id) on delete set null,
  decision_id uuid references public.ros_revenue_decisions(id) on delete set null,
  conversation_id text,
  outcome_type text not null,
  status text not null default 'pending',
  value numeric(12, 2),
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ros_revenue_outcomes_status_check check (status in ('pending', 'won', 'lost', 'completed', 'cancelled', 'refunded'))
);

create index if not exists ros_revenue_outcomes_user_occurred_idx
  on public.ros_revenue_outcomes (user_id, occurred_at desc);

create index if not exists ros_revenue_outcomes_decision_idx
  on public.ros_revenue_outcomes (decision_id);

create table if not exists public.ros_escalation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.ros_prospects(id) on delete set null,
  conversation_id text,
  instagram_sender_id text,
  intent text not null,
  urgency text not null,
  risk_score integer not null default 0,
  summary text,
  recommended_action text,
  signals jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint ros_escalation_events_risk_check check (risk_score >= 0 and risk_score <= 100),
  constraint ros_escalation_events_status_check check (status in ('open', 'working', 'resolved', 'dismissed'))
);

create index if not exists ros_escalation_events_user_created_idx
  on public.ros_escalation_events (user_id, created_at desc);

create table if not exists public.ros_learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.ros_prospects(id) on delete set null,
  decision_id uuid references public.ros_revenue_decisions(id) on delete set null,
  event_type text not null,
  signal text,
  impact_score numeric(6, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ros_learning_events_user_created_idx
  on public.ros_learning_events (user_id, created_at desc);

create or replace function public.set_ros_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ros_prospects_updated_at on public.ros_prospects;

create trigger ros_prospects_updated_at
before update on public.ros_prospects
for each row
execute function public.set_ros_updated_at();

alter table public.ros_prospects enable row level security;
alter table public.ros_conversation_insights enable row level security;
alter table public.ros_revenue_decisions enable row level security;
alter table public.ros_revenue_outcomes enable row level security;
alter table public.ros_escalation_events enable row level security;
alter table public.ros_learning_events enable row level security;

drop policy if exists ros_prospects_select_own on public.ros_prospects;
create policy ros_prospects_select_own on public.ros_prospects
  for select using (auth.uid() = user_id);

drop policy if exists ros_prospects_insert_own on public.ros_prospects;
create policy ros_prospects_insert_own on public.ros_prospects
  for insert with check (auth.uid() = user_id);

drop policy if exists ros_prospects_update_own on public.ros_prospects;
create policy ros_prospects_update_own on public.ros_prospects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ros_conversation_insights_select_own on public.ros_conversation_insights;
create policy ros_conversation_insights_select_own on public.ros_conversation_insights
  for select using (auth.uid() = user_id);

drop policy if exists ros_conversation_insights_insert_own on public.ros_conversation_insights;
create policy ros_conversation_insights_insert_own on public.ros_conversation_insights
  for insert with check (auth.uid() = user_id);

drop policy if exists ros_revenue_decisions_select_own on public.ros_revenue_decisions;
create policy ros_revenue_decisions_select_own on public.ros_revenue_decisions
  for select using (auth.uid() = user_id);

drop policy if exists ros_revenue_decisions_insert_own on public.ros_revenue_decisions;
create policy ros_revenue_decisions_insert_own on public.ros_revenue_decisions
  for insert with check (auth.uid() = user_id);

drop policy if exists ros_revenue_outcomes_select_own on public.ros_revenue_outcomes;
create policy ros_revenue_outcomes_select_own on public.ros_revenue_outcomes
  for select using (auth.uid() = user_id);

drop policy if exists ros_revenue_outcomes_insert_own on public.ros_revenue_outcomes;
create policy ros_revenue_outcomes_insert_own on public.ros_revenue_outcomes
  for insert with check (auth.uid() = user_id);

drop policy if exists ros_revenue_outcomes_update_own on public.ros_revenue_outcomes;
create policy ros_revenue_outcomes_update_own on public.ros_revenue_outcomes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ros_escalation_events_select_own on public.ros_escalation_events;
create policy ros_escalation_events_select_own on public.ros_escalation_events
  for select using (auth.uid() = user_id);

drop policy if exists ros_escalation_events_insert_own on public.ros_escalation_events;
create policy ros_escalation_events_insert_own on public.ros_escalation_events
  for insert with check (auth.uid() = user_id);

drop policy if exists ros_escalation_events_update_own on public.ros_escalation_events;
create policy ros_escalation_events_update_own on public.ros_escalation_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ros_learning_events_select_own on public.ros_learning_events;
create policy ros_learning_events_select_own on public.ros_learning_events
  for select using (auth.uid() = user_id);

drop policy if exists ros_learning_events_insert_own on public.ros_learning_events;
create policy ros_learning_events_insert_own on public.ros_learning_events
  for insert with check (auth.uid() = user_id);
