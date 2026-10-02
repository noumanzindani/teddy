'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

/**
 * Client-side auth gate for the dashboard. Replaces the old Next middleware
 * (unavailable with `output: 'export'`): if there's no staff token, redirect to
 * /login; otherwise render the protected content.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
    } else {
      setAuthed(true);
    }
  }, [router]);

  if (!authed) return null;
  return <>{children}</>;
}
