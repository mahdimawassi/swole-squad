import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getChallengeByCode, getUserByEmail, getUserByToken } from '@/lib/data';
import { AVATAR_COLORS, makeInviteCode, normalizeCode, isValidGoalMode, addDays } from '@/lib/challenge';
import { sendAccessLink, isEmail } from '@/lib/email';

// GET /api/challenge?code=ABC123  -> does this code exist?
export async function GET(req: Request) {
  try {
    const code = normalizeCode(new URL(req.url).searchParams.get('code') ?? '');
    if (!code) return NextResponse.json({ found: false }, { status: 400 });
    const challenge = await getChallengeByCode(code);
    if (!challenge) return NextResponse.json({ found: false }, { status: 404 });
    return NextResponse.json({ found: true, invite_code: challenge.invite_code, name: challenge.name });
  } catch {
    return NextResponse.json({ found: false, error: 'Something went wrong.' }, { status: 500 });
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/challenge -> create a challenge (and the creator, if they are new)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const activity = String(body?.activity ?? '').trim().slice(0, 40);
    const unit = String(body?.unit_label ?? 'reps').trim().slice(0, 16) || 'reps';
    const mode = body?.goal_mode;
    const goalAmount = Number(body?.goal_amount);
    const duration = Math.floor(Number(body?.duration_days));
    const start = String(body?.start_date ?? '');
    const name = String(body?.name ?? '').trim().slice(0, 60) || `${duration}-Day ${activity} Challenge`;

    const creatorName = String(body?.creator?.name ?? '').trim().slice(0, 40);
    const creatorEmailRaw = String(body?.creator?.email ?? '').trim().toLowerCase();
    const creatorColor = AVATAR_COLORS.some((c) => c.hex === body?.creator?.avatar_color)
      ? String(body.creator.avatar_color)
      : AVATAR_COLORS[0].hex;

    if (!activity) return NextResponse.json({ error: 'Pick an activity.' }, { status: 400 });
    if (!creatorName) return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
    if (!isValidGoalMode(mode)) return NextResponse.json({ error: 'Bad goal mode.' }, { status: 400 });
    if (!Number.isFinite(goalAmount) || goalAmount <= 0 || goalAmount > 10_000_000) {
      return NextResponse.json({ error: 'Goal must be a positive number.' }, { status: 400 });
    }
    if (!Number.isFinite(duration) || duration < 1 || duration > 365) {
      return NextResponse.json({ error: 'Length must be between 1 and 365 days.' }, { status: 400 });
    }
    if (!DATE_RE.test(start)) return NextResponse.json({ error: 'Bad start date.' }, { status: 400 });
    if (creatorEmailRaw && !isEmail(creatorEmailRaw)) {
      return NextResponse.json({ error: 'That email looks off.' }, { status: 400 });
    }

    const supabase = getAdmin();

    // Reuse the existing user where we can, so one person is one user.
    let user = null;
    const bodyToken = body?.creator?.token ? String(body.creator.token) : '';
    if (bodyToken) user = await getUserByToken(bodyToken);
    if (!user && creatorEmailRaw) user = await getUserByEmail(creatorEmailRaw);

    if (!user) {
      const { data: created, error: uErr } = await supabase
        .from('users')
        .insert({ name: creatorName, avatar_color: creatorColor, email: creatorEmailRaw || null })
        .select('*')
        .single();
      if (uErr || !created) return NextResponse.json({ error: 'Could not create your profile.' }, { status: 500 });
      user = created;
    }

    // Unique invite code, with a few retries in the (unlikely) event of a clash.
    let challenge = null;
    for (let attempt = 0; attempt < 6 && !challenge; attempt += 1) {
      const code = makeInviteCode(6);
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          name,
          activity,
          unit_label: unit,
          goal_mode: mode,
          goal_amount: goalAmount,
          start_date: start,
          duration_days: duration,
          end_date: addDays(start, duration - 1),
          invite_code: code,
          created_by: user.id,
        })
        .select('*')
        .single();
      if (!error && data) challenge = data;
      else if (error && error.code !== '23505') {
        return NextResponse.json({ error: 'Could not create the challenge.' }, { status: 500 });
      }
    }
    if (!challenge) return NextResponse.json({ error: 'Could not create the challenge.' }, { status: 500 });

    const { error: pErr } = await supabase
      .from('participants')
      .insert({ challenge_id: challenge.id, user_id: user.id });
    if (pErr) return NextResponse.json({ error: 'Challenge made, but could not add you to it.' }, { status: 500 });

    if (creatorEmailRaw) {
      const origin = new URL(req.url).origin;
      await sendAccessLink({
        to: creatorEmailRaw,
        name: user.name,
        link: `${origin}/me/${user.secret_token}`,
        challengeName: challenge.name,
        inviteUrl: `${origin}/join/${challenge.invite_code}`,
      });
    }

    return NextResponse.json({ token: user.secret_token, invite_code: challenge.invite_code, id: challenge.id });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
