import EmailPrefs from '@/components/EmailPrefs';
import Notice from '@/components/Notice';
import { getUserByToken } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function EmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getUserByToken(token);
  if (!user) {
    return <Notice title="We can’t find your spot" body="This link may be broken. Try your invite link again." reset />;
  }
  return <EmailPrefs user={user} />;
}
