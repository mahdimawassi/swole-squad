// Composes the messages people fire into whatever chat app they use.
// The app writes the words; the phone's own share sheet picks the destination.

import { fmt, goalLabel, emojiFor } from './challenge';
import type { Challenge } from './types';

export type ShareResult = 'shared' | 'copied' | 'failed';

// Native share sheet lists every messaging app installed. Falls back to the
// clipboard on desktop and anywhere the API is missing.
export async function shareText(text: string, url?: string): Promise<ShareResult> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share(url ? { text, url } : { text });
      return 'shared';
    } catch (err) {
      // A user cancelling the sheet is not a failure; just stop quietly.
      if (err instanceof Error && err.name === 'AbortError') return 'shared';
    }
  }
  try {
    await nav?.clipboard?.writeText(url ? `${text}\n${url}` : text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function inviteMessage(c: Challenge, url: string): string {
  return `${emojiFor(c.activity)} Join my challenge: ${c.name}\n${goalLabel(c)} for ${c.duration_days} days.\nNo signup faff, just tap the link 👇\n${url}`;
}

export function braggingMessage(
  c: Challenge,
  opts: { name: string; total: number; rank: number; streak: number; title: string },
  url: string,
): string {
  const streakBit = opts.streak > 1 ? ` · ${opts.streak} day streak 🔥` : '';
  return `${emojiFor(c.activity)} ${c.name}\n${fmt(opts.total)} ${c.unit_label} down. Rank #${opts.rank}${streakBit}\nCurrent status: ${opts.title} 💪\n${url}`;
}

export function standingsMessage(
  c: Challenge,
  rows: { name: string; total: number; doneToday: boolean }[],
  url: string,
): string {
  const medals = ['🥇', '🥈', '🥉'];
  const lines = rows
    .slice(0, 10)
    .map((r, i) => `${medals[i] ?? `${i + 1}.`} ${r.name} — ${fmt(r.total)} ${c.unit_label}${r.doneToday ? ' ✅' : ''}`)
    .join('\n');
  return `${emojiFor(c.activity)} ${c.name} — standings\n\n${lines}\n\n${url}`;
}

export function nudgeMessage(c: Challenge, names: string[], url: string): string {
  if (names.length === 0) return `${emojiFor(c.activity)} Everyone's logged today. Look at us. 🏆\n${url}`;
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `👀 ${who}, still nothing logged today for ${c.name}.\nThe rest of us are waiting.\n${url}`;
}
