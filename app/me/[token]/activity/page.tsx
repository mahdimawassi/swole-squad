import Activity from '@/components/Activity';
import Notice from '@/components/Notice';
import { getUserByToken } from '@/lib/data';
import { listNotifications, markAllRead, pruneOld } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export default async function ActivityPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getUserByToken(token);
  if (!user) {
    return <Notice title="We can’t find your spot" body="This link may be broken." reset />;
  }

  // Tidy first, then read the list, then clear the bell: opening IS the read.
  await pruneOld(user.id);
  const notes = await listNotifications(user.id);
  await markAllRead(user.id);

  return <Activity token={token} notes={notes} />;
}
