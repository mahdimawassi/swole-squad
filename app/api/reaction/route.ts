import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken } from '@/lib/data';
import { REACTION_EMOJIS } from '@/lib/challenge';

// Toggle an emoji reaction on another member within a challenge.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const challengeId = String(body?.challenge_id ?? '');
    const toUser = String(body?.to_user ?? '');
    const emoji = String(body?.emoji ?? '');

    if (!token || !challengeId || !toUser) {
      return NextResponse.json({ error: 'Missing information.' }, { status: 400 });
    }
    if (!REACTION_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Unknown reaction.' }, { status: 400 });
    }

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const supabase = getAdmin();

    // Reactor must be an active member of the challenge.
    const { data: me } = await supabase
      .from('participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .is('removed_at', null)
      .maybeSingle();
    if (!me) return NextResponse.json({ error: 'You are not in this challenge.' }, { status: 403 });

    // Target must be a member too (active or removed is fine to react to history).
    const { data: target } = await supabase
      .from('participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', toUser)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'That person is not in this challenge.' }, { status: 404 });

    const { data, error } = await supabase.rpc('toggle_reaction', {
      p_challenge: challengeId,
      p_to: toUser,
      p_from: user.id,
      p_emoji: emoji,
    });
    if (error) return NextResponse.json({ error: 'Could not react.' }, { status: 500 });

    return NextResponse.json({ ok: true, on: data === true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
