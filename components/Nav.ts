'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Prefetch the routes a user is most likely to hit next, so navigation feels
// instant instead of waiting on a cold server render. Call once per screen.
export function usePrefetch(paths: string[]) {
  const router = useRouter();
  useEffect(() => {
    for (const p of paths) {
      try {
        router.prefetch(p);
      } catch {
        // ignore
      }
    }
  }, [router, paths.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
}
