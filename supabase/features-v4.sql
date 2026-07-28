-- ============================================================
--  Swole Squad v4
--  Run this ONCE in the Supabase SQL Editor. Safe to re-run.
--
--  - group chat link on a challenge (any platform)
--  - reactions now expire after 24h
--  - the in-app chat is retired
-- ============================================================

-- ---------- external group chat ----------
-- Any invite URL: WhatsApp, Telegram, Instagram, Discord, Signal, Messenger...
-- We only store the URL; the app works out which platform it is.
alter table challenges add column if not exists group_chat_url text;

-- ---------- reactions expire ----------
create index if not exists idx_reactions_recent on reactions(challenge_id, created_at);

-- Re-tapping an emoji removes it. Tapping an emoji whose previous reaction has
-- already expired starts a fresh one, instead of hitting the unique constraint.
create or replace function toggle_reaction(
  p_challenge uuid, p_to uuid, p_from uuid, p_emoji text
) returns boolean
language plpgsql
as $$
declare
  v_id      uuid;
  v_created timestamptz;
  v_cutoff  timestamptz := now() - interval '24 hours';
begin
  select id, created_at into v_id, v_created
  from reactions
  where challenge_id = p_challenge and to_user = p_to and from_user = p_from and emoji = p_emoji;

  if v_id is null then
    insert into reactions (challenge_id, to_user, from_user, emoji)
    values (p_challenge, p_to, p_from, p_emoji);
    return true;
  end if;

  if v_created <= v_cutoff then
    -- Expired, so this tap is a brand new reaction rather than an undo.
    update reactions set created_at = now() where id = v_id;
    return true;
  end if;

  delete from reactions where id = v_id;
  return false;
end;
$$;

-- Housekeeping: expired reactions are already hidden by the app, this just keeps
-- the table tidy. Safe to run any time.
delete from reactions where created_at <= now() - interval '48 hours';

-- ---------- retire the in-app chat ----------
-- The message board is replaced by linking out to the squad's real group chat.
-- The table is left in place so nothing is lost. Once you are happy, you can run:
--   drop table if exists messages;
