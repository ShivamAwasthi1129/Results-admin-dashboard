'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DisastersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to live-disasters page
    router.replace('/dashboard/live-disasters');
  }, [router]);

  return null;
}
