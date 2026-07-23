-- ============================================================
--  Swole Squad: MIGRATE v1 -> v2
--
--  Run this ONCE in the Supabase SQL Editor on your EXISTING project.
--  It is safe to re-run (every step is guarded).
--
--  What it does:
--    - creates the new "users" table
--    - gives every existing participant a user, REUSING THEIR EXISTING TOKEN
--      so every bookmarked /me/<token> link keeps working
--    - upgrades challenges with activity / goal mode / end date
--    - renames logs.reps -> logs.amount and allows decimals (for km)
--    - makes the first person who joined each challenge its creator/admin
--
--  Nobody loses their link, their reps, or their streak.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 1. users table ----------
create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique,
  name         text not null,
  avatar_color text not null,
  secret_token uuid not null unique default gen_random_uuid(),
  created_at   timestamptz not null default now()
);

-- ---------- 2. new columns on challenges ----------
alter table challenges add column if not exists activity    text not null default 'Push-ups';
alter table challenges add column if not exists unit_label  text not null default 'reps';
alter table challenges add column if not exists goal_mode   text not null default 'daily';
alter table challenges add column if not exists goal_amount numeric(10,2);
alter table challenges add column if not exists end_date    date;
alter table challenges add column if not exists created_by  uuid;

-- backfill from the old daily_goal column
update challenges set goal_amount = daily_goal where goal_amount is null;
update challenges set end_date = start_date + (duration_days - 1) where end_date is null;

-- ---------- 3. new columns on participants ----------
alter table participants add column if not exists user_id    uuid;
alter table participants add column if not exists removed_at timestamptz;
alter table participants add column if not exists joined_at  timestamptz not null default now();

-- ---------- 4. THE IMPORTANT BIT ----------
-- One user per existing participant, carrying over the SAME secret_token
-- so existing bookmarks resolve to the same person.
insert into users (name, avatar_color, secret_token, created_at)
select p.name, p.avatar_color, p.secret_token, coalesce(p.created_at, now())
from participants p
where p.user_id is null
  and not exists (select 1 from users u where u.secret_token = p.secret_token);

update participants p
set user_id = u.id
from users u
where p.user_id is null and u.secret_token = p.secret_token;

-- ---------- 5. logs: reps -> amount, int -> numeric ----------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'logs' and column_name = 'reps'
  ) then
    alter table logs rename column reps to amount;
  end if;
end $$;

alter table logs alter column amount type numeric(10,2);
alter table logs add column if not exists updated_at timestamptz not null default now();

-- ---------- 6. creator = first person who joined ----------
update challenges c
set created_by = sub.user_id
from (
  select distinct on (p.challenge_id) p.challenge_id, p.user_id
  from participants p
  where p.user_id is not null
  order by p.challenge_id, p.joined_at asc, p.created_at asc
) sub
where c.id = sub.challenge_id and c.created_by is null;

-- ---------- 7. lock the new shape in ----------
alter table participants alter column user_id set not null;
alter table challenges   alter column goal_amount set not null;
alter table challenges   alter column end_date set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'participants_challenge_id_user_id_key') then
    alter table participants add constraint participants_challenge_id_user_id_key unique (challenge_id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'participants_user_id_fkey') then
    alter table participants add constraint participants_user_id_fkey
      foreign key (user_id) references users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'challenges_created_by_fkey') then
    alter table challenges add constraint challenges_created_by_fkey
      foreign key (created_by) references users(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'challenges_goal_mode_check') then
    alter table challenges add constraint challenges_goal_mode_check check (goal_mode in ('daily', 'total'));
  end if;
end $$;

create index if not exists idx_participants_user on participants(user_id);

-- CRITICAL: the old v1 columns (name / avatar_color) are NOT NULL. That data now
-- lives on "users", and v2 inserts participants with only challenge_id + user_id,
-- so those constraints would block every new join. Relax them. The old values are
-- left in place as a safety net until you run the cleanup in step 9.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'participants' and column_name = 'name') then
    alter table participants alter column name drop not null;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name = 'participants' and column_name = 'avatar_color') then
    alter table participants alter column avatar_color drop not null;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name = 'participants' and column_name = 'secret_token') then
    alter table participants alter column secret_token drop not null;
  end if;
end $$;

alter table users enable row level security;

-- ---------- 8. replace the logging function ----------
drop function if exists add_reps(uuid, date, int);

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

-- ---------- 9. optional cleanup ----------
-- participants.name / avatar_color / secret_token now live on users instead.
-- The old columns are harmless, but once you have confirmed everything works
-- you can drop them:
--   alter table participants drop column if exists name;
--   alter table participants drop column if exists avatar_color;
--   alter table participants drop column if exists secret_token;

-- ---------- sanity check ----------
-- Run this after the migration. Every row should show a matching user.
--   select p.id, u.name, u.secret_token from participants p join users u on u.id = p.user_id;
