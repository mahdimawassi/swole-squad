import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { AVATAR_COLORS } from '@/lib/challenge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body?.code ?? '');
    const name = String(body?.name ?? '').trim().slice(0, 40);
    const rawColor = String(body?.avatar_color ?? '');

    if (!name) {
      return NextResponse.json({ error: 'Please enter a name.' }, { status: 400 });
    }
    const color = AVATAR_COLORS.some((c) => c.hex === rawColor) ? rawColor : AVATAR_COLORS[0].hex;

    const supabase = getAdmin();
    const { data: challenge, error: cErr } = await supabase
      .from('challenges')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle();

    if (cErr) return NextResponse.json({ error: 'Server error. Try again.' }, { status: 500 });
    if (!challenge) return NextResponse.json({ error: 'That challenge was not found.' }, { status: 404 });

    const { data, error } = await supabase
      .from('participants')
      .insert({ challenge_id: challenge.id, name, avatar_color: color })
      .select('secret_token')
      .single();

    if (error || !data) return NextResponse.json({ error: 'Could not join. Try again.' }, { status: 500 });

    return NextResponse.json({ token: data.secret_token });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
