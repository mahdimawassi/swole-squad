import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/data';
import { openBox } from '@/lib/progress';

// Open one loot box.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const boxId = String(body?.box_id ?? '');
    if (!token || !boxId) return NextResponse.json({ error: 'Missing information.' }, { status: 400 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const { item, error } = await openBox(user.id, boxId);
    if (!item) return NextResponse.json({ error: error ?? 'Could not open it.' }, { status: 400 });

    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
