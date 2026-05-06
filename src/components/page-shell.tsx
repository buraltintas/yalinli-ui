import { dictionary } from '@/lib/i18n/dictionaries';
import { ParkMark } from '@/components/brand/park-mark';
import { Language } from '@/lib/types';
import { ShellNav } from '@/components/shell-nav';

export async function PageShell({
  lang,
  children,
}: {
  lang: Language;
  children: React.ReactNode;
}) {
  const t = dictionary[lang];
  const navLabels = {
    home: t.navHome,
    submit: t.navSubmit,
    petitions: t.navPetitions,
    petitionsShort: t.navPetitionsShort,
    about: t.navAbout,
    profile: t.navProfile,
  };
  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <header className='sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur'>
        <div className='mx-auto flex max-w-6xl items-center gap-3 px-4 py-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <ParkMark className='h-9 w-9 shrink-0' />
            <div className='min-w-0'>
              <p className='text-xl font-semibold tracking-tight leading-tight'>
                {t.brand}
              </p>
              <p className='mt-0.5 text-xs leading-snug text-muted-foreground'>
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>
        <ShellNav variant='desktop' labels={navLabels} />
      </header>
      <main className='mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 md:py-6 md:pb-8'>
        {children}
      </main>
      <ShellNav variant='mobile' labels={navLabels} />
    </div>
  );
}
