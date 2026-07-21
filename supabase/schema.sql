-- ============================================================
--  Swole Squad - Supabase schema
--  Run this ONCE in the Supabase SQL Editor (paste everything, press Run).
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------- tables ----------
create table if not exists challenges (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  daily_goal    int  not null default 100,
  duration_days int  not null default 30,
  start_date    date not null default current_date,
  invite_code   text not null unique,
  created_at    timestamptz not null default now()
);

create table if not exists participants (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges(id) on delete cascade,
  name          text not null,
  avatar_color  text not null,
  secret_token  uuid not null unique default gen_random_uuid(),
  created_at    timestamptz not null default now()
);

create table if not exists logs (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  day_date       date not null,
  reps           int  not null check (reps >= 0),
  unique (participant_id, day_date)
);

create index if not exists idx_participants_challenge on participants(challenge_id);
create index if not exists idx_logs_participant on logs(participant_id);

-- ---------- security ----------
-- The app talks to the database ONLY from the Next.js server, using the
-- SERVICE ROLE key, which bypasses row level security. Turning RLS on with
-- no policies locks these tables to everyone else (like the public anon key),
-- which is exactly what we want.
alter table challenges   enable row level security;
alter table participants enable row level security;
alter table logs         enable row level security;

-- ---------- atomic "add reps for today" ----------
-- Insert a row for (participant, day), or add to it if it already exists.
-- Doing this in one statement avoids any double-tap race condition.
create or replace function add_reps(p_pid uuid, p_day date, p_reps int)
returns void
language plpgsql
as $$
begin
  insert into logs (participant_id, day_date, reps)
  values (p_pid, p_day, p_reps)
  on conflict (participant_id, day_date)
  do update set reps = logs.reps + excluded.reps;
end;
$$;

-- ---------- your first challenge ----------
insert into challenges (name, daily_goal, duration_days, start_date, invite_code)
values ('The Hundo', 100, 30, current_date, 'THEHUNDO')
on conflict (invite_code) do nothing;

-- ============================================================
--  OPTIONAL demo squad, so the leaderboard is not empty while
--  you test. Delete these people before you launch for real:
--    delete from participants where name in ('Big Mike','Yoga Steph','Curl Karen');
--  To load them, remove the /* and */ lines below and Run again.
-- ============================================================
/*
do $$
declare c uuid; p1 uuid; p2 uuid; p3 uuid;
begin
  select id into c from challenges where invite_code = 'THEHUNDO';
  insert into participants (challenge_id, name, avatar_color) values (c, 'Big Mike',   '#FF8A3D') returning id into p1;
  insert into participants (challenge_id, name, avatar_color) values (c, 'Yoga Steph', '#9B6DFF') returning id into p2;
  insert into participants (challenge_id, name, avatar_color) values (c, 'Curl Karen', '#22C3D6') returning id into p3;
  insert into logs (participant_id, day_date, reps) values
    (p1, current_date, 110), (p1, current_date - 1, 130), (p1, current_date - 2, 140),
    (p2, current_date, 100), (p2, current_date - 1, 100),
    (p3, current_date - 1, 90);
end $$;
*/
