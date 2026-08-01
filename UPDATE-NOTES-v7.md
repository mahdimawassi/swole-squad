# Swole Squad v7 — fixes and the notification bell

Bundle this with v5 and v6; you haven't deployed any of them yet.

## Deploy

Run the SQL files in order in the Supabase SQL Editor (each is safe to re-run):

`features-v4.sql` → `features-v5.sql` → `features-v6.sql` → `features-v7.sql`

Then upload the code. Same environment variables as before, nothing new.

## Your feedback, addressed

**Items not showing across challenges — fixed.** A real bug. The data was being fetched correctly but never passed to the avatar anywhere except the collection page. Your gear now shows on your hub cards, your big challenge avatar, the glow-up strip, and on the squad leaderboard so everyone can see what you're wearing.

**15 boxes at once — fixed.** A box per badge is right for normal play, but catching up on months of history dumped the lot. Box grants are now capped at 3 per batch. Normal play unlocks one or two badges at a time so you'd never notice, but a backfill now gives 3 boxes instead of 15. You keep all the badges either way.

**Badges were hard to understand — rebuilt.** They're now grouped into five sections with a plain-English explanation of each (Volume, Consistency, Completion, Squad, Secret). Locked badges show a progress bar, and tapping any badge opens a panel with what it takes, how far along you are ("420 / 500, 80 to go"), and the date you earned it. There's a line at the top explaining that badges are lifetime rather than per challenge, which was the thing that wasn't obvious.

**Android detection — it already did, now it's useful.** The app detected Android before but only offered a one-line tip. Android and desktop now get proper step-by-step install instructions (⋮ menu → Add to Home screen), separate from the iPhone flow, and the notification settings give Android-specific help if the browser can't do push.

**Notification preferences — added.** Once phone notifications are on, you can choose separately whether to get the daily reminder and squad activity (reactions, badges, joins). Sits under Profile → Phone Notifications.

**The bell — added.** A bell in your hub header with an unread count, opening a full activity page. It shows reactions people left you, badges you unlocked, and people joining challenges you created. Opening the page marks everything read. These also arrive as phone notifications if you have those on and haven't muted squad activity.

**Lag — fixed, two ways.** The hub was making two database calls *per challenge*, so joining more challenges made it progressively slower: with five challenges that was 11 round trips. It now does 3 regardless of how many challenges you're in. Separately, there were no loading states, so a tap showed nothing until the server replied and felt broken. Every page now shows an instant skeleton.

## Message for your users

> Update 💪 Your hats, capes and shoes now show up everywhere, including the leaderboard so everyone can see them. Badges got a lot clearer: tap any of them to see exactly what it takes and how close you are. There's a new bell for reactions and badges, notification settings so you control what you get, and the app should feel noticeably faster moving between pages.
