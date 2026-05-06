'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleHelp, FileText, Home, ListChecks, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavLabels = {
  home: string;
  submit: string;
  petitions: string;
  petitionsShort: string;
  about: string;
  profile: string;
};

type ShellNavProps = {
  variant: 'desktop' | 'mobile';
  labels: NavLabels;
};

type NavItem = {
  key: keyof NavLabels;
  href: string;
  icon?: typeof Home;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    key: 'home',
    href: '/',
    icon: Home,
    match: (pathname) => pathname === '/' || pathname.startsWith('/entries'),
  },
  {
    key: 'submit',
    href: '/submit',
    icon: FileText,
    match: (pathname) =>
      pathname === '/submit' || pathname.startsWith('/submit/'),
  },
  {
    key: 'petitions',
    href: '/petitions',
    icon: ListChecks,
    match: (pathname) =>
      pathname === '/petitions' || pathname.startsWith('/petitions/'),
  },
  {
    key: 'about',
    href: '/about',
    icon: CircleHelp,
    match: (pathname) =>
      pathname === '/about' ||
      pathname.startsWith('/about/') ||
      pathname === '/terms' ||
      pathname === '/privacy' ||
      pathname === '/contact',
  },
  {
    key: 'profile',
    href: '/profile',
    icon: User,
    match: (pathname) =>
      pathname === '/profile' ||
      pathname.startsWith('/profile/') ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname === '/verify-code',
  },
];

export function ShellNav({ variant, labels }: ShellNavProps) {
  const pathname = usePathname() || '/';
  const isMobile = variant === 'mobile';

  if (isMobile) {
    return (
      <nav
        className='fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 p-2 backdrop-blur md:hidden'
        aria-label='Mobile'
      >
        <div className='mx-auto grid max-w-md grid-cols-5 gap-2'>
          {navItems.map((item) => {
            const isActive = item.match(pathname);
            const Icon = item.icon;
            const label =
              item.key === 'petitions'
                ? labels.petitionsShort
                : labels[item.key];
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-semibold leading-none text-muted-foreground transition hover:bg-muted hover:text-foreground',
                  isActive &&
                    'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]',
                )}
              >
                {isActive ? (
                  <span className='absolute -top-2 h-1 w-8 rounded-full bg-primary' />
                ) : null}
                {Icon ? <Icon className='h-4 w-4' /> : null}
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className='mx-auto hidden max-w-6xl gap-2 px-4 pb-4 md:flex'
      aria-label='Main'
    >
      {navItems.map((item) => {
        const isActive = item.match(pathname);
        const label = labels[item.key];
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex items-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground',
              isActive &&
                'border-primary bg-primary/10 text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.13)]',
            )}
          >
            {isActive ? (
              <span className='absolute -bottom-4 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-primary' />
            ) : null}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
