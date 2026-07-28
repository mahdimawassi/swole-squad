import { ImageResponse } from 'next/og';
import { getChallengeByCode, getMembers } from '@/lib/data';
import { goalLabel, emojiFor, normalizeCode } from '@/lib/challenge';

export const runtime = 'nodejs';
export const alt = 'Swole Squad challenge invite';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The card that renders when someone pastes an invite link into WhatsApp,
// Telegram, Instagram, Discord, iMessage, Slack and friends.
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let title = 'Join the Swole Squad';
  let subtitle = 'A challenge with your friends';
  let badge = '🏋️';
  let squad = '';

  try {
    const challenge = await getChallengeByCode(normalizeCode(code));
    if (challenge) {
      title = challenge.name;
      subtitle = `${goalLabel(challenge)} · ${challenge.duration_days} days`;
      badge = emojiFor(challenge.activity);
      const members = await getMembers(challenge.id);
      squad = members.length > 0 ? `${members.length} already in` : 'Be the first in';
    }
  } catch {
    // Fall back to the generic card rather than failing the preview.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFE066',
          padding: 64,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#fff',
            border: '10px solid #141414',
            borderRadius: 40,
            boxShadow: '20px 20px 0 #141414',
            padding: '54px 64px',
            maxWidth: 980,
          }}
        >
          <div style={{ display: 'flex', fontSize: 84, marginBottom: 4 }}>{badge}</div>
          <div
            style={{
              display: 'flex',
              fontSize: 66,
              fontWeight: 900,
              color: '#141414',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 22,
              background: '#FFD54A',
              border: '6px solid #141414',
              borderRadius: 999,
              padding: '12px 34px',
              fontSize: 34,
              fontWeight: 800,
              color: '#141414',
            }}
          >
            {subtitle}
          </div>
          {squad && (
            <div style={{ display: 'flex', marginTop: 22, fontSize: 30, fontWeight: 700, color: '#141414', opacity: 0.75 }}>
              💪 {squad}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', marginTop: 30, fontSize: 28, fontWeight: 800, color: '#141414', opacity: 0.8 }}>
          🏋️ SWOLE SQUAD — tap to join, no signup
        </div>
      </div>
    ),
    { ...size },
  );
}
