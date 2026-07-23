import type { Challenge, Member, LogRow, MemberStats, GoalMode } from './types';

export const AVATAR_COLORS = [
  { name: 'Blaze', hex: '#FF5DA2' },
  { name: 'Volt', hex: '#4D7CFF' },
  { name: 'Lime', hex: '#37C871' },
  { name: 'Tang', hex: '#FF8A3D' },
  { name: 'Grape', hex: '#9B6DFF' },
  { name: 'Aqua', hex: '#22C3D6' },
];

export type Preset = {
  key: string;
  emoji: string;
  activity: string;
  unit: string;
  decimals: boolean;
  dailyDefault: number;
  totalDefault: number;
  quick: number[];
};

// Presets exist purely to make creation fast. They just prefill the real fields.
export const PRESETS: Preset[] = [
  { key: 'pushups',  emoji: '💪', activity: 'Push-ups', unit: 'reps', decimals: false, dailyDefault: 100, totalDefault: 3000, quick: [10, 25, 50] },
  { key: 'pullups',  emoji: '🦾', activity: 'Pull-ups', unit: 'reps', decimals: false, dailyDefault: 20,  totalDefault: 600,  quick: [5, 10, 20] },
  { key: 'squats',   emoji: '🏋️', activity: 'Squats',   unit: 'reps', decimals: false, dailyDefault: 100, totalDefault: 3000, quick: [10, 25, 50] },
  { key: 'situps',   emoji: '🔥', activity: 'Sit-ups',  unit: 'reps', decimals: false, dailyDefault: 100, totalDefault: 3000, quick: [10, 25, 50] },
  { key: 'running',  emoji: '🏃', activity: 'Running',  unit: 'km',   decimals: true,  dailyDefault: 5,   totalDefault: 100,  quick: [1, 3, 5] },
  { key: 'cycling',  emoji: '🚴', activity: 'Cycling',  unit: 'km',   decimals: true,  dailyDefault: 15,  totalDefault: 400,  quick: [5, 10, 20] },
  { key: 'walking',  emoji: '🚶', activity: 'Steps',    unit: 'steps', decimals: false, dailyDefault: 10000, totalDefault: 300000, quick: [1000, 2500, 5000] },
  { key: 'custom',   emoji: '✨', activity: '',         unit: 'reps', decimals: false, dailyDefault: 50,  totalDefault: 1500, quick: [10, 25, 50] },
];

export function presetFor(activity: string): Preset {
  const found = PRESETS.find((p) => p.activity.toLowerCase() === activity.toLowerCase());
  return found ?? PRESETS[PRESETS.length - 1];
}

export function emojiFor(activity: string): string {
  return presetFor(activity).emoji;
}

// Quick-add buttons scale off the daily target so they always feel right.
export function quickAddsFor(c: Challenge): number[] {
  const preset = presetFor(c.activity);
  const target = dailyTarget(c);
  if (preset.unit === c.unit_label) return preset.quick;
  const raw = [target * 0.1, target * 0.25, target * 0.5];
  return raw.map((n) => (n >= 10 ? Math.round(n / 5) * 5 : Math.round(n * 10) / 10)).filter((n) => n > 0);
}

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function fmt(n: number): string {
  const v = Number(n) || 0;
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// ---------- dates ----------
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayIndex(dateStr: string): number {
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return NaN;
  const [y, m, d] = parts;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function addDays(dateStr: string, n: number): string {
  const i = dayIndex(dateStr);
  if (Number.isNaN(i)) return dateStr;
  const d = new Date((i + n) * 86400000);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const x = dayIndex(a);
  const y = dayIndex(b);
  if (Number.isNaN(x) || Number.isNaN(y)) return 0;
  return y - x;
}

export function prettyDate(dateStr: string): string {
  const i = dayIndex(dateStr);
  if (Number.isNaN(i)) return dateStr;
  return new Date(i * 86400000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// ---------- goals ----------
// The number that means "you are maxed out". Drives the avatar scaling.
export function totalGoalFor(c: Challenge): number {
  const amt = Number(c.goal_amount) || 0;
  return c.goal_mode === 'daily' ? amt * c.duration_days : amt;
}

// What you should be doing on a given day.
export function dailyTarget(c: Challenge): number {
  const amt = Number(c.goal_amount) || 0;
  if (c.goal_mode === 'daily') return amt;
  const per = amt / Math.max(1, c.duration_days);
  return Math.round(per * 10) / 10;
}

export function goalLabel(c: Challenge): string {
  const amt = Number(c.goal_amount) || 0;
  return c.goal_mode === 'daily'
    ? `${fmt(amt)} ${c.unit_label} / day`
    : `${fmt(amt)} ${c.unit_label} total`;
}

// ---------- swole levels ----------
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

// ---------- streaks & stats ----------
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

export function computeStats(members: Member[], logs: LogRow[], today: string): MemberStats[] {
  const byParticipant = new Map<string, LogRow[]>();
  for (const l of logs) {
    const arr = byParticipant.get(l.participant_id);
    if (arr) arr.push(l);
    else byParticipant.set(l.participant_id, [l]);
  }
  return members.map((m) => {
    const rows = byParticipant.get(m.participant_id) ?? [];
    const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const todayRow = rows.find((r) => r.day_date === today);
    return {
      member: m,
      total,
      today: todayRow ? Number(todayRow.amount) || 0 : 0,
      streak: streakFor(
        rows.map((r) => r.day_date),
        today,
      ),
    };
  });
}

// ---------- challenge state ----------
export function challengeDay(c: Challenge, today: string): number {
  return daysBetween(c.start_date, today) + 1;
}

export type Phase = 'upcoming' | 'active' | 'done';

export function phaseOf(c: Challenge, today: string): Phase {
  const d = challengeDay(c, today);
  if (d < 1) return 'upcoming';
  if (d > c.duration_days) return 'done';
  return 'active';
}

// "Are you where you should be?" This is the nudge that makes total-mode work.
export function paceFor(c: Challenge, total: number, today: string) {
  const goal = totalGoalFor(c);
  const phase = phaseOf(c, today);
  const day = clamp(challengeDay(c, today), 0, c.duration_days);
  if (phase === 'upcoming') return { status: 'upcoming' as const, expected: 0, delta: 0, perDay: dailyTarget(c) };
  const expected = (goal * day) / c.duration_days;
  const delta = total - expected;
  const daysLeft = Math.max(0, c.duration_days - day);
  const remaining = Math.max(0, goal - total);
  const perDay = daysLeft > 0 ? remaining / daysLeft : remaining;
  let status: 'ahead' | 'onpace' | 'behind' | 'done' = 'onpace';
  if (phase === 'done') status = 'done';
  else if (delta >= goal * 0.02) status = 'ahead';
  else if (delta <= -goal * 0.05) status = 'behind';
  return { status, expected, delta, perDay: Math.round(perDay * 10) / 10 };
}

// ---------- invite codes ----------
// No O/0, no I/1/L. People read these out loud over WhatsApp.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function makeInviteCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

// Accepts a raw code, or a pasted full invite URL, because someone always pastes the URL.
export function normalizeCode(raw: string): string {
  const s = String(raw).trim();
  const fromUrl = s.match(/\/join\/([^/?#\s]+)/i);
  const candidate = fromUrl ? fromUrl[1] : s;
  return candidate.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

export function isValidGoalMode(v: unknown): v is GoalMode {
  return v === 'daily' || v === 'total';
}
