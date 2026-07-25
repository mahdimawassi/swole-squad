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
