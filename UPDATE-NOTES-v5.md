# Swole Squad v5 — phone notifications, no app store

Push notifications now work on iPhone and Android straight from the web, and the app can be added to the Home Screen with a proper icon.

## Deploy

1. **Run the SQL.** `supabase/features-v5.sql` in the Supabase SQL Editor (once, safe to re-run).
2. **Generate your notification keys.** In a terminal:
   ```
   npx web-push generate-vapid-keys
   ```
   It prints a public and a private key. Keep the private one secret.
3. **Add three environment variables in Vercel** (Settings → Environment Variables):

   | Name | Value |
   |------|-------|
   | `VAPID_PUBLIC_KEY` | the public key from step 2 |
   | `VAPID_PRIVATE_KEY` | the private key from step 2 |
   | `VAPID_SUBJECT` | `mailto:your@email.com` |

   Make sure `APP_ORIGIN` is also set (your live URL) so notifications link back correctly.
4. **Upload the code** and let Vercel redeploy.

Don't regenerate the keys later. If they change, every existing subscription stops working and everyone has to turn reminders on again.

## What people will see

The nudge appears on their hub once they're in at least one challenge, and can be dismissed for a week. There's also a permanent control in their profile.

- **On Android and desktop**, one tap turns notifications on.
- **On iPhone**, they're walked through adding it to the Home Screen first, because Apple only allows web notifications for apps launched from the Home Screen icon, not from a Safari tab.

Reminders now prefer a phone notification and only fall back to email for people who haven't enabled them, so inbox volume drops too.

## Best practice notes (why it's built this way)

- **Install first, permission second.** On iPhone, asking for notification permission in a Safari tab silently fails. The flow never asks until the app is on the Home Screen.
- **Earn the ask.** The prompt only shows to people already in a challenge, not to first-time visitors.
- **One dismissal lasts a week**, so it never feels like nagging.
- **Per device.** Someone who wants notifications on both phone and laptop turns them on in each. That's how web push works everywhere.
- **Dead subscriptions clean themselves up.** If someone uninstalls or revokes permission, the server drops their record on the next send.
- **Safari only on iPhone** for the install step. Chrome on iOS can't do it, because all iOS browsers are required to use Apple's engine.

## Message for your users

> Swole Squad can now send you a reminder on your phone 📲
>
> **iPhone:** open the site in Safari, tap Share ⬆️, then "Add to Home Screen". Open it from the new icon and tap the bell.
>
> **Android:** just tap "Yes, remind me" when it pops up. You can also use your browser menu → "Install app" to get an icon.
>
> It's one nudge around midday, only if you haven't logged yet, and you can turn it off any time in your profile.
