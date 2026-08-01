import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// A per-person manifest. The Home Screen icon has to launch straight into
// /me/<token>, because a Home Screen web app on iPhone gets its own storage
// separate from Safari: nothing we saved in the browser is visible there, so a
// generic start_url would look like a brand new visitor every time.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Only mint a personalised manifest for something that looks like a real token.
  const looksReal = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  const start = looksReal ? `/me/${token}` : '/';

  const manifest = {
    // A distinct id per person, so two people installing on the same phone get
    // two separate apps rather than overwriting each other.
    id: start,
    name: 'Swole Squad',
    short_name: 'Swole Squad',
    description: 'Group fitness challenges with your friends. Log daily, get swole.',
    start_url: start,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFE066',
    theme_color: '#FFE066',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-store',
    },
  });
}
