# Swole Squad v4 — group chat, sharing, and better reactions

## Deploy

1. Run `supabase/features-v4.sql` in the Supabase SQL Editor (once, safe to re-run).
2. Upload the code to GitHub. Vercel redeploys itself.

Nothing to delete, and existing links keep working.

## What changed

### The in-app chat is gone
Replaced by linking out to the group the squad already uses. Rebuilding chat was competing with tools everyone already has open.

- **Group chat link** on each challenge. The creator pastes any invite link (WhatsApp, Telegram, Instagram, Discord, Signal, Messenger, Slack, or anything else) and everyone in the challenge gets a "Join the group chat" button with the right icon. It can be added when creating the challenge or later from the admin page, and it's entirely optional.
- **Post to the group.** Four buttons on the Squad tab that write the message for you, then hand it to your phone's own share sheet so you pick where it goes:
  - 🏆 Standings — the current leaderboard
  - 💪 My progress — your total, rank and streak
  - 👀 Nudge — names whoever hasn't logged today
  - ➕ Invite — the invite message
  On desktop it copies to the clipboard instead.
- **Rich link previews.** Pasting an invite link into any chat app now renders a proper card with the challenge name, the goal, and how many people are already in, instead of a bare URL.

### Reactions, rebuilt
- **They expire after 24 hours**, so the board shows recent encouragement rather than a pile-up from week one.
- **You can see who reacted.** Tap any reaction to see the names and how long ago.
- **Instant.** Taps register immediately instead of waiting on the network.
- **Better feel.** Proper picker with animation, tactile press, cleaner pills.

## Message for your users

> Update 💪 The in-app chat is gone — instead, each challenge can now link straight to your real group chat (WhatsApp, Telegram, Instagram, whatever you use). There are also new one-tap buttons to post the standings, your progress, or a nudge for whoever hasn't logged, straight into the group. Reactions got a rework too: you can now see who reacted, and they fade after 24 hours so it stays fresh. Same link as always.
