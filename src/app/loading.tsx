import { PageShell } from '@/components/page-shell';
import { getLanguage, dictionary } from '@/lib/i18n/dictionaries';

export default async function Loading() {
  const lang = await getLanguage();
  const t = dictionary[lang];

  return (
    <PageShell lang={lang}>
      <section className='mb-4 rounded-2xl border border-border bg-card p-5 md:p-6'>
        <div className='h-7 w-48 animate-pulse rounded-lg bg-muted' />
        <div className='mt-2 h-4 w-64 animate-pulse rounded-lg bg-muted' />
        <div className='mt-4 flex flex-wrap gap-3'>
          <div className='h-11 w-28 animate-pulse rounded-xl bg-muted' />
          <div className='h-11 w-32 animate-pulse rounded-xl bg-muted' />
        </div>
      </section>
      <div className='grid gap-4 md:grid-cols-2'>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`${t.feedTitle}-skeleton-${index}`}
            className='rounded-2xl border border-border bg-card p-5 shadow-sm'
          >
            <div className='mb-3 flex flex-wrap gap-2'>
              <div className='h-6 w-20 animate-pulse rounded-full bg-muted' />
              <div className='h-6 w-24 animate-pulse rounded-full bg-muted' />
              <div className='h-6 w-16 animate-pulse rounded-full bg-muted' />
            </div>
            <div className='h-5 w-3/5 animate-pulse rounded-lg bg-muted' />
            <div className='mt-3 h-4 w-full animate-pulse rounded-lg bg-muted' />
            <div className='mt-2 h-4 w-4/5 animate-pulse rounded-lg bg-muted' />
            <div className='mt-3 h-3 w-32 animate-pulse rounded-lg bg-muted' />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
