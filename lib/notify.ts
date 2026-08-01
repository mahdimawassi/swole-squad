import { getAdmin } from './supabaseAdmin';
import { sendPushToUser } from './push';

export type NotifyType = 'reaction' | 'badge' | 'join' | 'ended' | 'box';

// Writes a row for the in-app bell, and pushes to their phone if they have
// notifications on and have not muted this kind.
export async function notify(opts: {
  userId: string;
  type: NotifyType;
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  push?: boolean;
}): Promise<void> {
  const { userId, type, title, body, url, icon, push = true } = opts;
  const supabase = getAdmin();

  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      url: url ?? null,
      icon: icon ?? null,
    });
  } catch {
    // The bell is a nicety; never let it break the action that triggered it.
  }

  if (!push) return;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('push_social')
      .eq('id', userId)
      .maybeSingle();

    // Reactions, badges and joins are all "social" pings.
    if (user && user.push_social === false) return;

    await sendPushToUser(userId, {
      title,
      body: body ?? '',
      url: url ?? '/',
      tag: `${type}-${Date.now()}`,
    });
  } catch {
    // ignore
  }
}

export async function unreadCount(userId: string): Promise<number> {
  const supabase = getAdmin();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count ?? 0;
}

export async function listNotifications(userId: string, limit = 40) {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, url, icon, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as {
    id: string;
    type: string;
    title: string;
    body: string | null;
    url: string | null;
    icon: string | null;
    read_at: string | null;
    created_at: string;
  }[];
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = getAdmin();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

// Anything already read and older than a week clears itself out, so the list
// never becomes a wall of stale items nobody wants to tidy by hand.
export async function pruneOld(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  try {
    const supabase = getAdmin();
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .not('read_at', 'is', null)
      .lt('created_at', cutoff);
  } catch {
    // housekeeping only
  }
}
