import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken, getChallengeById } from '@/lib/data';
import { makeInviteCode, todayStr, addDays } from '@/lib/challenge';

// "Run it back": clone a finished challenge with the same settings, starting
// today. This is the answer to the day-after-it-ends cliff, where a group would
// otherwise just drift apart.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const challengeId = String(body?.challenge_id ?? '');
    if (!token || !challengeId) return NextResponse.json({ error: 'Missing information.' }, { status: 400 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const old = await getChallengeById(challengeId);
    if (!old) return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });

    const supabase = getAdmin();

    // Anyone who was in it can restart it, not only the original creator: often
    // the person keenest to go again is not the one who set it up.
    const { data: wasIn } = await supabase
      .from('participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!wasIn) return NextResponse.json({ error: 'You were not in that challenge.' }, { status: 403 });

    const start = todayStr();
    let created = null;
    for (let attempt = 0; attempt < 6 && !created; attempt += 1) {
      const code = makeInviteCode(6);
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          name: nextName(old.name),
          activity: old.activity,
          unit_label: old.unit_label,
          goal_mode: old.goal_mode,
          goal_amount: old.goal_amount,
          start_date: start,
          duration_days: old.duration_days,
          end_date: addDays(start, old.duration_days - 1),
          invite_code: code,
          created_by: user.id,
          group_chat_url: old.group_chat_url ?? null,
        })
        .select('*')
        .single();
      if (!error && data) created = data;
      else if (error && error.code !== '23505') {
        return NextResponse.json({ error: 'Could not start the rematch.' }, { status: 500 });
      }
    }
    if (!created) return NextResponse.json({ error: 'Could not start the rematch.' }, { status: 500 });

    const { error: pErr } = await supabase
      .from('participants')
      .insert({ challenge_id: created.id, user_id: user.id });
    if (pErr) return NextResponse.json({ error: 'Made it, but could not add you.' }, { status: 500 });

    return NextResponse.json({ ok: true, id: created.id, invite_code: created.invite_code, name: created.name });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// "The Hundo" -> "The Hundo II" -> "The Hundo III" ...
function nextName(name: string): string {
  const m = name.match(/^(.*?)\s+(I{1,3}|IV|V|VI{0,3}|IX|X)$/);
  const romans = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  if (!m) return `${name} II`.slice(0, 60);
  const idx = romans.indexOf(m[2]);
  const next = idx >= 0 && idx + 1 < romans.length ? romans[idx + 1] : 'II';
  return `${m[1]} ${next}`.slice(0, 60);
}
