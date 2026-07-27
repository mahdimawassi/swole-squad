import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getChallengeByCode, getUserByEmail, getUserByToken } from '@/lib/data';
import { AVATAR_COLORS, normalizeCode } from '@/lib/challenge';
import { sendAccessLink, isEmail, emailEnabled } from '@/lib/email';

function mask(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return 'your inbox';
  const head = local.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = normalizeCode(String(body?.code ?? ''));
    const token = String(body?.token ?? '');
    const name = String(body?.name ?? '').trim().slice(0, 40);
    const email = String(body?.email ?? '').trim().toLowerCase();
    const color = AVATAR_COLORS.some((c) => c.hex === body?.avatar_color)
      ? String(body.avatar_color)
      : AVATAR_COLORS[0].hex;

    // Reject a malformed email before touching the database.
    if (email && !isEmail(email)) {
      return NextResponse.json({ error: 'That email looks off.' }, { status: 400 });
    }

    const challenge = await getChallengeByCode(code);
    if (!challenge) return NextResponse.json({ error: 'That challenge was not found.' }, { status: 404 });

    const supabase = getAdmin();
    const origin = new URL(req.url).origin;

    // 1. Already known on this device: straight in, no questions.
    let user = token ? await getUserByToken(token) : null;
    let emailedInstead = false;
    let isNewUser = false;

    // 2. Otherwise, match on email so one person stays one user.
    if (!user && email) {
      if (!isEmail(email)) return NextResponse.json({ error: 'That email looks off.' }, { status: 400 });
      const existing = await getUserByEmail(email);
      if (existing) {
        user = existing;
        // Someone typed an email that already belongs to a squad member. Do not
        // hand over the account, mail the link to the address on file instead.
        emailedInstead = emailEnabled();
      }
    }

    // 3. Brand new person.
    if (!user) {
      if (!name) return NextResponse.json({ error: 'Enter a name.' }, { status: 400 });
      // A new person must give an email. It is what lets them get back in from
      // another phone or browser instead of accidentally creating a second profile.
      if (!email) return NextResponse.json({ error: 'Enter your email.' }, { status: 400 });
      if (!isEmail(email)) return NextResponse.json({ error: 'That email looks off.' }, { status: 400 });
      const { data: created, error } = await supabase
        .from('users')
        .insert({ name, avatar_color: color, email: email || null })
        .select('*')
        .single();
      if (error || !created) return NextResponse.json({ error: 'Could not create your profile.' }, { status: 500 });
      user = created;
      isNewUser = true;
    }

    if (!user) return NextResponse.json({ error: 'Could not create your profile.' }, { status: 500 });

    // Add them to the challenge, or un-remove them if they were kicked before.
    // joinedNow tracks whether their membership actually changed on THIS request.
    let joinedNow = false;
    const { data: existingRow } = await supabase
      .from('participants')
      .select('id, removed_at')
      .eq('challenge_id', challenge.id)
      .eq('user_id', user.id)
      .maybeSingle();

    // When the creator has turned sharing off, existing members still get in,
    // but nobody new (and nobody previously removed) can join.
    const alreadyActiveMember = Boolean(existingRow && !existingRow.removed_at);
    if (challenge.sharing_enabled === false && !alreadyActiveMember) {
      return NextResponse.json(
        { error: 'This challenge is locked. Ask the creator to turn sharing back on.' },
        { status: 403 },
      );
    }

    if (existingRow) {
      if (existingRow.removed_at) {
        await supabase.from('participants').update({ removed_at: null }).eq('id', existingRow.id);
        joinedNow = true; // rejoining after being removed counts as a fresh join
      }
      // Already an active member re-opening the link: nothing changed, no email.
    } else {
      const { error: pErr } = await supabase
        .from('participants')
        .insert({ challenge_id: challenge.id, user_id: user.id });
      if (pErr) return NextResponse.json({ error: 'Could not add you to the challenge.' }, { status: 500 });
      joinedNow = true;
    }

    const link = `${origin}/me/${user.secret_token}`;

    // Only email when there is a real reason to: a brand new person, or a genuine
    // new membership. An existing member simply opening their link gets nothing.
    if (user.email && (isNewUser || joinedNow)) {
      await sendAccessLink({
        to: user.email,
        name: user.name,
        link,
        challengeName: challenge.name,
        inviteUrl: `${origin}/join/${challenge.invite_code}`,
      });
    }

    if (emailedInstead) {
      return NextResponse.json({ emailed: true, masked: mask(user.email ?? email) });
    }

    return NextResponse.json({ token: user.secret_token });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
