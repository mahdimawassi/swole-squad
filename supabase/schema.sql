-- ============================================================
--  Swole Squad v2 - FRESH INSTALL schema
--  Use this ONLY for a brand new Supabase project.
--  If you already ran v1, run migrate-v1-to-v2.sql instead.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- who you are (one row per person, across all challenges) ----------
create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique,
  name         text not null,
  avatar_color text not null,
  secret_token uuid not null unique default gen_random_uuid(),
  created_at   timestamptz not null default now()
);

-- ---------- a challenge ----------
create table if not exists challenges (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  activity      text not null default 'Push-ups',
  unit_label    text not null default 'reps',
  goal_mode     text not null default 'daily' check (goal_mode in ('daily', 'total')),
  goal_amount   numeric(10,2) not null check (goal_amount > 0),
  start_date    date not null default current_date,
  duration_days int  not null check (duration_days between 1 and 365),
  end_date      date not null,
  invite_code   text not null unique,
  created_by    uuid references users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ---------- membership (a person IN a challenge) ----------
create table if not exists participants (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  removed_at   timestamptz,
  unique (challenge_id, user_id)
);

-- ---------- daily entries ----------
create table if not exists logs (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  day_date       date not null,
  amount         numeric(10,2) not null check (amount >= 0),
  updated_at     timestamptz not null default now(),
  unique (participant_id, day_date)
);

create index if not exists idx_participants_challenge on participants(challenge_id);
create index if not exists idx_participants_user on participants(user_id);
create index if not exists idx_logs_participant on logs(participant_id);

-- ---------- security ----------
-- All access happens server-side with the SERVICE ROLE key, which bypasses RLS.
-- RLS on with no policies means nobody else (including the public anon key)
-- can read or write these tables directly.
alter table users        enable row level security;
alter table challenges   enable row level security;
alter table participants enable row level security;
alter table logs         enable row level security;

-- ---------- atomic logging ----------
-- mode 'add' bumps the day's total (quick-add buttons).
-- mode 'set' overwrites it (the edit / undo field). Setting 0 clears the day.
create or replace function log_amount(p_pid uuid, p_day date, p_amount numeric, p_mode text default 'add')
returns void
language plpgsql
as $$
begin
  if p_mode = 'set' then
    if p_amount <= 0 then
      delete from logs where participant_id = p_pid and day_date = p_day;
    else
      insert into logs (participant_id, day_date, amount)
      values (p_pid, p_day, p_amount)
      on conflict (participant_id, day_date)
      do update set amount = excluded.amount, updated_at = now();
    end if;
  else
    insert into logs (participant_id, day_date, amount)
    values (p_pid, p_day, greatest(p_amount, 0))
    on conflict (participant_id, day_date)
    do update set amount = greatest(logs.amount + excluded.amount, 0), updated_at = now();
    delete from logs where participant_id = p_pid and day_date = p_day and amount <= 0;
  end if;
end;
$$;

-- ---------- feedback survey ----------
create table if not exists feedback (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete set null,
  name           text not null,
  keep_using     int  check (keep_using between 1 and 5),
  disappointment text check (disappointment in ('very', 'somewhat', 'not')),
  ease           int  check (ease between 1 and 5),
  confusing      text,
  broken         text,
  favorite       text,
  next_thing     text,
  other          text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_feedback_user on feedback(user_id);
alter table feedback enable row level security;

-- ---------- v3: sharing toggle, message board, reactions, reminders ----------
alter table challenges add column if not exists sharing_enabled boolean not null default true;
alter table users add column if not exists reminders_opt_out boolean not null default false;

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_challenge on messages(challenge_id, created_at);

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  to_user uuid not null references users(id) on delete cascade,
  from_user uuid not null references users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (challenge_id, to_user, from_user, emoji)
);
create index if not exists idx_reactions_challenge_to on reactions(challenge_id, to_user);

create table if not exists reminder_log (
  participant_id uuid not null references participants(id) on delete cascade,
  day_date date not null,
  sent_at timestamptz not null default now(),
  primary key (participant_id, day_date)
);

alter table messages enable row level security;
alter table reactions enable row level security;
alter table reminder_log enable row level security;

create or replace function toggle_reaction(p_challenge uuid, p_to uuid, p_from uuid, p_emoji text)
returns boolean language plpgsql as $$
declare v_existing uuid;
begin
  select id into v_existing from reactions
  where challenge_id = p_challenge and to_user = p_to and from_user = p_from and emoji = p_emoji;
  if v_existing is not null then
    delete from reactions where id = v_existing;
    return false;
  else
    insert into reactions (challenge_id, to_user, from_user, emoji)
    values (p_challenge, p_to, p_from, p_emoji);
    return true;
  end if;
end; $$;
alter table users add column if not exists avatar_style text not null default 'classic';

-- ---------- v4 ----------
alter table challenges add column if not exists group_chat_url text;
create index if not exists idx_reactions_recent on reactions(challenge_id, created_at);

create or replace function toggle_reaction(p_challenge uuid, p_to uuid, p_from uuid, p_emoji text)
returns boolean language plpgsql as $$
declare v_id uuid; v_created timestamptz; v_cutoff timestamptz := now() - interval '24 hours';
begin
  select id, created_at into v_id, v_created from reactions
  where challenge_id = p_challenge and to_user = p_to and from_user = p_from and emoji = p_emoji;
  if v_id is null then
    insert into reactions (challenge_id, to_user, from_user, emoji)
    values (p_challenge, p_to, p_from, p_emoji);
    return true;
  end if;
  if v_created <= v_cutoff then
    update reactions set created_at = now() where id = v_id;
    return true;
  end if;
  delete from reactions where id = v_id;
  return false;
end; $$;

-- ---------- v5: push notifications ----------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used timestamptz
);
create index if not exists idx_push_user on push_subscriptions(user_id);
alter table push_subscriptions enable row level security;

-- ---------- v6: email prefs, badges, items, loot boxes ----------
alter table users add column if not exists email_reminders boolean not null default false;
alter table users add column if not exists email_activity boolean not null default false;
alter table users add column if not exists email_unsubscribed boolean not null default false;
alter table users add column if not exists equipped jsonb not null default '{}'::jsonb;
alter table logs add column if not exists local_hour int;

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_key)
);
create index if not exists idx_user_badges_user on user_badges(user_id);

create table if not exists user_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  item_key text not null,
  obtained_at timestamptz not null default now(),
  unique (user_id, item_key)
);
create index if not exists idx_user_items_user on user_items(user_id);

create table if not exists loot_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source text not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  item_key text
);
create index if not exists idx_loot_user_unopened on loot_boxes(user_id) where opened_at is null;
create unique index if not exists idx_loot_unique_source on loot_boxes(user_id, source);

alter table user_badges enable row level security;
alter table user_items enable row level security;
alter table loot_boxes enable row level security;
