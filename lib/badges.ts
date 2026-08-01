// Lifetime, cross-challenge achievements. Deliberately NOT scoped to a single
// challenge: carrying totals, streaks and collections between challenges is what
// makes starting a second one feel like continuing rather than resetting.

export type BadgeFamily = 'volume' | 'consistency' | 'completion' | 'social' | 'hidden';

export type Badge = {
  key: string;
  name: string;
  description: string;
  emoji: string;
  family: BadgeFamily;
  hidden?: boolean; // not shown until earned
};

// What we know about a person across everything they have ever done.
export type LifetimeStats = {
  // unit-aware totals, keyed by lowercased unit label: reps / km / steps / ...
  totalsByUnit: Record<string, number>;
  // per activity name, lowercased
  totalsByActivity: Record<string, number>;
  bestStreak: number;
  currentStreak: number;
  daysLogged: number;
  challengesJoined: number;
  challengesCompleted: number;
  perfectChallenges: number; // hit the daily goal every single day
  challengesCreated: number;
  peopleRecruited: number; // joined a challenge you made
  reactionsGiven: number;
  earlyBirdLogs: number; // logged before 6am local
  nightOwlLogs: number; // logged at 11pm or later local
  comebacks: number; // logged again after a gap of 3+ days
  maxSingleDay: number;
  overachieved: boolean;
};

export const EMPTY_STATS: LifetimeStats = {
  totalsByUnit: {},
  totalsByActivity: {},
  bestStreak: 0,
  currentStreak: 0,
  daysLogged: 0,
  challengesJoined: 0,
  challengesCompleted: 0,
  perfectChallenges: 0,
  challengesCreated: 0,
  peopleRecruited: 0,
  reactionsGiven: 0,
  earlyBirdLogs: 0,
  nightOwlLogs: 0,
  comebacks: 0,
  maxSingleDay: 0,
  overachieved: false,
};

// ---------- volume ladders ----------
// Thresholds are per unit, because 100 push-ups and 100 km are not the same feat.
const REP_TIERS = [
  { at: 100, name: 'Century', emoji: '💯' },
  { at: 500, name: 'Five Hundred Club', emoji: '🖐️' },
  { at: 1000, name: 'Four Figures', emoji: '🔥' },
  { at: 5000, name: 'Machine', emoji: '🤖' },
  { at: 10000, name: 'Ten Thousand Strong', emoji: '🏔️' },
  { at: 25000, name: 'Certified Unit', emoji: '🦍' },
];

const DISTANCE_TIERS = [
  { at: 10, name: 'First Ten', emoji: '👟' },
  { at: 42, name: 'Marathon Distance', emoji: '🏅' },
  { at: 100, name: 'Century Rider', emoji: '💯' },
  { at: 250, name: 'Long Hauler', emoji: '🛣️' },
  { at: 500, name: 'Continental', emoji: '🌍' },
  { at: 1000, name: 'Thousand Club', emoji: '🚀' },
];

const STEP_TIERS = [
  { at: 50000, name: 'Wanderer', emoji: '🚶' },
  { at: 250000, name: 'Pathfinder', emoji: '🧭' },
  { at: 1000000, name: 'Million Steps', emoji: '🌟' },
];

function volumeBadges(): Badge[] {
  const out: Badge[] = [];
  for (const t of REP_TIERS) {
    out.push({
      key: `reps_${t.at}`,
      name: t.name,
      description: `${t.at.toLocaleString()} reps logged, all time`,
      emoji: t.emoji,
      family: 'volume',
    });
  }
  for (const t of DISTANCE_TIERS) {
    out.push({
      key: `km_${t.at}`,
      name: t.name,
      description: `${t.at.toLocaleString()} km covered, all time`,
      emoji: t.emoji,
      family: 'volume',
    });
  }
  for (const t of STEP_TIERS) {
    out.push({
      key: `steps_${t.at}`,
      name: t.name,
      description: `${t.at.toLocaleString()} steps, all time`,
      emoji: t.emoji,
      family: 'volume',
    });
  }
  return out;
}

