import type { Participant, LogRow, ParticipantStats } from './types';

export const AVATAR_COLORS = [
  { name: 'Blaze', hex: '#FF5DA2' },
  { name: 'Volt', hex: '#4D7CFF' },
  { name: 'Lime', hex: '#37C871' },
  { name: 'Tang', hex: '#FF8A3D' },
  { name: 'Grape', hex: '#9B6DFF' },
  { name: 'Aqua', hex: '#22C3D6' },
];

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Local calendar date as YYYY-MM-DD (what the user actually sees on their device).
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Turn a YYYY-MM-DD string into a whole-day index, timezone-safe.
export function dayIndex(dateStr: string): number {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return NaN;
  const [y, m, d] = parts;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function getSwole(total: number, totalGoal: number) {
  const p = totalGoal > 0 ? total / totalGoal : 0;
  const f = clamp(p, 0, 1.15);
  let title = 'Couch Potato';
  let tier = 0;
  if (p >= 1) {
    title = 'SWOLE GOD';
    tier = 5;
  } else if (p >= 0.8) {
    title = 'Absolute Unit';
    tier = 4;
  } else if (p >= 0.55) {
    title = 'Beefcake';
    tier = 3;
  } else if (p >= 0.3) {
    title = 'Getting Toned';
    tier = 2;
  } else if (p >= 0.08) {
    title = 'Warmed Up';
    tier = 1;
  }
  return { f, title, tier, pct: clamp(p * 100, 0, 100) };
}

// Consecutive days with a log, counting back from today (or yesterday if not logged yet today).
export function streakFor(dateStrs: string[], today: string): number {
  const idx = new Set(dateStrs.map(dayIndex).filter((n) => !Number.isNaN(n)));
  const t = dayIndex(today);
  if (Number.isNaN(t)) return 0;
  let cur: number;
  if (idx.has(t)) cur = t;
  else if (idx.has(t - 1)) cur = t - 1;
  else return 0;
  let streak = 0;
  while (idx.has(cur)) {
    streak += 1;
    cur -= 1;
  }
  return streak;
}

export function computeStats(
  participants: Participant[],
  logs: LogRow[],
  today: string,
): ParticipantStats[] {
  const byParticipant = new Map<string, LogRow[]>();
  for (const l of logs) {
    const arr = byParticipant.get(l.participant_id);
    if (arr) arr.push(l);
    else byParticipant.set(l.participant_id, [l]);
  }
  return participants.map((p) => {
    const rows = byParticipant.get(p.id) ?? [];
    const total = rows.reduce((sum, r) => sum + r.reps, 0);
    const todayRow = rows.find((r) => r.day_date === today);
    return {
      participant: p,
      total,
      today: todayRow ? todayRow.reps : 0,
      streak: streakFor(
        rows.map((r) => r.day_date),
        today,
      ),
    };
  });
}

// 1-based day number of the challenge. <1 means not started, > duration means finished.
export function challengeDay(startDate: string, today: string): number {
  const s = dayIndex(startDate);
  const t = dayIndex(today);
  if (Number.isNaN(s) || Number.isNaN(t)) return 0;
  return t - s + 1;
}
