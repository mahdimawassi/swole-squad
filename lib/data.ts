import { getAdmin } from './supabaseAdmin';
import type { User, Challenge, Member, LogRow } from './types';

// Supabase returns numeric columns as strings in some drivers. Coerce once, here.
function normChallenge(c: Record<string, unknown>): Challenge {
  return {
    ...(c as unknown as Challenge),
    goal_amount: Number(c.goal_amount) || 0,
    duration_days: Number(c.duration_days) || 1,
  };
}

function normLogs(rows: Record<string, unknown>[]): LogRow[] {
  return rows.map((r) => ({
    id: String(r.id),
    participant_id: String(r.participant_id),
    day_date: String(r.day_date),
    amount: Number(r.amount) || 0,
  }));
}

export async function getUserByToken(token: string): Promise<User | null> {
  const supabase = getAdmin();
  const { data } = await supabase.from('users').select('*').eq('secret_token', token).maybeSingle();
  return (data as User) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return (data as User) ?? null;
}

export async function getChallengeByCode(code: string): Promise<Challenge | null> {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .ilike('invite_code', code)
    .maybeSingle();
  return data ? normChallenge(data) : null;
}

export async function getChallengeById(id: string): Promise<Challenge | null> {
  const supabase = getAdmin();
  const { data } = await supabase.from('challenges').select('*').eq('id', id).maybeSingle();
  return data ? normChallenge(data) : null;
}

// Active (not removed) members of a challenge, joined out to their user row.
export async function getMembers(challengeId: string): Promise<Member[]> {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('participants')
    .select('id, user_id, joined_at, users(name, avatar_color, avatar_style, equipped)')
    .eq('challenge_id', challengeId)
    .is('removed_at', null)
    .order('joined_at', { ascending: true });

  const rows = (data ?? []) as unknown as {
    id: string;
    user_id: string;
    joined_at: string;
    users:
      | { name: string; avatar_color: string; avatar_style: string; equipped: Record<string, string> }
      | { name: string; avatar_color: string; avatar_style: string; equipped: Record<string, string> }[]
      | null;
  }[];

  return rows.map((r) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      participant_id: r.id,
      user_id: r.user_id,
      name: u?.name ?? 'Someone',
      avatar_color: u?.avatar_color ?? '#4D7CFF',
      avatar_style: u?.avatar_style ?? 'classic',
      equipped: u?.equipped ?? {},
      joined_at: r.joined_at,
    };
  });
}

export async function getLogsFor(participantIds: string[]): Promise<LogRow[]> {
  if (participantIds.length === 0) return [];
  const supabase = getAdmin();
  const { data } = await supabase.from('logs').select('*').in('participant_id', participantIds);
  return normLogs((data ?? []) as Record<string, unknown>[]);
}

// Everything the hub needs: every challenge this user is active in.
export async function getMyChallenges(
  userId: string,
): Promise<{ challenge: Challenge; participant_id: string }[]> {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('participants')
    .select('id, joined_at, challenges(*)')
    .eq('user_id', userId)
    .is('removed_at', null)
    .order('joined_at', { ascending: false });

  const rows = (data ?? []) as unknown as {
    id: string;
    challenges: Record<string, unknown> | Record<string, unknown>[] | null;
  }[];

  const out: { challenge: Challenge; participant_id: string }[] = [];
  for (const r of rows) {
    const c = Array.isArray(r.challenges) ? r.challenges[0] : r.challenges;
    if (c) out.push({ challenge: normChallenge(c), participant_id: r.id });
  }
  return out;
}

// ---------- reactions ----------
// Reactions are deliberately short-lived: only the last 24 hours count, so the
// board reflects recent encouragement rather than a pile-up from week one.
export const REACTION_TTL_HOURS = 24;

