import { getAdmin } from './supabaseAdmin';
import { EMPTY_STATS, earnedBadgeKeys, type LifetimeStats } from './badges';
import { rollItem, ITEM_BY_KEY, type Item } from './items';
import { dayIndex, todayStr, streakFor, phaseOf, dailyTarget } from './challenge';
import type { Challenge } from './types';

// ---------------------------------------------------------------------------
// Everything a person has ever done, in one pass. This is what badges read.
// ---------------------------------------------------------------------------
export async function getLifetimeStats(userId: string): Promise<LifetimeStats> {
  const supabase = getAdmin();
  const stats: LifetimeStats = JSON.parse(JSON.stringify(EMPTY_STATS));
  const today = todayStr();

  // Every membership this person has, with the challenge behind it.
  const { data: partRows } = await supabase
    .from('participants')
    .select('id, challenge_id, removed_at, challenges(*)')
    .eq('user_id', userId);

  const parts = (partRows ?? []) as unknown as {
    id: string;
    challenge_id: string;
    removed_at: string | null;
    challenges: Record<string, unknown> | Record<string, unknown>[] | null;
  }[];

  if (parts.length === 0) return stats;

  const pids = parts.map((p) => p.id);
  const { data: logRows } = await supabase
    .from('logs')
    .select('participant_id, day_date, amount, local_hour')
    .in('participant_id', pids);

  const logs = (logRows ?? []) as {
    participant_id: string;
    day_date: string;
    amount: number | string;
    local_hour: number | null;
  }[];

  const byParticipant = new Map<string, typeof logs>();
  for (const l of logs) {
    const arr = byParticipant.get(l.participant_id);
    if (arr) arr.push(l);
    else byParticipant.set(l.participant_id, [l]);
  }

  const allDays = new Set<string>();
  // "Overachiever": tripled a daily target in a single day, in any challenge.
  let overachieved = false;
  stats.challengesJoined = parts.filter((p) => !p.removed_at).length;

  for (const p of parts) {
    const raw = Array.isArray(p.challenges) ? p.challenges[0] : p.challenges;
    if (!raw) continue;
    const c = {
      ...(raw as unknown as Challenge),
      goal_amount: Number(raw.goal_amount) || 0,
      duration_days: Number(raw.duration_days) || 1,
    };

    const rows = byParticipant.get(p.id) ?? [];
    const unit = String(c.unit_label ?? 'reps').toLowerCase();
    const activity = String(c.activity ?? '').toLowerCase();
    const target = dailyTarget(c);

    let challengeTotal = 0;
    let daysHit = 0;

    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      challengeTotal += amt;
      allDays.add(r.day_date);
      if (amt > stats.maxSingleDay) stats.maxSingleDay = amt;
      if (c.goal_mode === 'daily' && amt >= target) daysHit += 1;
      if (c.goal_mode === 'daily' && target > 0 && amt >= target * 3) overachieved = true;
      if (r.local_hour !== null && r.local_hour !== undefined) {
        if (r.local_hour < 6) stats.earlyBirdLogs += 1;
        if (r.local_hour >= 23) stats.nightOwlLogs += 1;
      }
    }

    stats.totalsByUnit[unit] = (stats.totalsByUnit[unit] ?? 0) + challengeTotal;
    if (activity) stats.totalsByActivity[activity] = (stats.totalsByActivity[activity] ?? 0) + challengeTotal;

    const finished = phaseOf(c, today) === 'done';
    if (finished) {
      stats.challengesCompleted += 1;
      if (c.goal_mode === 'daily' && daysHit >= c.duration_days) stats.perfectChallenges += 1;
      if (c.goal_mode === 'total' && challengeTotal >= c.goal_amount) stats.perfectChallenges += 1;
    }
  }

  // Streaks are computed across every challenge at once, so logging anything on
  // a given day keeps the run alive.
  const dayList = [...allDays].sort();
  stats.daysLogged = dayList.length;
  stats.currentStreak = streakFor(dayList, today);
  stats.bestStreak = bestRun(dayList);
  stats.comebacks = countComebacks(dayList);

  // Challenges they created, and how many people showed up to them.
  const { data: created } = await supabase.from('challenges').select('id').eq('created_by', userId);
  const createdIds = (created ?? []).map((c: { id: string }) => c.id);
  stats.challengesCreated = createdIds.length;

  if (createdIds.length > 0) {
    const { count } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .in('challenge_id', createdIds)
      .neq('user_id', userId);
    stats.peopleRecruited = count ?? 0;
  }

  const { count: reactionCount } = await supabase
    .from('reactions')
    .select('id', { count: 'exact', head: true })
    .eq('from_user', userId);
  stats.reactionsGiven = reactionCount ?? 0;

  stats.overachieved = overachieved;
  return stats;
}

