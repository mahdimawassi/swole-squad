# Swole Squad 🏋️ v2

Group challenges for push-ups, pull-ups, running, whatever you want. Everyone logs their number each day and watches their little avatar go from twig to absolute unit. No accounts, no passwords, one link per person.

**Stack:** Next.js (App Router) + Supabase (Postgres) + Resend for email. Runs free on Vercel.

---

## What changed from v1

- **You are a user, not a participant.** One link now gets you into every challenge you're in.
- **Create or join** from the homepage. Anyone can start a challenge.
- **Any activity**: push-ups, pull-ups, squats, sit-ups, running, cycling, steps, or a custom one.
- **Two goal shapes**: "100 push-ups *every day*" or "100 km *total* by the end". Running challenges usually want the second one.
- **Pick duration or an end date**, and schedule a future start.
- **Join by code or link.** Codes skip lookalike characters, and the code box accepts a pasted URL.
- **Email delivery** of your access link, so losing it is no longer a support call.
- **The creator is the admin** and can remove people. Removal is soft: their history stays.
- **Backfill and undo**: log for a previous day, fix a wrong number, or clear a day.
- **Pace nudges**: the app tells you if you're behind and exactly what per-day number gets you back.

---

## Upgrading an existing v1 site

Your friends have links bookmarked. This migration keeps every one of them working.

1. Supabase → **SQL Editor** → **New query**.
2. Paste all of `supabase/migrate-v1-to-v2.sql` and press **Run**.
3. Deploy the new code (push to GitHub, Vercel redeploys itself).

The migration creates a user for every existing participant **reusing their exact token**, moves reps to a decimal column so kilometres work, sets the first person who joined as the challenge admin, and backfills the new challenge fields. It is safe to run twice.

Once you've confirmed everything works, you can optionally run the cleanup lines at the bottom of the migration file to drop the now-unused v1 columns.

> Starting fresh instead? Use `supabase/schema.sql` and ignore the migration.

---

## If you already deployed the first v2 build

That build had a bug: creating a challenge made a **new profile** instead of reusing yours, so one person could end up split across several rows in `users`. The symptom was landing on a hub that showed only the challenge you just made, with your other ones missing.

The app is fixed. To repair the rows it already created:

1. Supabase → **SQL Editor**, paste `supabase/merge-users.sql` and run **STEP 1**. It lists every profile with how many challenges and how much history each holds.
2. Spot the duplicates (same name, one row with your real history, the others nearly empty).
3. Run **STEP 2** once to install the `merge_users` helper.
4. For each duplicate, run `select merge_users('id-to-keep', 'id-to-delete');`

The merge moves challenges, memberships, and daily entries onto the profile you keep, adds the amounts together where both profiles logged the same day, transfers admin rights, and keeps whichever email exists. Nothing is lost.

Afterwards, open the surviving profile's `/me/<token>` link once on each of your devices so the browser saves the right one. If a device is stuck on a dead link, the error screen has a **Start over** button.

---

## Environment variables

In Vercel → your project → **Settings → Environment Variables**:

| Name | Required | Where it comes from |
|------|----------|---------------------|
| `SUPABASE_URL` | yes | Supabase → Project Settings → API → Project URL (base URL, no `/rest/v1`) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | same page, the `service_role` secret key |
| `RESEND_API_KEY` | no | resend.com → API Keys |
| `EMAIL_FROM` | no | an address on your verified domain, e.g. `Swole Squad <hey@yourdomain.com>` |

**Email is optional.** Leave the last two blank and everything still works, the app just skips sending and shows the link on screen instead. Add them whenever you're ready.

### Setting up email

1. Sign up at resend.com. The free tier is 3,000 emails a month, 100 a day, which is far more than you need.
2. Add and verify a domain you own (Resend walks you through the DNS records). You need your own domain to send from a real address.
3. Create an API key, put it in `RESEND_API_KEY`, and set `EMAIL_FROM` to an address on that domain.

---

## Running it locally

```bash
cp .env.local.example .env.local   # fill in your values
npm install
npm run dev                        # http://localhost:3000
```

---

## Admin, without building an admin panel

Your Supabase dashboard is the admin panel. Table Editor for point-and-click, SQL Editor for bulk work.

- **Someone lost their link**: find them in `users`, copy `secret_token`, send them `your-url/me/<token>`. Or just tell them to use "Lost your link?" on the homepage.
- **Remove someone**: the challenge creator can do this in the app. In the database it sets `participants.removed_at`.
- **Un-remove someone**: set `removed_at` back to null, or have them rejoin with the code.
- **Reset one person**: delete their rows in `logs`.
- **Reset a whole challenge**: `delete from logs where participant_id in (select id from participants where challenge_id = '<id>');`
- **Change a challenge**: edit its row in `challenges`. Avatar scaling recalculates from the goal automatically.
- **See everything**:

```sql
select c.name as challenge, u.name, coalesce(sum(l.amount), 0) as total, count(l.*) as days_logged
from participants p
join users u on u.id = p.user_id
join challenges c on c.id = p.challenge_id
left join logs l on l.participant_id = p.id
where p.removed_at is null
group by c.name, u.name
order by c.name, total desc;
```

There is no undo on direct database edits. You can export any table to CSV from the Table Editor first if you want a backup.

---

## The security model, stated plainly

Anyone holding a person's `/me/<token>` link *is* that person. That's the trade for having no passwords, and it's fine for a challenge among friends. Two things follow from it: don't reuse this pattern for anything sensitive, and keep your Supabase login locked down, because as admin you can see everyone's token and email.

Emails are stored so links can be re-sent. If someone wants theirs gone, delete it from their `users` row.
