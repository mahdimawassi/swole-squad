import Hub from '@/components/Hub';
import Notice from '@/components/Notice';
import {
  getUserByToken,
  getMyChallenges,
  getMembersForChallenges,
  getLogsByParticipant,
  getUnopenedBoxes,
  getUserBadges,
} from '@/lib/data';
import { computeStats, todayStr } from '@/lib/challenge';
import { unreadCount } from '@/lib/notify';
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

  // Two queries for every challenge at once, rather than two per challenge.
  const challengeIds = mine.map((m) => m.challenge.id);
  const membersByChallenge = await getMembersForChallenges(challengeIds);
  const allPids = [...membersByChallenge.values()].flat().map((m) => m.participant_id);
  const logsByParticipant = await getLogsByParticipant(allPids);

  const entries: HubEntry[] = mine.map(({ challenge, participant_id }) => {
    const members = membersByChallenge.get(challenge.id) ?? [];
    const logs = members.flatMap((m) => logsByParticipant.get(m.participant_id) ?? []);
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
  });

  const [boxes, badges, unread] = await Promise.all([
    getUnopenedBoxes(user.id),
    getUserBadges(user.id),
    unreadCount(user.id),
  ]);

  return (
    <Hub
      user={user}
      entries={entries}
      justCreated={justCreated}
      boxCount={boxes.length}
      badgeCount={badges.length}
      unread={unread}
    />
  );
}
