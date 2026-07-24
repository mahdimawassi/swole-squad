import Profile from '@/components/Profile';
import Notice from '@/components/Notice';
import { getUserByToken, getMyChallenges } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const user = await getUserByToken(token);
  if (!user) {
    return (
      <Notice
        title="We can’t find your spot"
        body="This link may be broken or out of date. Try your invite link again."
        reset
      />
    );
  }

  const mine = await getMyChallenges(user.id);
  return <Profile user={user} challengeCount={mine.length} />;
}
