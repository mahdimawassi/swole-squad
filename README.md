# Swole Squad 🏋️

A 30-day group push-up challenge. Friends join with one link, log their reps every day, and watch their little avatar get progressively more swole. Day 30 is the in-person showdown: everyone bangs out the daily goal in one shot.

No accounts, no passwords. Each person gets a private link that remembers who they are.

**Stack:** Next.js (App Router) + Supabase (Postgres), deployed free on Vercel.

---

## How the "no login" thing works

- One shared **invite link** per challenge: `/join/THEHUNDO`
- A person enters a name + picks a color. The server creates them and hands back a random **private link**: `/me/<their-token>`
- That link *is* their identity. It gets bookmarked and saved in their browser, so the site remembers them on that device. On a new device they just open the same private link.
- All database access happens on the server with the Supabase **service role key**. The browser never touches the database directly, and the key is never exposed.

Trade-off worth knowing: anyone who has a person's private link is that person. For a friendly challenge that is fine. Do not use this pattern for anything sensitive.

---

## Deploy it (about 15 minutes)

### 1. Set up the database (Supabase)

1. Go to https://supabase.com, sign in, and create a new project. Pick any name and a strong database password (you will not need the password again for this app). Wait for it to finish provisioning.
2. In the left sidebar open **SQL Editor** → **New query**.
3. Open `supabase/schema.sql` from this project, copy the whole thing, paste it in, and press **Run**. This creates the tables and seeds a challenge called **The Hundo** with invite code `THEHUNDO`.
4. In the sidebar open **Project Settings** (gear icon) → **API**. Copy these two values, you will need them in step 3:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **service_role** secret key (under Project API keys). This is secret. Do not paste it anywhere public.

### 2. Put the code on GitHub

From this folder:

```bash
git init
git add .
git commit -m "Swole Squad"
```

Create a new empty repo on GitHub, then follow its "push an existing repository" lines, roughly:

```bash
git remote add origin https://github.com/YOUR-USERNAME/swole-squad.git
git branch -M main
git push -u origin main
```

### 3. Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub.
2. **Add New → Project**, and import your `swole-squad` repo. Vercel detects Next.js automatically, leave the build settings as-is.
3. Before deploying, open **Environment Variables** and add these two (names must match exactly):

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | your Project URL from step 1.4 |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key from step 1.4 |

4. Click **Deploy**. After a minute you get a live URL like `https://swole-squad.vercel.app`.

### 4. Go

- Visit `https://YOUR-URL/join/THEHUNDO` to create yourself.
- Share that same `/join/THEHUNDO` link with your friends. That is the only link anyone needs to get started.
- Everyone's private `/me/...` link is saved in their browser, so next time they can just open the site.

---

## Optional

**Custom domain:** In Vercel → your project → **Settings → Domains**, add a domain you own and follow the DNS instructions.

**Run it locally:**

```bash
cp .env.local.example .env.local   # then fill in the two values
npm install
npm run dev                        # http://localhost:3000
```

**Change the challenge** (goal, length, name, code): edit the seed row in `supabase/schema.sql` before running it, or update the `challenges` row later in the Supabase Table Editor. `daily_goal` × `duration_days` is the number of reps it takes to reach max swole, so the avatar scaling adapts automatically.

**Start more than one challenge:** insert another row in `challenges` with a different `invite_code`, then share `/join/THAT-CODE`.
