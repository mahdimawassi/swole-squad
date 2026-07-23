import { NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/data';
import { sendAccessLink, isEmail, emailEnabled } from '@/lib/email';

// Email someone their access link. Always answers the same way so this
// cannot be used to probe which addresses are registered.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? '').trim().toLowerCase();

    if (!isEmail(email)) return NextResponse.json({ error: 'That email looks off.' }, { status: 400 });
    if (!emailEnabled()) {
      return NextResponse.json({ error: 'Email is not set up on this site yet.' }, { status: 503 });
    }

    const user = await getUserByEmail(email);
    if (user) {
      const origin = new URL(req.url).origin;
      await sendAccessLink({ to: email, name: user.name, link: `${origin}/me/${user.secret_token}` });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
