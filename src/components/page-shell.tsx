import Link from "next/link";
import { CircleHelp, FileText, Home, ListChecks, User } from "lucide-react";
import { dictionary } from "@/lib/i18n/dictionaries";
import { ParkMark } from "@/components/brand/park-mark";
import { Language } from "@/lib/types";

export async function PageShell({ lang, children }: { lang: Language; children: React.ReactNode }) {
  const t = dictionary[lang];
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <ParkMark className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <p className="text-xl font-extrabold tracking-tight leading-tight">{t.brand}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-6xl gap-2 px-4 pb-4 md:flex" aria-label="Main">
          <Link className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted" href="/">{t.navHome}</Link>
          <Link className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted" href="/submit">{t.navSubmit}</Link>
          <Link className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted" href="/petitions">{t.navPetitions}</Link>
          <Link className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted" href="/about">{t.navAbout}</Link>
          <Link className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted" href="/profile">{t.navProfile}</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 md:py-6 md:pb-8">{children}</main>
      <footer className="border-t border-border/80 bg-background">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-7 text-sm text-muted-foreground">
          <div className="flex gap-4 font-medium"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/contact">Contact</Link></div>
        </div>
      </footer>
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 p-2 backdrop-blur md:hidden" aria-label="Mobile">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
          <Link className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] font-semibold leading-none hover:bg-muted" href="/">
            <Home className="h-4 w-4" />
            <span>{t.navHome}</span>
          </Link>
          <Link className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] font-semibold leading-none hover:bg-muted" href="/submit">
            <FileText className="h-4 w-4" />
            <span>{t.navSubmit}</span>
          </Link>
          <Link className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] font-semibold leading-none hover:bg-muted" href="/petitions">
            <ListChecks className="h-4 w-4" />
            <span>{t.navPetitionsShort}</span>
          </Link>
          <Link className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] font-semibold leading-none hover:bg-muted" href="/about">
            <CircleHelp className="h-4 w-4" />
            <span>{t.navAbout}</span>
          </Link>
          <Link className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] font-semibold leading-none hover:bg-muted" href="/profile">
            <User className="h-4 w-4" />
            <span>{t.navProfile}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
