import { getAdmin } from '@/lib/supabaseAdmin';
import JoinForm from '@/components/JoinForm';
import Notice from '@/components/Notice';

export const dynamic = 'force-dynamic';

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = getAdmin();
  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('invite_code', code)
    .maybeSingle();

  if (!challenge) {
    return (
      <Notice
        title="Invite not found"
        body="This invite link isn’t valid. Ask whoever sent it to share a fresh one."
      />
    );
  }

  return (
    <JoinForm
      code={challenge.invite_code}
      challengeName={challenge.name}
      dailyGoal={challenge.daily_goal}
      durationDays={challenge.duration_days}
    />
  );
}
