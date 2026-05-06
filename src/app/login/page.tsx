import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { RequestCodeForm } from '@/components/forms/auth-forms';
import { getLanguage, dictionary } from '@/lib/i18n/dictionaries';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; notice?: string }>;
}) {
  const lang = await getLanguage();
  const t = dictionary[lang];
  const params = await searchParams;
  const notice =
    params.notice === 'already_registered' ? t.authAlreadyRegistered : '';

  return (
    <PageShell lang={lang}>
      <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
        {t.navLogin}
      </h1>
      <p className='mb-5 mt-2 text-sm leading-6 text-muted-foreground'>
        {t.authHint}
      </p>
      <RequestCodeForm
        mode='login'
        lang={lang}
        initialEmail={params.email || ''}
        notice={notice}
        labels={{
          email: t.profileEmail,
          name: t.profileDisplayName,
          nameHelp: t.authNameHelp,
          language: t.profilePreferredLanguage,
          notifications: t.profileEmailNotificationsEnabled,
          submit: lang === 'tr' ? 'Kod iste' : 'Request code',
          loading: lang === 'tr' ? 'Kod gönderiliyor...' : 'Sending code...',
          sent: lang === 'tr' ? 'Kod gönderildi.' : 'Code sent.',
          spam: t.authSpamHint,
          alreadyRegistered: t.authAlreadyRegistered,
          notFound: t.authNotFound,
          rateLimited:
            lang === 'tr'
              ? 'Çok fazla deneme yaptınız. Lütfen biraz bekleyip tekrar deneyin.'
              : 'Too many attempts. Please wait a moment and try again.',
          invalidInput:
            lang === 'tr'
              ? 'E-posta adresini kontrol edip tekrar deneyin.'
              : 'Please check the email address and try again.',
          generic:
            lang === 'tr'
              ? 'Bir sorun oluştu. Lütfen daha sonra tekrar deneyin.'
              : 'Something went wrong. Please try again later.',
        }}
      />
      <p className='mt-4 text-sm text-muted-foreground'>
        {lang === 'tr' ? 'Hesabın yok mu?' : 'No account yet?'}{' '}
        <Link
          className='font-semibold text-primary underline-offset-2 hover:underline'
          href='/signup'
        >
          {t.navSignup}
        </Link>
      </p>
    </PageShell>
  );
}
