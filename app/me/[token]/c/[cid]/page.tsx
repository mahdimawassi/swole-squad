import ChallengeView from '@/components/ChallengeView';
import Notice from '@/components/Notice';
import { getUserByToken, getChallengeById, getMembers, getLogsFor, getReactions } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ChallengePage({ params }: { params: Promise<{ token: string; cid: string }> }) {
  const { token, cid } = await params;

  const user = await getUserByToken(token);
  if (!user) {
    return (
      <Notice title="We can’t find your spot" body="This link may be broken. Try your invite link again." reset />
    );
  }

  const challenge = await getChallengeById(cid);
  if (!challenge) {
    return <Notice title="Challenge missing" body="This challenge no longer exists." />;
  }

  const members = await getMembers(challenge.id);
  const me = members.find((m) => m.user_id === user.id);
  if (!me) {
    return (
      <Notice
        title="You’re not in this one"
        body="You’ve either left this challenge or been removed from it. Ask for a fresh invite to rejoin."
      />
    );
  }

  const [logs, reactions] = await Promise.all([
    getLogsFor(members.map((m) => m.participant_id)),
    getReactions(challenge.id, user.id),
  ]);

  return (
    <ChallengeView
      user={user}
      challenge={challenge}
      members={members}
      logs={logs}
      reactions={reactions}
      myParticipantId={me.participant_id}
    />
  );
}
