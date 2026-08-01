-- ============================================================
--  Swole Squad v6 — email preferences, badges, items, loot boxes
--  Run this ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- email preferences ----------
-- Reminders are OFF by default now. The access link is transactional and always
-- sends, since it is how someone gets back into their account.
alter table users add column if not exists email_reminders    boolean not null default false;
alter table users add column if not exists email_activity     boolean not null default false;
alter table users add column if not exists email_unsubscribed boolean not null default false;

-- Existing people move to the new default rather than silently keeping the old
-- behaviour. They can switch reminders back on in their preferences.
update users set email_reminders = false where email_reminders is null;

-- ---------- when someone logged, in their own local hours ----------
-- Used for the hidden "early bird" / "night owl" badges. Nullable: rows logged
-- before this release simply do not qualify.
alter table logs add column if not exists local_hour int;

-- ---------- badges ----------
create table if not exists user_badges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  badge_key  text not null,
  earned_at  timestamptz not null default now(),
  unique (user_id, badge_key)
);
create index if not exists idx_user_badges_user on user_badges(user_id);

-- ---------- collectible items ----------
create table if not exists user_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  item_key    text not null,
  obtained_at timestamptz not null default now(),
  unique (user_id, item_key)
);
create index if not exists idx_user_items_user on user_items(user_id);

-- What the avatar is currently wearing: { "head": "crown", "face": "shades" }
alter table users add column if not exists equipped jsonb not null default '{}'::jsonb;

-- ---------- loot boxes ----------
-- A box is granted by an achievement, then opened later. opened_at null = unopened.
create table if not exists loot_boxes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  source     text not null,          -- 'welcome' | 'badge:<key>' | 'challenge_complete'
  created_at timestamptz not null default now(),
  opened_at  timestamptz,
  item_key   text                    -- what came out, once opened
);
create index if not exists idx_loot_user_unopened on loot_boxes(user_id) where opened_at is null;

-- Boxes are granted at most once per source per person, so a replayed request
-- or a double tap cannot mint extra boxes.
create unique index if not exists idx_loot_unique_source on loot_boxes(user_id, source);

alter table user_badges enable row level security;
alter table user_items  enable row level security;
alter table loot_boxes  enable row level security;
