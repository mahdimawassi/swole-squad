-- ============================================================
--  Swole Squad feedback survey
--  Run this ONCE in the Supabase SQL Editor on your existing project.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists feedback (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete set null, -- linked when they open it from their own device
  name           text not null,                                 -- always captured, so you know who said what
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

-- Same lockdown as everything else: server-only via the service role key.
alter table feedback enable row level security;

-- ------------------------------------------------------------
--  Reading the results later, newest first:
--
--    select f.created_at, f.name, u.email,
--           f.keep_using, f.disappointment, f.ease, f.favorite,
--           f.confusing, f.broken, f.next_thing, f.other
--    from feedback f
--    left join users u on u.id = f.user_id
--    order by f.created_at desc;
-- ------------------------------------------------------------
