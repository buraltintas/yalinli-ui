import Link from 'next/link';
import { getLanguage, dictionary } from '@/lib/i18n/dictionaries';
import { PageShell } from '@/components/page-shell';
import { api } from '@/lib/api/server-client';
import { FeedRefresh } from '@/components/feed-refresh';

type RawFeedItem = {
  id?: string;
  ID?: string;
  type?: string;
  Type?: string;
  category?: string;
  Category?: string;
  status?: string;
  Status?: string;
  title?: string;
  Title?: string;
  descriptionPreview?: string;
  DescriptionPreview?: string;
  authorDisplay?: string;
  AuthorDisplay?: string;
  createdAt?: string;
  CreatedAt?: string;
  commentCount?: number;
  CommentCount?: number;
  imageUrls?: string[];
  ImageURLs?: string[];
};

function normalizeFeedItem(item: RawFeedItem) {
  return {
    id: item.id || item.ID || '',
    type: item.type || item.Type || '',
    category: item.category || item.Category || '',
    status: item.status || item.Status || '',
    title: item.title || item.Title || '',
    descriptionPreview:
      item.descriptionPreview || item.DescriptionPreview || '',
    authorDisplay: item.authorDisplay || item.AuthorDisplay || '',
    createdAt: item.createdAt || item.CreatedAt || '',
    commentCount: item.commentCount ?? item.CommentCount ?? 0,
    imageUrls: item.imageUrls || item.ImageURLs || [],
  };
}

const typeLabels = {
  tr: {
    problem: 'Sorun',
    beauty: 'Güzellikler',
    request: 'İstek',
    suggestion: 'Öneri',
    event: 'Etkinlik',
    resolved_problem: 'Çözüldü',
    announcement: 'Duyuru',
  },
  en: {
    problem: 'Problem',
    beauty: 'Beauties',
    request: 'Request',
    suggestion: 'Suggestion',
    event: 'Event',
    resolved_problem: 'Resolved',
    announcement: 'Announcement',
  },
} as const;

const categoryLabels = {
  tr: {
    infrastructure: 'Altyapı',
    environment: 'Çevre',
    transport: 'Ulaşım',
    safety: 'Güvenlik',
    social: 'Sosyal',
    animals: 'Sokak Hayvanları',
    cleaning: 'Temizlik',
    other: 'Diğer',
  },
  en: {
    infrastructure: 'Infrastructure',
    environment: 'Environment',
    transport: 'Transport',
    safety: 'Safety',
    social: 'Social',
    animals: 'Street Animals',
    cleaning: 'Cleaning',
    other: 'Other',
  },
} as const;

const statusLabels = {
  tr: {
    resolved: 'Çözüldü',
    reported: 'İncelemede',
    pending_review: 'İncelemede',
  },
  en: {
    resolved: 'Resolved',
    reported: 'Under review',
    pending_review: 'Under review',
  },
} as const;

function labelFor<T extends Record<'tr' | 'en', Record<string, string>>>(
  labels: T,
  lang: 'tr' | 'en',
  value: string,
) {
  return labels[lang][value] || value;
}

function formatFeedDate(value: string, lang: 'tr' | 'en') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function Home() {
  const lang = await getLanguage();
  const t = dictionary[lang];
  const data = (await api.get('/v1/feed').catch(() => ({ items: [] }))) as {
    items?: RawFeedItem[];
  };
  const items = (data.items || [])
    .map(normalizeFeedItem)
    .filter((item) => item.id);

  return (
    <PageShell lang={lang}>
      <section className='mb-4 rounded-2xl border border-border bg-card p-5 md:p-6'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              {t.feedTitle}
            </h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              {t.feedSubtitle}
            </p>
          </div>
          <FeedRefresh label={lang === 'tr' ? 'Yenile' : 'Refresh'} />
        </div>
        <div className='mt-4 flex flex-wrap gap-3'>
          <Link
            href='/submit'
            className='inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold leading-none text-primary-foreground shadow-sm hover:opacity-95'
          >
            {t.submit}
          </Link>
          <Link
            href='/petitions'
            className='inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold leading-none hover:bg-muted'
          >
            {t.petitions}
          </Link>
        </div>
      </section>
      {items.length === 0 ? (
        <p className='rounded-2xl border border-border bg-card p-6 text-muted-foreground'>
          {t.noPosts}
        </p>
      ) : null}
      <div className='grid gap-4 md:grid-cols-2'>
        {items.map((item) => {
          const createdAt = formatFeedDate(item.createdAt, lang);
          return (
            <Link
              key={item.id}
              href={`/entries/${item.id}`}
              className='flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-transform hover:-translate-y-0.5'
            >
              <div className='mb-3 flex flex-wrap gap-2 text-xs font-semibold'>
                <span className='rounded-full bg-primary/10 px-2.5 py-1 text-primary'>
                  {labelFor(typeLabels, lang, item.type)}
                </span>
                <span className='rounded-full bg-accent/10 px-2.5 py-1 text-accent'>
                  {labelFor(categoryLabels, lang, item.category)}
                </span>
              </div>
              <h2 className='text-lg font-semibold tracking-tight'>
                {item.title}
              </h2>
              {item.imageUrls.length > 0 ? (
                <div className='mt-3 grid grid-cols-3 gap-2 overflow-hidden rounded-xl'>
                  {item.imageUrls.slice(0, 3).map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=''
                      className='h-24 w-full rounded-lg object-cover'
                    />
                  ))}
                </div>
              ) : null}
              <p className='mt-2 text-sm text-muted-foreground line-clamp-2'>
                {item.descriptionPreview}
              </p>
              <p className='mt-auto pt-3 text-xs text-muted-foreground'>
                {[
                  createdAt,
                  `${item.commentCount} ${lang === 'tr' ? 'yorum' : 'comments'}`,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
