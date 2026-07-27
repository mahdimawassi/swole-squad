import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken } from '@/lib/data';

// Post a message to a challenge board. Must be an active member.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const challengeId = String(body?.challenge_id ?? '');
    const text = String(body?.body ?? '').trim().slice(0, 500);

    if (!token || !challengeId) return NextResponse.json({ error: 'Missing information.' }, { status: 400 });
    if (!text) return NextResponse.json({ error: 'Type a message first.' }, { status: 400 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const supabase = getAdmin();
    const { data: member } = await supabase
      .from('participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .is('removed_at', null)
      .maybeSingle();
    if (!member) return NextResponse.json({ error: 'You are not in this challenge.' }, { status: 403 });

    const { error } = await supabase
      .from('messages')
      .insert({ challenge_id: challengeId, user_id: user.id, body: text });
    if (error) return NextResponse.json({ error: 'Could not post.' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