// Returns to_user -> emoji -> { count, mine, who (ids), latest }.
// Only user ids are returned; the view maps them to names from its member list,
// which avoids a second join and keeps this query simple.
export async function getReactions(
  challengeId: string,
  meUserId: string,
): Promise<Record<string, import('./types').ReactionSummary>> {
  const supabase = getAdmin();
  const cutoff = new Date(Date.now() - REACTION_TTL_HOURS * 3600 * 1000).toISOString();

  const { data } = await supabase
    .from('reactions')
    .select('to_user, from_user, emoji, created_at')
    .eq('challenge_id', challengeId)
    .gt('created_at', cutoff)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as { to_user: string; from_user: string; emoji: string; created_at: string }[];

  const out: Record<string, import('./types').ReactionSummary> = {};
  for (const r of rows) {
    const forUser = (out[r.to_user] ??= {});
    const cell = (forUser[r.emoji] ??= { count: 0, mine: false, who: [], latest: r.created_at });
    cell.count += 1;
    cell.who.push(r.from_user);
    if (r.from_user === meUserId) cell.mine = true;
    if (r.created_at > cell.latest) cell.latest = r.created_at;
  }
  return out;
}

// ---------- badges, items, boxes ----------
export async function getUserBadges(userId: string): Promise<{ badge_key: string; earned_at: string }[]> {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('user_badges')
    .select('badge_key, earned_at')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  return (data ?? []) as { badge_key: string; earned_at: string }[];
}

export async function getUserItems(userId: string): Promise<string[]> {
  const supabase = getAdmin();
  const { data } = await supabase.from('user_items').select('item_key').eq('user_id', userId);
  return (data ?? []).map((r: { item_key: string }) => r.item_key);
}

export async function getUnopenedBoxes(userId: string): Promise<{ id: string; source: string }[]> {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('loot_boxes')
    .select('id, source')
    .eq('user_id', userId)
    .is('opened_at', null)
    .order('created_at', { ascending: true });
  return (data ?? []) as { id: string; source: string }[];
}

// ---------- bulk fetch for the hub ----------
// The hub used to run two queries per challenge. With a few challenges that is a
// pile of sequential round trips, and the page just sits there. This pulls every
// member and every log in two queries total, then slices it up in memory.
export async function getMembersForChallenges(challengeIds: string[]): Promise<Map<string, Member[]>> {
  const out = new Map<string, Member[]>();
  if (challengeIds.length === 0) return out;

  const supabase = getAdmin();
  const { data } = await supabase
    .from('participants')
    .select('id, challenge_id, user_id, joined_at, users(name, avatar_color, avatar_style, equipped)')
    .in('challenge_id', challengeIds)
    .is('removed_at', null)
    .order('joined_at', { ascending: true });

  const rows = (data ?? []) as unknown as {
    id: string;
    challenge_id: string;
    user_id: string;
    joined_at: string;
    users:
      | { name: string; avatar_color: string; avatar_style: string; equipped: Record<string, string> }
      | { name: string; avatar_color: string; avatar_style: string; equipped: Record<string, string> }[]
      | null;
  }[];

  for (const r of rows) {
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    const member: Member = {
      participant_id: r.id,
      user_id: r.user_id,
      name: u?.name ?? 'Someone',
      avatar_color: u?.avatar_color ?? '#4D7CFF',
      avatar_style: u?.avatar_style ?? 'classic',
      equipped: u?.equipped ?? {},
      joined_at: r.joined_at,
    };
    const arr = out.get(r.challenge_id);
    if (arr) arr.push(member);
    else out.set(r.challenge_id, [member]);
  }
  return out;
}

export async function getLogsByParticipant(participantIds: string[]): Promise<Map<string, LogRow[]>> {
  const out = new Map<string, LogRow[]>();
  if (participantIds.length === 0) return out;

  const supabase = getAdmin();
  const { data } = await supabase.from('logs').select('*').in('participant_id', participantIds);
  const rows = normLogs((data ?? []) as Record<string, unknown>[]);

  for (const l of rows) {
    const arr = out.get(l.participant_id);
    if (arr) arr.push(l);
    else out.set(l.participant_id, [l]);
  }
  return out;
}
