import webpush from 'web-push';
import { getAdmin } from './supabaseAdmin';

let configured = false;

export function pushEnabled(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

function configure(): boolean {
  if (configured) return true;
  if (!pushEnabled()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

// Sends to every device this person has enabled. Returns how many landed.
// Dead subscriptions (404/410) are cleaned up as we go, which is how the
// standard says to handle a browser that has revoked or expired an endpoint.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;

  const supabase = getAdmin();
  const { data } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  const subs = (data ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[];
  if (subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  let delivered = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        delivered += 1;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) dead.push(s.id);
      }
    }),
  );

  if (dead.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', dead);
  }

  return delivered;
}

export async function hasPushSubscription(userId: string): Promise<boolean> {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  return (data ?? []).length > 0;
}
