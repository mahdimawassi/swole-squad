import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { computeStats, needsYouToday, todayStr, goalLabel, emojiFor } from '@/lib/challenge';
import type { Challenge, Member, LogRow } from '@/lib/types';
import { emailEnabled } from '@/lib/email';
import { sendPushToUser, pushEnabled } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Midday reminder. Vercel Cron calls this on a schedule (see vercel.json).
// For each ACTIVE daily-goal challenge, it emails members who have not yet met
// today's target and have not opted out, at most once per person per day.
async function run(): Promise<{ pushed: number; emailed: number; skipped: number }> {
  // Nothing to do if neither channel is configured.
  if (!emailEnabled() && !pushEnabled()) return { pushed: 0, emailed: 0, skipped: 0 };

  const supabase = getAdmin();
  const today = todayStr();
  let pushed = 0;
  let emailed = 0;
  let skipped = 0;

  // Active challenges only, and only daily goals (a "total" goal has no daily duty).
  const { data: challengeRows } = await supabase
    .from('challenges')
    .select('*')
    .eq('goal_mode', 'daily')
    .lte('start_date', today)
    .gte('end_date', today);

  const challenges = (challengeRows ?? []) as Challenge[];

  for (const challenge of challenges) {
    const { data: partRows } = await supabase
      .from('participants')
      .select('id, user_id, users(name, email, avatar_color, email_reminders, email_unsubscribed, push_reminders)')
      .eq('challenge_id', challenge.id)
      .is('removed_at', null);

    const parts = (partRows ?? []) as unknown as {
      id: string;
      user_id: string;
      users:
        | { name: string; email: string | null; avatar_color: string; email_reminders: boolean; email_unsubscribed: boolean; push_reminders: boolean }
        | { name: string; email: string | null; avatar_color: string; email_reminders: boolean; email_unsubscribed: boolean; push_reminders: boolean }[]
        | null;
    }[];
    if (parts.length === 0) continue;

    const members: Member[] = parts.map((p) => {
      const u = Array.isArray(p.users) ? p.users[0] : p.users;
      return {
        participant_id: p.id,
        user_id: p.user_id,
        name: u?.name ?? 'Someone',
        avatar_color: u?.avatar_color ?? '#4D7CFF',
      };
    });

    const pids = members.map((m) => m.participant_id);
    const { data: logRows } = await supabase.from('logs').select('*').in('participant_id', pids);
    const logs = (logRows ?? []) as LogRow[];
    const stats = computeStats(members, logs, today);

    for (const p of parts) {
      const u = Array.isArray(p.users) ? p.users[0] : p.users;
      if (!u) {
        skipped += 1;
        continue;
      }
      const st = stats.find((s) => s.member.participant_id === p.id);
      const todayAmount = st?.today ?? 0;
      const total = st?.total ?? 0;
      if (!needsYouToday(challenge, todayAmount, total, today)) {
        skipped += 1;
        continue;
      }

      // Once per person per day: reminder_log's primary key blocks a second send.
      const { error: claimErr } = await supabase
        .from('reminder_log')
        .insert({ participant_id: p.id, day_date: today });
      if (claimErr) {
        skipped += 1; // already sent today
        continue;
      }

      const origin = process.env.APP_ORIGIN || '';
      const token = await tokenFor(p.user_id);
      const link = origin ? `${origin}/me/${token}` : '';

      // Prefer a phone notification. It gets seen, it is free, and it keeps the
      // inbox quiet. Email is the fallback for anyone who has not enabled push.
      const delivered = u.push_reminders === false ? 0 : await sendPushToUser(p.user_id, {
        title: `${emojiFor(challenge.activity)} Still to do today`,
        body: `You have not hit today's goal in ${challenge.name}: ${goalLabel(challenge)}. Do not break the streak.`,
        url: link || '/',
        tag: `remind-${challenge.id}`,
      });

      if (delivered > 0) {
        // A phone notification landed, so no email. Push is the opt-in.
        pushed += 1;
      } else if (u.email && u.email_reminders && !u.email_unsubscribed && emailEnabled()) {
        await sendReminder(u.email, u.name, challenge, link, token);
        emailed += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return { pushed, emailed, skipped };
}

async function tokenFor(userId: string): Promise<string> {
  const supabase = getAdmin();
  const { data } = await supabase.from('users').select('secret_token').eq('id', userId).maybeSingle();
  return data?.secret_token ?? '';
}

async function sendReminder(
  to: string,
  name: string,
  challenge: Challenge,
  link: string,
  token: string,
): Promise<void> {
  const INK = '#141414';
  const origin = process.env.APP_ORIGIN || '';
  const button = link
    ? `<a href="${link}" style="display:inline-block;background:#37C871;color:#fff;text-decoration:none;border:3px solid ${INK};border-radius:14px;padding:13px 20px;font-weight:900;font-size:16px">LOG IT NOW →</a>`
    : '';
  const html = `<div style="background:#FFE066;padding:28px 16px;font-family:Helvetica,Arial,sans-serif;color:${INK}">
    <div style="max-width:460px;margin:0 auto;background:#fff;border:3px solid ${INK};border-radius:20px;padding:24px">
      <div style="font-size:22px;font-weight:900;margin-bottom:12px">${emojiFor(challenge.activity)} STILL TO DO TODAY</div>
      <p style="font-size:16px;font-weight:600;margin:0 0 8px">Hey ${escapeHtml(name)},</p>
      <p style="font-size:15px;font-weight:500;margin:0 0 18px">You haven't hit today's goal in <b>${escapeHtml(challenge.name)}</b> yet: ${escapeHtml(goalLabel(challenge))}. Half the day's gone, don't break the streak.</p>
      ${button}
      <p style="font-size:11px;opacity:.6;margin:20px 0 0">
        <a href="${origin}/me/${token}/email" style="color:#141414">Change what we email you</a>
      </p>
    </div>
  </div>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject: `Don't break your streak 💪`,
        html,
        headers: origin
          ? { 'List-Unsubscribe': `<${origin}/me/${token}/email>` }
          : undefined,
      }),
    });
  } catch {
    // best effort
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function authorized(req: Request): boolean {
  // Vercel Cron sends this header. If CRON_SECRET is set, require it; otherwise
  // allow (still safe, since it only sends the same reminders once per day).
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await run();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // A scheduled job should report a problem, not crash the deployment.
    const message = err instanceof Error ? err.message : 'Reminder run failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