export const BADGES: Badge[] = [
  ...volumeBadges(),

  // ---------- consistency ----------
  { key: 'streak_3', name: 'Warmed Up', description: '3 days in a row', emoji: '🌱', family: 'consistency' },
  { key: 'streak_7', name: 'Full Week', description: '7 days in a row', emoji: '📅', family: 'consistency' },
  { key: 'streak_14', name: 'Fortnight', description: '14 days in a row', emoji: '⚡', family: 'consistency' },
  { key: 'streak_30', name: 'Unbreakable', description: '30 days in a row', emoji: '💎', family: 'consistency' },
  { key: 'streak_100', name: 'Triple Digits', description: '100 days in a row', emoji: '👑', family: 'consistency' },
  { key: 'days_50', name: 'Regular', description: '50 days logged', emoji: '📈', family: 'consistency' },
  { key: 'days_200', name: 'Fixture', description: '200 days logged', emoji: '🗿', family: 'consistency' },

  // ---------- completion ----------
  { key: 'finish_1', name: 'Finisher', description: 'Completed a challenge', emoji: '🏁', family: 'completion' },
  { key: 'finish_5', name: 'Serial Finisher', description: 'Completed 5 challenges', emoji: '🎖️', family: 'completion' },
  { key: 'perfect_1', name: 'Perfect Run', description: 'Hit the daily goal every single day of a challenge', emoji: '✨', family: 'completion' },
  { key: 'perfect_3', name: 'Flawless', description: 'Three perfect challenges', emoji: '🏆', family: 'completion' },
  { key: 'multi_3', name: 'Juggler', description: 'In 3 challenges at once', emoji: '🤹', family: 'completion' },

  // ---------- social ----------
  { key: 'creator_1', name: 'Instigator', description: 'Started a challenge', emoji: '🚀', family: 'social' },
  { key: 'creator_3', name: 'Ringleader', description: 'Started 3 challenges', emoji: '🎪', family: 'social' },
  { key: 'recruit_1', name: 'Recruiter', description: 'Someone joined a challenge you made', emoji: '🤝', family: 'social' },
  { key: 'recruit_5', name: 'Squad Builder', description: 'Five people joined your challenges', emoji: '🏗️', family: 'social' },
  { key: 'cheer_10', name: 'Hype Man', description: 'Left 10 reactions', emoji: '📣', family: 'social' },

  // ---------- hidden ----------
  { key: 'early_bird', name: 'Early Bird', description: 'Logged before 6am', emoji: '🌅', family: 'hidden', hidden: true },
  { key: 'night_owl', name: 'Night Owl', description: 'Logged at 11pm or later', emoji: '🦉', family: 'hidden', hidden: true },
  { key: 'comeback', name: 'The Comeback', description: 'Came back after going quiet for a few days', emoji: '🔙', family: 'hidden', hidden: true },
  { key: 'overachiever', name: 'Overachiever', description: 'Did 3x the daily goal in one day', emoji: '🤯', family: 'hidden', hidden: true },
  { key: 'first_log', name: 'Day One', description: 'Logged for the very first time', emoji: '🥚', family: 'hidden', hidden: true },
];

export const BADGE_BY_KEY: Record<string, Badge> = Object.fromEntries(BADGES.map((b) => [b.key, b]));

