import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken } from '@/lib/data';

// Email preferences. The access link is transactional and has no toggle: it is
// how someone recovers their account, so switching it off would lock them out.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const patch: Record<string, boolean> = {};
    if (body?.email_reminders !== undefined) patch.email_reminders = Boolean(body.email_reminders);
    if (body?.email_activity !== undefined) patch.email_activity = Boolean(body.email_activity);
    if (body?.email_unsubscribed !== undefined) {
      patch.email_unsubscribed = Boolean(body.email_unsubscribed);
      // Unsubscribing from everything switches the individual toggles off too,
      // so the preferences screen cannot show a contradictory state.
      if (patch.email_unsubscribed) {
        patch.email_reminders = false;
        patch.email_activity = false;
      }
    }

    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, changed: false });

    const supabase = getAdmin();
    const { error } = await supabase.from('users').update(patch).eq('id', user.id);
    if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });

    return NextResponse.json({ ok: true, changed: true, ...patch });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
