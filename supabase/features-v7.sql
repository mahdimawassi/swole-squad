-- ============================================================
--  Swole Squad v7 — activity feed, notification preferences
--  Run this ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- what you get pinged about ----------
-- These only matter once someone has turned phone notifications on at all;
-- the subscription itself is still the master opt-in.
alter table users add column if not exists push_reminders boolean not null default true;
alter table users add column if not exists push_social    boolean not null default true;

-- ---------- the bell ----------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  type       text not null,            -- reaction | badge | join | ended | box
  title      text not null,
  body       text,
  url        text,
  icon       text,                     -- an emoji to show in the list
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread
  on notifications(user_id) where read_at is null;

alter table notifications enable row level security;

-- Keep the table from growing forever. Anything read and older than 30 days goes.
delete from notifications where read_at is not null and created_at < now() - interval '30 days';
