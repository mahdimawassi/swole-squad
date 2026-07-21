import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const reps = Math.floor(Number(body?.reps));
    const day = String(body?.day ?? '');

    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
    if (!Number.isFinite(reps) || reps <= 0 || reps > 5000) {
      return NextResponse.json({ error: 'Enter a number between 1 and 5000.' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return NextResponse.json({ error: 'Bad date.' }, { status: 400 });
    }

    const supabase = getAdmin();
    const { data: participant, error: pErr } = await supabase
      .from('participants')
      .select('id')
      .eq('secret_token', token)
      .maybeSingle();

    if (pErr) return NextResponse.json({ error: 'Server error. Try again.' }, { status: 500 });
    if (!participant) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const { error: rErr } = await supabase.rpc('add_reps', {
      p_pid: participant.id,
      p_day: day,
      p_reps: reps,
    });

    if (rErr) return NextResponse.json({ error: 'Could not save your reps.' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
