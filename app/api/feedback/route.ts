import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken } from '@/lib/data';

const FAVORITES = ['avatar', 'leaderboard', 'streaks', 'logging', 'pace'];
const DISAPPOINTMENT = ['very', 'somewhat', 'not'];

function cleanText(v: unknown): string | null {
  const s = String(v ?? '').trim().slice(0, 2000);
  return s ? s : null;
}

function scale(v: unknown): number | null {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? '').trim().slice(0, 40);
    if (!name) return NextResponse.json({ error: 'Add your name so we know who this is.' }, { status: 400 });

    const disappointment = DISAPPOINTMENT.includes(body?.disappointment) ? body.disappointment : null;
    const favorite = FAVORITES.includes(body?.favorite) ? body.favorite : null;

    const row = {
      name,
      keep_using: scale(body?.keep_using),
      disappointment,
      ease: scale(body?.ease),
      confusing: cleanText(body?.confusing),
      broken: cleanText(body?.broken),
      favorite,
      next_thing: cleanText(body?.next_thing),
      other: cleanText(body?.other),
      user_id: null as string | null,
    };

    // Link to their account when we can, so you can see email and challenges too.
    const token = String(body?.token ?? '');
    if (token) {
      const user = await getUserByToken(token);
      if (user) row.user_id = user.id;
    }

    const supabase = getAdmin();
    const { error } = await supabase.from('feedback').insert(row);
    if (error) return NextResponse.json({ error: 'Could not save your feedback.' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
