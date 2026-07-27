import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken, getChallengeById } from '@/lib/data';
import { daysBetween } from '@/lib/challenge';

// Creator-only edits to a challenge: name, goal amount, end date, sharing on/off.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const challengeId = String(body?.challenge_id ?? '');
    if (!token || !challengeId) return NextResponse.json({ error: 'Missing information.' }, { status: 400 });

    // Validate the shapes we can before any database work.
    const nextName = body?.name !== undefined ? String(body.name).trim().slice(0, 60) : undefined;
    const nextGoal = body?.goal_amount !== undefined ? Number(body.goal_amount) : undefined;
    const nextEnd = body?.end_date !== undefined ? String(body.end_date) : undefined;

    if (nextName !== undefined && !nextName) {
      return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
    }
    if (nextGoal !== undefined && (!Number.isFinite(nextGoal) || nextGoal <= 0 || nextGoal > 10_000_000)) {
      return NextResponse.json({ error: 'Goal must be a positive number.' }, { status: 400 });
    }
    if (nextEnd !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(nextEnd)) {
      return NextResponse.json({ error: 'Bad end date.' }, { status: 400 });
    }

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const challenge = await getChallengeById(challengeId);
    if (!challenge) return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
    if (challenge.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the creator can change this challenge.' }, { status: 403 });
    }

    const patch: Record<string, string | number | boolean> = {};

    if (nextName !== undefined) patch.name = nextName;
    if (body?.sharing_enabled !== undefined) patch.sharing_enabled = Boolean(body.sharing_enabled);
    if (nextGoal !== undefined) patch.goal_amount = nextGoal;

    if (nextEnd !== undefined) {
      // Needs the start date, so this check runs after the challenge is loaded.
      const dur = daysBetween(challenge.start_date, nextEnd) + 1;
      if (dur < 1 || dur > 365) {
        return NextResponse.json({ error: 'End date must be within 365 days of the start.' }, { status: 400 });
      }
      patch.end_date = nextEnd;
      patch.duration_days = dur;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, changed: false });
    }

    const supabase = getAdmin();
    const { error } = await supabase.from('challenges').update(patch).eq('id', challengeId);
    if (error) return NextResponse.json({ error: 'Could not save changes.' }, { status: 500 });

    return NextResponse.json({ ok: true, changed: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

