-- ============================================================
--  Fixing duplicate profiles
--
--  A bug in the first v2 build meant that creating a challenge made a NEW
--  profile instead of reusing yours, so one person could end up split across
--  several rows in "users". The app is fixed, but the rows it already made are
--  still there. This file cleans them up.
--
--  Run STEP 1 to see the damage, then STEP 2 once per duplicate.
-- ============================================================

-- ---------- STEP 1: who is duplicated? ----------
-- Same person, several rows. Look for a repeated name (or email).
-- "challenges" tells you which row holds the history worth keeping.
select
  u.id,
  u.name,
  u.email,
  u.secret_token,
  u.created_at,
  count(p.id) filter (where p.removed_at is null) as challenges,
  coalesce(sum(l.amount), 0) as total_logged
from users u
left join participants p on p.user_id = u.id
left join logs l on l.participant_id = p.id
group by u.id, u.name, u.email, u.secret_token, u.created_at
order by u.name, u.created_at;

-- ---------- STEP 2: the merge helper ----------
create or replace function merge_users(p_keep uuid, p_drop uuid)
returns void
language plpgsql
as $$
declare
  r        record;
  v_email  text;
  v_keeper uuid;
begin
  if p_keep = p_drop then
    raise exception 'Those are the same profile.';
  end if;
  if not exists (select 1 from users where id = p_keep) then
    raise exception 'Keeper profile % does not exist.', p_keep;
  end if;
  if not exists (select 1 from users where id = p_drop) then
    raise exception 'Profile to drop % does not exist.', p_drop;
  end if;

  -- Challenges the duplicate created now belong to the keeper (admin rights move too).
  update challenges set created_by = p_keep where created_by = p_drop;

  for r in select * from participants where user_id = p_drop loop
    select id into v_keeper
    from participants
    where user_id = p_keep and challenge_id = r.challenge_id;

    if v_keeper is not null then
      -- Both profiles are in this challenge. Fold the duplicate's daily
      -- entries into the keeper's, adding them where the same day exists.
      insert into logs (participant_id, day_date, amount)
      select v_keeper, l.day_date, l.amount
      from logs l
      where l.participant_id = r.id
      on conflict (participant_id, day_date)
      do update set amount = logs.amount + excluded.amount, updated_at = now();

      -- Keep the membership if either side was active.
      if r.removed_at is null then
        update participants set removed_at = null where id = v_keeper;
      end if;

      delete from participants where id = r.id; -- its logs cascade away
    else
      update participants set user_id = p_keep where id = r.id;
    end if;
  end loop;

  -- Rescue the email before the row goes, so the keeper can still be found by it.
  select email into v_email from users where id = p_drop;
  delete from users where id = p_drop;
  if v_email is not null then
    update users set email = coalesce(email, v_email) where id = p_keep;
  end if;
end;
$$;

-- ---------- STEP 3: run it ----------
-- Keep the profile with the real history. Drop the empty duplicate.
-- Use the id values from STEP 1.
--
--   select merge_users(
--     'PASTE-THE-ID-TO-KEEP',
--     'PASTE-THE-ID-TO-DELETE'
--   );
--
-- Repeat for each extra profile, then run STEP 1 again to confirm one row per person.
--
-- IMPORTANT: the keeper's /me/<secret_token> link is the one that keeps working.
-- If your phone has the wrong one saved, open the keeper's link once and it will
-- overwrite what your browser remembers. Or use "Start over" on the error screen.
