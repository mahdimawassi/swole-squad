import Hub from '@/components/Hub';
import Notice from '@/components/Notice';
import { getUserByToken, getMyChallenges, getMembers, getLogsFor, getUnopenedBoxes, getUserBadges } from '@/lib/data';
import { computeStats, todayStr } from '@/lib/challenge';
import type { HubEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HubPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  const { new: justCreated } = await searchParams;

  const user = await getUserByToken(token);
  if (!user) {
    return (
      <Notice
        title="We can’t find your spot"
        body="This link may be broken or out of date. Try your invite link again, or ask a squad-mate to re-share it."
        reset
      />
    );
  }

  const mine = await getMyChallenges(user.id);
  const today = todayStr();

  const entries: HubEntry[] = await Promise.all(
    mine.map(async ({ challenge, participant_id }) => {
      const members = await getMembers(challenge.id);
      const logs = await getLogsFor(members.map((m) => m.participant_id));
      const stats = computeStats(members, logs, today);
      const ranked = [...stats].sort((a, b) => b.total - a.total);
      const me = stats.find((s) => s.member.participant_id === participant_id);
      return {
        challenge,
        participant_id,
        total: me?.total ?? 0,
        today: me?.today ?? 0,
        streak: me?.streak ?? 0,
        rank: ranked.findIndex((s) => s.member.participant_id === participant_id) + 1 || 1,
        squadSize: members.length,
      };
    }),
  );

  const [boxes, badges] = await Promise.all([getUnopenedBoxes(user.id), getUserBadges(user.id)]);

  return (
    <Hub
      user={user}
      entries={entries}
      justCreated={justCreated}
      boxCount={boxes.length}
      badgeCount={badges.length}
    />
  );
}