// Which badges does this person qualify for right now?
export function earnedBadgeKeys(s: LifetimeStats): string[] {
  const out: string[] = [];
  const reps = s.totalsByUnit['reps'] ?? 0;
  const km = s.totalsByUnit['km'] ?? 0;
  const steps = s.totalsByUnit['steps'] ?? 0;

  for (const t of REP_TIERS) if (reps >= t.at) out.push(`reps_${t.at}`);
  for (const t of DISTANCE_TIERS) if (km >= t.at) out.push(`km_${t.at}`);
  for (const t of STEP_TIERS) if (steps >= t.at) out.push(`steps_${t.at}`);

  if (s.bestStreak >= 3) out.push('streak_3');
  if (s.bestStreak >= 7) out.push('streak_7');
  if (s.bestStreak >= 14) out.push('streak_14');
  if (s.bestStreak >= 30) out.push('streak_30');
  if (s.bestStreak >= 100) out.push('streak_100');
  if (s.daysLogged >= 50) out.push('days_50');
  if (s.daysLogged >= 200) out.push('days_200');

  if (s.challengesCompleted >= 1) out.push('finish_1');
  if (s.challengesCompleted >= 5) out.push('finish_5');
  if (s.perfectChallenges >= 1) out.push('perfect_1');
  if (s.perfectChallenges >= 3) out.push('perfect_3');
  if (s.challengesJoined >= 3) out.push('multi_3');

  if (s.challengesCreated >= 1) out.push('creator_1');
  if (s.challengesCreated >= 3) out.push('creator_3');
  if (s.peopleRecruited >= 1) out.push('recruit_1');
  if (s.peopleRecruited >= 5) out.push('recruit_5');
  if (s.reactionsGiven >= 10) out.push('cheer_10');

  if (s.earlyBirdLogs >= 1) out.push('early_bird');
  if (s.nightOwlLogs >= 1) out.push('night_owl');
  if (s.comebacks >= 1) out.push('comeback');
  if (s.overachieved) out.push('overachiever');
  if (s.daysLogged >= 1) out.push('first_log');

  return out;
}

// How close are you to a badge you have not got yet? Returns null when it is not
// a measurable one (the hidden ones are meant to stay mysterious).
export function badgeProgress(key: string, s: LifetimeStats): { have: number; need: number } | null {
  const reps = s.totalsByUnit['reps'] ?? 0;
  const km = s.totalsByUnit['km'] ?? 0;
  const steps = s.totalsByUnit['steps'] ?? 0;

  const m = key.match(/^(reps|km|steps)_(\d+)$/);
  if (m) {
    const have = m[1] === 'reps' ? reps : m[1] === 'km' ? km : steps;
    return { have, need: Number(m[2]) };
  }

  const streak = key.match(/^streak_(\d+)$/);
  if (streak) return { have: s.bestStreak, need: Number(streak[1]) };

  const days = key.match(/^days_(\d+)$/);
  if (days) return { have: s.daysLogged, need: Number(days[1]) };

  const finish = key.match(/^finish_(\d+)$/);
  if (finish) return { have: s.challengesCompleted, need: Number(finish[1]) };

  const perfect = key.match(/^perfect_(\d+)$/);
  if (perfect) return { have: s.perfectChallenges, need: Number(perfect[1]) };

  const creator = key.match(/^creator_(\d+)$/);
  if (creator) return { have: s.challengesCreated, need: Number(creator[1]) };

  const recruit = key.match(/^recruit_(\d+)$/);
  if (recruit) return { have: s.peopleRecruited, need: Number(recruit[1]) };

  const cheer = key.match(/^cheer_(\d+)$/);
  if (cheer) return { have: s.reactionsGiven, need: Number(cheer[1]) };

  if (key === 'multi_3') return { have: s.challengesJoined, need: 3 };

  return null;
}

export const FAMILY_META: Record<BadgeFamily, { label: string; blurb: string; emoji: string }> = {
  volume: { label: 'Volume', blurb: 'Total amount, across every challenge you have ever done', emoji: '📊' },
  consistency: { label: 'Consistency', blurb: 'Showing up day after day', emoji: '🔥' },
  completion: { label: 'Completion', blurb: 'Seeing challenges through to the end', emoji: '🏁' },
  social: { label: 'Squad', blurb: 'Starting things and dragging people in', emoji: '🤝' },
  hidden: { label: 'Secret', blurb: 'You will find these by accident', emoji: '🕵️' },
};

// Progress towards the next rung of a ladder, for the "almost there" nudge.
export function nextVolumeGoal(unit: string, total: number): { at: number; name: string } | null {
  const tiers = unit === 'km' ? DISTANCE_TIERS : unit === 'steps' ? STEP_TIERS : REP_TIERS;
  const next = tiers.find((t) => total < t.at);
  return next ? { at: next.at, name: next.name } : null;
}
