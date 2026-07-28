# Swole Squad v3 — what changed and how to ship it

## Deploy steps (in this order)

1. **Run the SQL.** In Supabase → SQL Editor, run `supabase/features-v3.sql` once. (Safe to re-run. It adds the chat, reactions, sharing toggle, avatar styles, and reminder tables/columns.)
2. **Add two settings in Vercel** (Settings → Environment Variables), needed for the reminder emails to link back:
   - `APP_ORIGIN` = your live URL, e.g. `https://swole-squad.vercel.app`
   - `CRON_SECRET` = any random string (optional but recommended; locks the reminder job)
3. **Upload the new code** to GitHub and let Vercel redeploy. The `vercel.json` file turns on the daily reminder automatically.

No files need deleting this time.

## The bugs, fixed

- **Double-click / slow navigation.** Removed the refresh-after-navigate that was fighting itself, and added prefetching so pages load instantly.
- **"Completed but still says to complete."** Rebuilt the completion logic. A daily challenge is "done today" when you hit the day's target; a total challenge is done when you reach the overall goal (and shows a 🏆 GOAL MET badge). Tested across both types.
- **Too many emails.** Opening a challenge link you're already in now sends nothing. Emails go out only on real events: first-time signup, a genuinely new join, or an explicit "email me my link."

## The new stuff

- **Group chat** per challenge — a third tab. Messages post on send and everyone in the challenge sees them.
- **Reactions** on the Squad tab. Tap the ＋ under anyone to leave 👏 🔥 💪 😂 👀. Counts show, tapping again removes yours, many people can react.
- **Midday reminder email** at noon Eastern to anyone in an active daily challenge who hasn't logged yet. Once per person per day, only if they have an email and haven't opted out. Total-goal challenges are excluded. People can switch reminders off in their profile.
- **Per-challenge admin page** (gear icon, creator only): rename, edit goal or end date, a sharing on/off toggle that locks new joins while keeping current members, the invite code, a member list with join dates, and delete.
- **Choosable avatars.** Five characters (Classic, Bear, Robot, Yeti, Buff Cat), each still bulking up as you log, each color-customizable. Chosen in your profile. Everyone currently on Classic, so nothing changes unless they pick.
- **Renamed the top tier** from SWOLE GOD to **MAXED OUT**.

## Message to send your users

> Swole Squad just got an update 💪 Each challenge now has a group chat, you can react to your squad-mates on the leaderboard, and you can pick a different avatar in your profile (bear, robot, yeti, buff cat…). You'll also get a friendly midday nudge if you forget to log — turn it off in your profile if you'd rather not. Plus a pile of bug fixes. Same link as always.
