import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { sendRaw, emailEnabled } from '@/lib/email';
import { isEmail } from '@/lib/challenge';

export const dynamic = 'force-dynamic';

// Diagnostics. Open in a browser:
//   /api/email-test?secret=YOUR_CRON_SECRET             -> just report configuration
//   /api/email-test?secret=...&to=you@example.com       -> also attempt a real send
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (secret && url.searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'Add ?secret=YOUR_CRON_SECRET to this address.' }, { status: 401 });
  }

  const from = process.env.EMAIL_FROM ?? '';
  const key = process.env.RESEND_API_KEY ?? '';

  // Resend accepts "name@domain.com" or "Name <name@domain.com>". Anything else fails.
  const bare = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from.trim());
  const named = /^.+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(from.trim());

  const report: Record<string, unknown> = {
    configured: emailEnabled(),
    RESEND_API_KEY: key ? `set (${key.slice(0, 5)}…, ${key.length} chars)` : 'MISSING',
    EMAIL_FROM: from || 'MISSING',
    EMAIL_FROM_looks_valid: bare || named,
    APP_ORIGIN: process.env.APP_ORIGIN || 'not set (links in emails will be broken)',
  };

  if (!bare && !named && from) {
    report.hint = 'EMAIL_FROM must be like hey@yourdomain.com or Swole Squad <hey@yourdomain.com>';
  }

  // How many people would actually receive a reminder right now?
  try {
    const supabase = getAdmin();
    const { count: total } = await supabase.from('users').select('id', { count: 'exact', head: true });
    const { count: optedIn } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('email_reminders', true)
      .eq('email_unsubscribed', false);
    report.users_total = total ?? 0;
    report.users_opted_in_to_reminder_emails = optedIn ?? 0;
    if ((optedIn ?? 0) === 0) {
      report.why_no_reminders =
        'Reminder emails are opt-in since v6, and nobody has switched them on. Turn them on under Profile > Email Preferences.';
    }
  } catch (err) {
    report.database = err instanceof Error ? err.message : 'could not read';
  }

  const to = url.searchParams.get('to');
  if (to) {
    if (!isEmail(to)) {
      return NextResponse.json({ ...report, test: 'that "to" address looks wrong' }, { status: 400 });
    }
    const result = await sendRaw(
      to,
      'Swole Squad test email 💪',
      '<div style="font-family:Helvetica,Arial,sans-serif;padding:20px"><h2>It works.</h2><p>If you can read this, your email settings are correct.</p></div>',
    );
    report.test = result.ok ? `Sent to ${to}. Check the inbox and spam.` : 'FAILED';
    report.test_status = result.status;
    report.test_detail = result.detail?.slice(0, 500);
  } else {
    report.tip = 'Add &to=your@email.com to this address to send yourself a real test email.';
  }

  return NextResponse.json(report, { status: 200 });
}
