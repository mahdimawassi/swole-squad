import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { evaluateAndAward, grantBox } from '@/lib/progress';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// One-off: award badges to everyone for what they already did before badges
// existed. Safe to run more than once, nothing is granted twice.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getAdmin();
    const { data } = await supabase.from('users').select('id').limit(500);
    const users = (data ?? []) as { id: string }[];

    let badgesAwarded = 0;
    let boxesGranted = 0;

    for (const u of users) {
      await grantBox(u.id, 'welcome');
      const result = await evaluateAndAward(u.id);
      badgesAwarded += result.newBadges.length;
      boxesGranted += result.newBoxes;
    }

    return NextResponse.json({ ok: true, users: users.length, badgesAwarded, boxesGranted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backfill failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
