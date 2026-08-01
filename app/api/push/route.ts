import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken } from '@/lib/data';
import { pushEnabled } from '@/lib/push';

// GET -> the public VAPID key the browser needs to subscribe.
export async function GET() {
  if (!pushEnabled()) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, key: process.env.VAPID_PUBLIC_KEY });
}

// POST -> save (or refresh) this device's subscription.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const sub = body?.subscription;

    const endpoint = String(sub?.endpoint ?? '');
    const p256dh = String(sub?.keys?.p256dh ?? '');
    const auth = String(sub?.keys?.auth ?? '');

    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Incomplete subscription.' }, { status: 400 });
    }

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const supabase = getAdmin();
    // Endpoint is unique, so re-subscribing the same device just updates it.
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: String(body?.user_agent ?? '').slice(0, 300) || null,
        last_used: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );

    if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// DELETE -> turn reminders off on this device.
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const endpoint = String(body?.endpoint ?? '');
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint.' }, { status: 400 });

    const supabase = getAdmin();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
