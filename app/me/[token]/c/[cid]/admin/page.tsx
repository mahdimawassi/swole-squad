import ChallengeAdmin from '@/components/ChallengeAdmin';
import Notice from '@/components/Notice';
import { getUserByToken, getChallengeById, getMembers } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ params }: { params: Promise<{ token: string; cid: string }> }) {
  const { token, cid } = await params;

  const user = await getUserByToken(token);
  if (!user) {
    return <Notice title="We can’t find your spot" body="This link may be broken. Try your invite link again." reset />;
  }

  const challenge = await getChallengeById(cid);
  if (!challenge) {
    return <Notice title="Challenge missing" body="This challenge no longer exists." />;
  }

  // Guard: only the creator sees the admin page.
  if (challenge.created_by !== user.id) {
    return (
      <Notice
        title="Admins only"
        body="Only the person who created this challenge can open its settings."
      />
    );
  }

  const members = await getMembers(challenge.id);
  return <ChallengeAdmin user={user} challenge={challenge} members={members} />;
}
