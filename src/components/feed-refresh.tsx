'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

type FeedRefreshProps = {
  label: string;
};

export function FeedRefresh({ label }: FeedRefreshProps) {
  const router = useRouter();

  return (
    <button
      type='button'
      onClick={() => router.refresh()}
      className='inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground'
    >
      <RefreshCw className='h-4 w-4' />
      {label}
    </button>
  );
}
