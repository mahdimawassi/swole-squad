import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken } from '@/lib/data';

// Dismiss one notification, or clear the lot.
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const id = body?.id ? String(body.id) : null;
    const all = body?.all === true;

    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
    if (!id && !all) return NextResponse.json({ error: 'Nothing to remove.' }, { status: 400 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const supabase = getAdmin();
    const query = supabase.from('notifications').delete().eq('user_id', user.id);
    const { error } = all ? await query : await query.eq('id', id as string);
    if (error) return NextResponse.json({ error: 'Could not remove that.' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
