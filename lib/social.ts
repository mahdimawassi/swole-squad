// Everything about linking out to the squad's real chat, whichever app they use.

export type Platform = {
  key: string;
  label: string;
  emoji: string;
  color: string;
};

const PLATFORMS: { match: RegExp; platform: Platform }[] = [
  { match: /(^|\.)chat\.whatsapp\.com$/i, platform: { key: 'whatsapp', label: 'WhatsApp', emoji: '💬', color: '#25D366' } },
  { match: /(^|\.)wa\.me$/i, platform: { key: 'whatsapp', label: 'WhatsApp', emoji: '💬', color: '#25D366' } },
  { match: /(^|\.)t\.me$/i, platform: { key: 'telegram', label: 'Telegram', emoji: '✈️', color: '#2AABEE' } },
  { match: /(^|\.)telegram\.me$/i, platform: { key: 'telegram', label: 'Telegram', emoji: '✈️', color: '#2AABEE' } },
  { match: /(^|\.)discord\.gg$/i, platform: { key: 'discord', label: 'Discord', emoji: '🎮', color: '#5865F2' } },
  { match: /(^|\.)discord\.com$/i, platform: { key: 'discord', label: 'Discord', emoji: '🎮', color: '#5865F2' } },
  { match: /(^|\.)signal\.group$/i, platform: { key: 'signal', label: 'Signal', emoji: '🔒', color: '#3A76F0' } },
  { match: /(^|\.)ig\.me$/i, platform: { key: 'instagram', label: 'Instagram', emoji: '📸', color: '#E1306C' } },
  { match: /(^|\.)instagram\.com$/i, platform: { key: 'instagram', label: 'Instagram', emoji: '📸', color: '#E1306C' } },
  { match: /(^|\.)m\.me$/i, platform: { key: 'messenger', label: 'Messenger', emoji: '💌', color: '#0084FF' } },
  { match: /(^|\.)messenger\.com$/i, platform: { key: 'messenger', label: 'Messenger', emoji: '💌', color: '#0084FF' } },
  { match: /(^|\.)slack\.com$/i, platform: { key: 'slack', label: 'Slack', emoji: '💼', color: '#4A154B' } },
  { match: /(^|\.)groupme\.com$/i, platform: { key: 'groupme', label: 'GroupMe', emoji: '💭', color: '#00AFF0' } },
];

const GENERIC: Platform = { key: 'other', label: 'Group chat', emoji: '💬', color: '#4D7CFF' };

// Which app is this invite link for? Falls back to a neutral label.
export function detectPlatform(url: string | null | undefined): Platform | null {
  const clean = normalizeGroupUrl(url);
  if (!clean) return null;
  try {
    const host = new URL(clean).hostname;
    for (const { match, platform } of PLATFORMS) {
      if (match.test(host)) return platform;
    }
    return GENERIC;
  } catch {
    return null;
  }
}

// Accepts what someone actually pastes. Adds https:// if missing, rejects anything
// that is not a plain http(s) link (no javascript: or data: URLs).
export function normalizeGroupUrl(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}
