import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { getUserByToken, getUserItems } from '@/lib/data';
import { ITEM_BY_KEY, SLOT_META, type Slot } from '@/lib/items';

// Put an item on, or take it off (item_key null / empty clears the slot).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '');
    const slot = String(body?.slot ?? '') as Slot;
    const itemKey = body?.item_key ? String(body.item_key) : null;

    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
    if (!(slot in SLOT_META)) return NextResponse.json({ error: 'Unknown slot.' }, { status: 400 });

    // Check the item makes sense before any database work.
    if (itemKey) {
      const item = ITEM_BY_KEY[itemKey];
      if (!item) return NextResponse.json({ error: 'Unknown item.' }, { status: 400 });
      if (item.slot !== slot) {
        return NextResponse.json({ error: 'That item does not go there.' }, { status: 400 });
      }
    }

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: 'We could not find you.' }, { status: 404 });

    const equipped: Record<string, string> = { ...(user.equipped ?? {}) };

    if (itemKey) {
      // You can only wear what you have actually won.
      const owned = await getUserItems(user.id);
      if (!owned.includes(itemKey)) {
        return NextResponse.json({ error: 'You have not unlocked that yet.' }, { status: 403 });
      }
      equipped[slot] = itemKey;
    } else {
      delete equipped[slot];
    }

    const supabase = getAdmin();
    const { error } = await supabase.from('users').update({ equipped }).eq('id', user.id);
    if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });

    return NextResponse.json({ ok: true, equipped });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
