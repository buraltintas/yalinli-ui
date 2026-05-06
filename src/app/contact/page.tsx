import { PageShell } from '@/components/page-shell';
import { getLanguage, dictionary } from '@/lib/i18n/dictionaries';

export default async function ContactPage() {
  const lang = await getLanguage();
  const t = dictionary[lang];
  return (
    <PageShell lang={lang}>
      <h1 className='text-2xl font-semibold'>{t.navContact}</h1>
      <p className='mt-3'>
        {lang === 'tr'
          ? 'Bu konuda bir form yok. info@yalinli.org adresine e-posta atabilirsiniz.'
          : 'There is no form for this. You can email info@yalinli.org.'}
      </p>
      <p className='mt-3 text-muted-foreground'>
        {lang === 'tr' ? 'Veri sorumlusu: Burak Altıntaş' : 'Data controller: Burak Altıntaş'}
      </p>
      <p className='mt-1'>
        <a className='text-primary underline-offset-2 hover:underline' href='https://burak-altintas.com' rel='noreferrer' target='_blank'>
          burak-altintas.com
        </a>
      </p>
    </PageShell>
  );
}
