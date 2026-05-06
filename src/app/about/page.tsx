import { PageShell } from '@/components/page-shell';
import { getLanguage, dictionary } from '@/lib/i18n/dictionaries';
import { legalContent } from '@/lib/legal-content';

export default async function AboutPage() {
  const lang = await getLanguage();
  const t = dictionary[lang];
  const legal = legalContent[lang];
  return (
    <PageShell lang={lang}>
      <h1 className='text-2xl font-semibold'>
        {lang === 'tr' ? 'Hakkında' : 'About'}
      </h1>
      <p className='mt-3'>{t.disclaimer}</p>
      <p className='mt-3'>
        {lang === 'tr'
          ? 'Amaç: mahalle sorunları, çözümler, sosyal paylaşım, resmi veriler ve kolektif iyileştirme.'
          : 'Purpose: neighborhood problems, solutions, social sharing, official data, and collective improvement.'}
      </p>

      <section
        id='terms'
        className='mt-8 rounded-2xl border border-border bg-card p-5'
      >
        <h2 className='text-lg font-semibold'>
          {lang === 'tr' ? 'Kullanım Koşulları' : 'Terms'}
        </h2>
        <pre className='mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground'>
          {legal.terms}
        </pre>
      </section>

      <section
        id='privacy'
        className='mt-4 rounded-2xl border border-border bg-card p-5'
      >
        <h2 className='text-lg font-semibold'>
          {lang === 'tr' ? 'Gizlilik' : 'Privacy'}
        </h2>
        <pre className='mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground'>
          {legal.privacy}
        </pre>
      </section>
    </PageShell>
  );
}
