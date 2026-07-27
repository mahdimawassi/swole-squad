import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken, getUserByEmail } from '@/lib/data';
import { AVATAR_COLORS, isEmail } from '@/lib/challenge';
import { AVATAR_KEYS } from '@/components/SwoleGuy';
import { sendAccessLink } from '@/lib/email';

// Update your own profile: name, email, avatar colour.
// Adding or changing an email sends the access link to the new address.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 });

    // Check the shape of the input first, so bad data never costs a database call.
    const nextName = body?.name !== undefined ? String(body.name).trim().slice(0, 40) : undefined;
    const nextColor = body?.avatar_color !== undefined ? String(body.avatar_color) : undefined;
    const nextStyle = body?.avatar_style !== undefined ? String(body.avatar_style) : undefined;
    const nextEmail = body?.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;

    if (nextName !== undefined && !nextName) {
      return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
    }
    if (nextColor !== undefined && !AVATAR_COLORS.some((c) => c.hex === nextColor)) {
      return NextResponse.json({ error: 'Pick one of the offered colours.' }, { status: 400 });
    }
    if (nextStyle !== undefined && !AVATAR_KEYS.includes(nextStyle)) {
      return NextResponse.json({ error: 'Pick one of the offered avatars.' }, { status: 400 });
    }
    if (nextEmail !== undefined && !isEmail(nextEmail)) {
      return NextResponse.json({ error: 'That email looks off.' }, { status: 400 });
    }

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const patch: Record<string, string | boolean> = {};

    if (nextName !== undefined && nextName !== user.name) patch.name = nextName;
    if (nextColor !== undefined && nextColor !== user.avatar_color) patch.avatar_color = nextColor;
    if (nextStyle !== undefined && nextStyle !== (user.avatar_style ?? 'classic')) patch.avatar_style = nextStyle;

    let emailChanged = false;
    if (nextEmail !== undefined) {
      const email = nextEmail;
      if (email !== (user.email ?? '')) {
        const taken = await getUserByEmail(email);
        if (taken && taken.id !== user.id) {
          return NextResponse.json(
            { error: 'Someone in the squad already uses that email.' },
            { status: 409 },
          );
        }
        patch.email = email;
        emailChanged = true;
      }
    }

    if (body?.reminders_opt_out !== undefined) {
      const val = Boolean(body.reminders_opt_out);
      if (val !== (user.reminders_opt_out === true)) patch.reminders_opt_out = val;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, changed: false, emailed: false });
    }

    const supabase = getAdmin();
    const { data: updated, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      // 23505 = the unique index caught a race between two people claiming an email.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Someone in the squad already uses that email.' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: 'Could not save your changes.' }, { status: 500 });
    }

    let emailed = false;
    if (emailChanged && updated?.email) {
      const origin = new URL(req.url).origin;
      emailed = await sendAccessLink({
        to: updated.email,
        name: updated.name,
        link: `${origin}/me/${updated.secret_token}`,
      });
    }

    return NextResponse.json({
      ok: true,
      changed: true,
      emailed,
      name: updated?.name,
      email: updated?.email,
      avatar_color: updated?.avatar_color,
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
