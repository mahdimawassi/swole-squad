import JoinChallenge from '@/components/JoinChallenge';
import Notice from '@/components/Notice';
import { getChallengeByCode, getMembers } from '@/lib/data';
import { normalizeCode, goalLabel } from '@/lib/challenge';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Title and description for the preview card in chat apps.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  try {
    const challenge = await getChallengeByCode(normalizeCode(code));
    if (challenge) {
      return {
        title: `Join ${challenge.name} · Swole Squad`,
        description: `${goalLabel(challenge)} for ${challenge.duration_days} days. Tap to join, no signup needed.`,
      };
    }
  } catch {
    // fall through
  }
  return {
    title: 'Join the Swole Squad',
    description: 'A group fitness challenge with your friends. Tap to join, no signup needed.',
  };
}

export default async function JoinByCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const challenge = await getChallengeByCode(normalizeCode(code));

  if (!challenge) {
    return (
      <Notice
        title="Invite not found"
        body="That code or link isn’t valid. Double-check it, or ask whoever sent it for a fresh one."
      />
    );
  }

  const members = await getMembers(challenge.id);
  return <JoinChallenge challenge={challenge} squadSize={members.length} />;
}
