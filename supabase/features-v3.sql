-- ============================================================
--  Swole Squad v3 features
--  Run this ONCE in the Supabase SQL Editor on your existing project.
--  Safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- challenge: can members share the invite? ----------
alter table challenges add column if not exists sharing_enabled boolean not null default true;

-- ---------- per-challenge message board ----------
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_messages_challenge on messages(challenge_id, created_at);

-- ---------- reactions on a person within a challenge ----------
-- from_user reacts to to_user in a challenge with an emoji. One of each emoji per
-- pair (the unique index), so tapping the same emoji twice toggles it off.
create table if not exists reactions (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  to_user      uuid not null references users(id) on delete cascade,
  from_user    uuid not null references users(id) on delete cascade,
  emoji        text not null,
  created_at   timestamptz not null default now(),
  unique (challenge_id, to_user, from_user, emoji)
);
create index if not exists idx_reactions_challenge_to on reactions(challenge_id, to_user);

alter table messages  enable row level security;
alter table reactions enable row level security;

-- ---------- toggle a reaction atomically ----------
-- Adds the reaction, or removes it if this person already left that exact emoji
-- on that person. Returns true if it is now ON, false if it was just turned OFF.
create or replace function toggle_reaction(
  p_challenge uuid, p_to uuid, p_from uuid, p_emoji text
) returns boolean
language plpgsql
as $$
declare v_existing uuid;
begin
  select id into v_existing
  from reactions
  where challenge_id = p_challenge and to_user = p_to and from_user = p_from and emoji = p_emoji;

  if v_existing is not null then
    delete from reactions where id = v_existing;
    return false;
  else
    insert into reactions (challenge_id, to_user, from_user, emoji)
    values (p_challenge, p_to, p_from, p_emoji);
    return true;
  end if;
end;
$$;

-- ---------- reminder bookkeeping ----------
-- Records that we emailed a person about a challenge on a given day, so the
-- scheduled job never double-sends even if it runs more than once.
create table if not exists reminder_log (
  participant_id uuid not null references participants(id) on delete cascade,
  day_date       date not null,
  sent_at        timestamptz not null default now(),
  primary key (participant_id, day_date)
);

-- Per-user opt out. Reminders are on by default; this lets someone silence them.
alter table users add column if not exists reminders_opt_out boolean not null default false;

-- fold new tables into RLS lockdown
alter table reminder_log enable row level security;

-- ---------- avatar style ----------
-- Which character a person uses. "classic" keeps existing users unchanged.
alter table users add column if not exists avatar_style text not null default 'classic';
