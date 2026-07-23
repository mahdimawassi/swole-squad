import JoinChallenge from '@/components/JoinChallenge';
import Notice from '@/components/Notice';
import { getChallengeByCode, getMembers } from '@/lib/data';
import { normalizeCode } from '@/lib/challenge';

export const dynamic = 'force-dynamic';

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
