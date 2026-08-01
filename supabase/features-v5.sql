-- ============================================================
--  Swole Squad v5 — push notifications
--  Run this ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- One row per device/browser a person has turned reminders on for.
-- Someone can have several (phone + laptop), so this is not unique per user.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used  timestamptz
);

create index if not exists idx_push_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;
