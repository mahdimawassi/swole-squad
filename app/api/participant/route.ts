import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken, getChallengeById } from '@/lib/data';

// Soft-remove someone from a challenge. Creator only.
// Their logs stay in the database, they just drop off the board and can be re-added.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const challengeId = String(body?.challenge_id ?? '');
    const participantId = String(body?.participant_id ?? '');

    if (!token || !challengeId || !participantId) {
      return NextResponse.json({ error: 'Missing information.' }, { status: 400 });
    }

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const challenge = await getChallengeById(challengeId);
    if (!challenge) return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
    if (challenge.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the challenge creator can remove people.' }, { status: 403 });
    }

    const supabase = getAdmin();
    const { data: target } = await supabase
      .from('participants')
      .select('id, user_id')
      .eq('id', participantId)
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (!target) return NextResponse.json({ error: 'That person is not in this challenge.' }, { status: 404 });
    if (target.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('participants')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', participantId);

    if (error) return NextResponse.json({ error: 'Could not remove them.' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
