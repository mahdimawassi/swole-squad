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
    .select('id, user_id, joined_at, users(name, avatar_color, avatar_style)')
    .eq('challenge_id', challengeId)
    .is('removed_at', null)
    .order('joined_at', { ascending: true });

  const rows = (data ?? []) as unknown as {
    id: string;
    user_id: string;
    joined_at: string;
    users:
      | { name: string; avatar_color: string; avatar_style: string }
      | { name: string; avatar_color: string; avatar_style: string }[]
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

// ---------- messages ----------
export async function getMessages(challengeId: string, limit = 100): Promise<import('./types').Message[]> {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('messages')
    .select('id, body, created_at, user_id, users(name, avatar_color)')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: true })
    .limit(limit);

  const rows = (data ?? []) as unknown as {
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    users: { name: string; avatar_color: string } | { name: string; avatar_color: string }[] | null;
  }[];

  return rows.map((r) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      user_id: r.user_id,
      name: u?.name ?? 'Someone',
      avatar_color: u?.avatar_color ?? '#4D7CFF',
      body: r.body,
      created_at: r.created_at,
    };
  });
}

// ---------- reactions ----------
// Returns a map: to_user id -> { emoji -> { count, mine } }, for one challenge.
export async function getReactions(
  challengeId: string,
  meUserId: string,
): Promise<Record<string, import('./types').ReactionSummary>> {
  const supabase = getAdmin();
  const { data } = await supabase
    .from('reactions')
    .select('to_user, from_user, emoji')
    .eq('challenge_id', challengeId);

  const rows = (data ?? []) as { to_user: string; from_user: string; emoji: string }[];
  const out: Record<string, import('./types').ReactionSummary> = {};
  for (const r of rows) {
    const forUser = (out[r.to_user] ??= {});
    const cell = (forUser[r.emoji] ??= { count: 0, mine: false });
    cell.count += 1;
    if (r.from_user === meUserId) cell.mine = true;
  }
  return out;
}
