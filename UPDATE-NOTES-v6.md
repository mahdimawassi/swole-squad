# Swole Squad v5 + v6 — notifications, email control, badges, items

You skipped v5, so this covers both. Deploy them together.

## Deploy (in this order)

1. **Run three SQL files** in the Supabase SQL Editor, in order. Each is safe to re-run.
   - `supabase/features-v4.sql` (if you haven't already)
   - `supabase/features-v5.sql` — push notifications
   - `supabase/features-v6.sql` — email prefs, badges, items, boxes

2. **Generate notification keys** in a terminal:
   ```
   npx web-push generate-vapid-keys
   ```

3. **Add environment variables in Vercel:**

   | Name | Value |
   |------|-------|
   | `VAPID_PUBLIC_KEY` | public key from step 2 |
   | `VAPID_PRIVATE_KEY` | private key from step 2 |
   | `VAPID_SUBJECT` | `mailto:your@email.com` |
   | `APP_ORIGIN` | your live URL |
   | `CRON_SECRET` | any random string |

   Never regenerate the VAPID keys later, or everyone's notifications silently stop.

4. **Upload the code** and let Vercel redeploy.

5. **Award badges retroactively (optional).** Open this address in your browser once, using your own site and the same random string you used for `CRON_SECRET`:
   ```
   https://swole-squad.vercel.app/api/backfill?secret=YOUR_CRON_SECRET
   ```
   You'll see a short line of text confirming how many badges were handed out. Safe to open more than once.

   You can skip this entirely if you like. Badges award themselves the first time each person opens their collection or logs anything, so nobody misses out either way. Running it just means everyone's badges are already waiting before they look.

## Email is now opt-in

Reminders are **off by default for everyone, including existing users**. Nobody gets a reminder email unless they switch it on. There's a preferences page at Profile → Email Preferences with separate switches for daily reminders and challenge updates, plus an unsubscribe-from-everything button. Emails now carry a proper `List-Unsubscribe` header, so mail apps show their own opt-out control.

Your access link is the one email that can't be switched off, since it's how someone gets back in.

Phone notifications are the better path anyway: if someone has those on, they never get the reminder email at all.

## Badges

37 lifetime badges across five families: volume, consistency, completion, social, and hidden. They're **lifetime and cross-challenge**, which is deliberate — carrying your totals and streaks between challenges is what makes starting a second one feel like continuing rather than starting over.

Volume badges are per unit, so 100 reps and 100 km are separate ladders. Five badges are **hidden** and don't appear until unlocked.

## Items and boxes

24 collectible items across six slots (head, face, held, feet, back, aura) in four rarities. They render on your avatar and on the squad leaderboard.

**Boxes come from achievement, never from opening the app.** Every badge earns one, plus a welcome box. There's no daily-login lever, which is the difference between a reward and a slot machine. Rolls are weighted (60/25/12/3) and never give a duplicate. Nothing is buyable.

Opening has a proper animation: the box shakes, bursts, and reveals with rays for rare-and-up and confetti for legendaries.

## Also new

- **End-of-challenge recap** with the podium, plus **Run it back**, which clones the challenge with the same crew and settings starting today. This is the direct answer to challenges ending and groups drifting apart.
- **All-time stats** with progress bars toward your next volume badge.

## Message for your users

> Big update 💪
>
> **Badges** — you've been awarded them for everything you've already done, so go look. 37 to collect, and a few are secret.
>
> **Loot boxes** — every badge earns one. Inside are hats, capes, shades, golden shoes and more for your avatar. 24 to collect, none of it buyable.
>
> **Phone reminders** — optional now, and way better than email. iPhone: open in Safari, Share ⬆️, Add to Home Screen, then tap the bell. Android: just tap yes when asked.
>
> **Email** — now off by default. You choose exactly what we send in Profile → Email Preferences.
>
> **Run it back** — when a challenge ends, one tap restarts it with the same crew.