// Longest run of consecutive days, ever.
export function bestRun(dateStrs: string[]): number {
  const idx = [...new Set(dateStrs.map(dayIndex).filter((n) => !Number.isNaN(n)))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of idx) {
    run = prev !== null && d === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

// Gaps of 3+ days followed by logging again.
export function countComebacks(dateStrs: string[]): number {
  const idx = [...new Set(dateStrs.map(dayIndex).filter((n) => !Number.isNaN(n)))].sort((a, b) => a - b);
  let n = 0;
  for (let i = 1; i < idx.length; i += 1) {
    if (idx[i] - idx[i - 1] >= 4) n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Award anything newly earned. Returns what is new, so the UI can celebrate it.
// Safe to call repeatedly: unique constraints make re-awarding a no-op.
// ---------------------------------------------------------------------------
export type AwardResult = { newBadges: string[]; newBoxes: number };

export async function evaluateAndAward(userId: string, extra?: Partial<LifetimeStats>): Promise<AwardResult> {
  const supabase = getAdmin();
  const stats = await getLifetimeStats(userId);
  if (extra) Object.assign(stats, extra);

  const qualified = new Set(earnedBadgeKeys(stats));

  const { data: existing } = await supabase.from('user_badges').select('badge_key').eq('user_id', userId);
  const have = new Set((existing ?? []).map((r: { badge_key: string }) => r.badge_key));

  const fresh = [...qualified].filter((k) => !have.has(k));
  if (fresh.length === 0) return { newBadges: [], newBoxes: 0 };

  await supabase.from('user_badges').insert(fresh.map((badge_key) => ({ user_id: userId, badge_key })));

  // Every badge earns a box. That keeps boxes tied to achievement rather than to
  // opening the app, which is the difference between a reward and a slot machine.
  const boxes = fresh.map((k) => ({ user_id: userId, source: `badge:${k}` }));
  const { error } = await supabase.from('loot_boxes').insert(boxes);

  return { newBadges: fresh, newBoxes: error ? 0 : boxes.length };
}

// Grant a one-off box for something other than a badge (welcome, challenge done).
export async function grantBox(userId: string, source: string): Promise<boolean> {
  const supabase = getAdmin();
  const { error } = await supabase.from('loot_boxes').insert({ user_id: userId, source });
  return !error; // a duplicate source is silently ignored by the unique index
}

// Open a box: roll from what they do not own yet, record it, hand it over.
export async function openBox(userId: string, boxId: string): Promise<{ item: Item | null; error?: string }> {
  const supabase = getAdmin();

  const { data: box } = await supabase
    .from('loot_boxes')
    .select('id, user_id, opened_at')
    .eq('id', boxId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!box) return { item: null, error: 'That box is not yours.' };
  if (box.opened_at) return { item: null, error: 'Already opened.' };

  const { data: ownedRows } = await supabase.from('user_items').select('item_key').eq('user_id', userId);
  const owned = (ownedRows ?? []).map((r: { item_key: string }) => r.item_key);

  const item = rollItem(owned);
  if (!item) {
    // Nothing left to win. Mark it opened so it stops nagging them.
    await supabase.from('loot_boxes').update({ opened_at: new Date().toISOString() }).eq('id', boxId);
    return { item: null, error: 'You already own every item. Legend.' };
  }

  // Claim the box first. If two taps race, only one gets past this filter.
  const { data: claimed } = await supabase
    .from('loot_boxes')
    .update({ opened_at: new Date().toISOString(), item_key: item.key })
    .eq('id', boxId)
    .is('opened_at', null)
    .select('id')
    .maybeSingle();

  if (!claimed) return { item: null, error: 'Already opened.' };

  await supabase.from('user_items').insert({ user_id: userId, item_key: item.key });
  return { item: ITEM_BY_KEY[item.key] ?? item };
}
