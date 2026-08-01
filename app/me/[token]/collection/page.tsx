import Collection from '@/components/Collection';
import Notice from '@/components/Notice';
import { getUserByToken, getUserBadges, getUserItems, getUnopenedBoxes } from '@/lib/data';
import { getLifetimeStats, evaluateAndAward, grantBox } from '@/lib/progress';

export const dynamic = 'force-dynamic';

export default async function CollectionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const user = await getUserByToken(token);
  if (!user) {
    return <Notice title="We can’t find your spot" body="This link may be broken. Try your invite link again." reset />;
  }

  // Visiting is a natural moment to catch anyone up on badges they already
  // deserved, which is what backfills people who joined before badges existed.
  await grantBox(user.id, 'welcome');
  await evaluateAndAward(user.id);

  const [stats, earned, owned, boxes] = await Promise.all([
    getLifetimeStats(user.id),
    getUserBadges(user.id),
    getUserItems(user.id),
    getUnopenedBoxes(user.id),
  ]);

  return <Collection user={user} stats={stats} earned={earned} owned={owned} boxes={boxes} />;
}
