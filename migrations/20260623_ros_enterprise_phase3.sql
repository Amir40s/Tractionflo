create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  mid text unique,
  user_id uuid references auth.users(id) on delete set null,
  conversation_id text,
  sender_id text,
  recipient_id text,
  direction text not null default 'inbound'
    check (direction in ('inbound', 'outbound', 'note', 'system')),
  text text,
  timestamp bigint,
  raw_event jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_timestamp_idx
  on public.messages (timestamp desc);

create index if not exists messages_sender_timestamp_idx
  on public.messages (sender_id, timestamp desc);

create index if not exists messages_user_created_idx
  on public.messages (user_id, created_at desc);

create table if not exists public.ros_provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outcome_type text not null,
  provider text not null default '',
  enabled boolean not null default false,
  auto_execute boolean not null default false,
  action_url text,
  cta text,
  execution_mode text not null default 'link'
    check (execution_mode in ('link', 'webhook', 'api')),
  webhook_url text,
  api_endpoint text,
  secret_token text,
  last_status text,
  last_error text,
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, outcome_type)
);

create index if not exists ros_provider_connections_user_idx
  on public.ros_provider_connections (user_id, outcome_type);

create table if not exists public.ros_outcome_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.ros_prospects(id) on delete set null,
  decision_id uuid references public.ros_revenue_decisions(id) on delete set null,
  outcome_id uuid references public.ros_revenue_outcomes(id) on delete set null,
  conversation_id text,
  instagram_sender_id text,
  outcome_type text not null,
  provider text not null default '',
  execution_mode text not null default 'link',
  status text not null default 'queued'
    check (status in ('queued', 'ready', 'routed', 'completed', 'failed', 'skipped')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ros_outcome_executions_user_attempted_idx
  on public.ros_outcome_executions (user_id, attempted_at desc);

create index if not exists ros_outcome_executions_outcome_idx
  on public.ros_outcome_executions (outcome_id);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  creator_email text,
  creator_name text,
  title text not null,
  summary text,
  topic text not null default 'Support',
  priority text not null default 'Medium',
  status text not null default 'Open'
    check (status in ('Open', 'In progress', 'Waiting', 'Resolved', 'Closed', 'Dismissed')),
  assignee text not null default 'Support',
  source text not null default 'system',
  source_event_id text,
  conversation_id text,
  instagram_sender_id text,
  metadata jsonb not null default '{}'::jsonb,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists support_tickets_user_source_event_idx
  on public.support_tickets (user_id, source_event_id)
  where source_event_id is not null;

create index if not exists support_tickets_created_idx
  on public.support_tickets (created_at desc);

create index if not exists support_tickets_status_idx
  on public.support_tickets (status, priority, created_at desc);

create table if not exists public.creator_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  detail text,
  category text not null default 'Success',
  impact text not null default 'Medium',
  status text not null default 'Open'
    check (status in ('Open', 'Watch', 'Setup', 'In progress', 'Resolved', 'Dismissed')),
  owner text not null default 'Success',
  next_step text,
  source text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creator_issues_created_idx
  on public.creator_issues (created_at desc);

create index if not exists creator_issues_user_status_idx
  on public.creator_issues (user_id, status, created_at desc);

create table if not exists public.platform_analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  source text not null default 'app',
  conversation_id text,
  instagram_sender_id text,
  value numeric(12, 2),
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists platform_analytics_events_user_occurred_idx
  on public.platform_analytics_events (user_id, occurred_at desc);

create index if not exists platform_analytics_events_name_occurred_idx
  on public.platform_analytics_events (event_name, occurred_at desc);

create table if not exists public.ros_strategy_adaptations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_key text not null,
  outcome_type text,
  framework text,
  recommendation text not null default '',
  confidence integer not null default 0
    check (confidence >= 0 and confidence <= 100),
  evidence jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, strategy_key)
);

create index if not exists ros_strategy_adaptations_user_confidence_idx
  on public.ros_strategy_adaptations (user_id, confidence desc, computed_at desc);

drop trigger if exists ros_provider_connections_updated_at on public.ros_provider_connections;
create trigger ros_provider_connections_updated_at
before update on public.ros_provider_connections
for each row
execute function public.set_ros_updated_at();

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at
before update on public.support_tickets
for each row
execute function public.set_ros_updated_at();

drop trigger if exists creator_issues_updated_at on public.creator_issues;
create trigger creator_issues_updated_at
before update on public.creator_issues
for each row
execute function public.set_ros_updated_at();

drop trigger if exists ros_strategy_adaptations_updated_at on public.ros_strategy_adaptations;
create trigger ros_strategy_adaptations_updated_at
before update on public.ros_strategy_adaptations
for each row
execute function public.set_ros_updated_at();

alter table public.messages enable row level security;
alter table public.ros_provider_connections enable row level security;
alter table public.ros_outcome_executions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.creator_issues enable row level security;
alter table public.platform_analytics_events enable row level security;
alter table public.ros_strategy_adaptations enable row level security;

drop policy if exists messages_select_own on public.messages;
create policy messages_select_own on public.messages
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists ros_outcome_executions_select_own on public.ros_outcome_executions;
create policy ros_outcome_executions_select_own on public.ros_outcome_executions
  for select using (auth.uid() = user_id);

drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own on public.support_tickets
  for select using (user_id is not null and auth.uid() = user_id);

drop policy if exists creator_issues_select_own on public.creator_issues;
create policy creator_issues_select_own on public.creator_issues
  for select using (user_id is not null and auth.uid() = user_id);

drop policy if exists platform_analytics_events_select_own on public.platform_analytics_events;
create policy platform_analytics_events_select_own on public.platform_analytics_events
  for select using (user_id is not null and auth.uid() = user_id);

drop policy if exists ros_strategy_adaptations_select_own on public.ros_strategy_adaptations;
create policy ros_strategy_adaptations_select_own on public.ros_strategy_adaptations
  for select using (auth.uid() = user_id);
