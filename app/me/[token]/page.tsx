import { getAdmin } from '@/lib/supabaseAdmin';
import Dashboard from '@/components/Dashboard';
import Notice from '@/components/Notice';
import type { Participant, LogRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getAdmin();

  const { data: me } = await supabase.from('participants').select('*').eq('secret_token', token).maybeSingle();
  if (!me) {
    return (
      <Notice
        title="We can’t find your spot"
        body="This link may be broken. Try the invite link again, or ask a squad-mate to re-share it."
      />
    );
  }

  const { data: challenge } = await supabase.from('challenges').select('*').eq('id', me.challenge_id).maybeSingle();
  if (!challenge) {
    return <Notice title="Challenge missing" body="This challenge no longer exists." />;
  }

  const { data: squadData } = await supabase
    .from('participants')
    .select('*')
    .eq('challenge_id', me.challenge_id)
    .order('created_at', { ascending: true });

  const squad: Participant[] = squadData ?? [me];
  if (!squad.some((p) => p.id === me.id)) squad.push(me);

  const pids = squad.map((p) => p.id);
  const { data: logsData } = await supabase.from('logs').select('*').in('participant_id', pids);
  const logs: LogRow[] = logsData ?? [];

  return <Dashboard token={token} me={me} challenge={challenge} squad={squad} logs={logs} />;
}
