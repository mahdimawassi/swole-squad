import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Point every page under /me/<token> at that person's own manifest, so
// "Add to Home Screen" saves their personal link rather than the generic one.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return { manifest: `/manifest/${token}` };
}

export default function MeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
