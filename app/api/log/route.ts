import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken, getChallengeById } from '@/lib/data';
import { daysBetween } from '@/lib/challenge';
import { evaluateAndAward } from '@/lib/progress';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const challengeId = String(body?.challenge_id ?? '');
    const amount = Number(body?.amount);
    const day = String(body?.day ?? '');
    const mode = body?.mode === 'set' ? 'set' : 'add';

    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
    if (!challengeId) return NextResponse.json({ error: 'Missing challenge.' }, { status: 400 });
    if (!DATE_RE.test(day)) return NextResponse.json({ error: 'Bad date.' }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
      return NextResponse.json({ error: 'Enter a sensible number.' }, { status: 400 });
    }
    if (mode === 'add' && amount <= 0) {
      return NextResponse.json({ error: 'Enter a number above zero.' }, { status: 400 });
    }

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const challenge = await getChallengeById(challengeId);
    if (!challenge) return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });

    // No logging outside the challenge window.
    if (daysBetween(challenge.start_date, day) < 0 || daysBetween(day, challenge.end_date) < 0) {
      return NextResponse.json({ error: 'That day is outside the challenge.' }, { status: 400 });
    }

    const supabase = getAdmin();
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .is('removed_at', null)
      .maybeSingle();

    if (!participant) return NextResponse.json({ error: 'You are not in this challenge.' }, { status: 403 });

    const { error } = await supabase.rpc('log_amount', {
      p_pid: participant.id,
      p_day: day,
      p_amount: amount,
      p_mode: mode,
    });
    if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });

    // Remember what time it was for THEM, which is what the early bird and night
    // owl badges key off. Only the first log of a day sets it.
    const hour = Math.floor(Number(body?.local_hour));
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
      await supabase
        .from('logs')
        .update({ local_hour: hour })
        .eq('participant_id', participant.id)
        .eq('day_date', day)
        .is('local_hour', null);
    }

    // Badges are checked after every log, so unlocking one is immediate.
    let awarded = { newBadges: [] as string[], newBoxes: 0 };
    try {
      awarded = await evaluateAndAward(user.id);
    } catch {
      // Never let the celebration layer break the actual logging.
    }

    return NextResponse.json({ ok: true, ...awarded });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
