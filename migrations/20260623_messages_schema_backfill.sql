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

alter table public.messages
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists conversation_id text,
  add column if not exists recipient_id text,
  add column if not exists direction text,
  add column if not exists raw_event jsonb,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz default now();

update public.messages
set
  direction = coalesce(direction, 'inbound'),
  raw_event = coalesce(raw_event, '{}'::jsonb),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, now());

alter table public.messages
  alter column direction set default 'inbound',
  alter column direction set not null,
  alter column raw_event set default '{}'::jsonb,
  alter column raw_event set not null,
  alter column metadata set default '{}'::jsonb,
  alter column metadata set not null,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_direction_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_direction_check
      check (direction in ('inbound', 'outbound', 'note', 'system'));
  end if;
end $$;

create index if not exists messages_timestamp_idx
  on public.messages (timestamp desc);

create index if not exists messages_sender_timestamp_idx
  on public.messages (sender_id, timestamp desc);

create index if not exists messages_user_created_idx
  on public.messages (user_id, created_at desc);

create index if not exists messages_conversation_timestamp_idx
  on public.messages (conversation_id, timestamp desc);

