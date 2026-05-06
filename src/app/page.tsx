import Link from "next/link";
import { getLanguage, dictionary } from "@/lib/i18n/dictionaries";
import { PageShell } from "@/components/page-shell";
import { api } from "@/lib/api/server-client";

export default async function Home() {
  const lang = await getLanguage();
  const t = dictionary[lang];
  const data = await api.get("/v1/feed").catch(() => ({ items: [] }));
  const items = data.items || [];

  return (
    <PageShell lang={lang}>
      <section className="mb-4 rounded-2xl border border-border bg-card p-5 md:p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">{t.feedTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.feedSubtitle}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/submit" className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95">{t.submit}</Link>
          <Link href="/petitions" className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted">{t.petitions}</Link>
        </div>
      </section>
      <section className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">{t.filtersAll}</span>
        <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">{t.filtersProblems}</span>
        <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">{t.filtersRequests}</span>
        <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">{t.filtersSuggestions}</span>
        <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">{t.filtersEvents}</span>
        <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">{t.filtersBeauties}</span>
      </section>
      {items.length === 0 ? <p className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t.noPosts}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item: { id: string; type: string; category: string; status: string; title: string; descriptionPreview: string; authorDisplay: string; createdAt: string; commentCount: number }) => (
          <Link key={item.id} href={`/entries/${item.id}`} className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{item.type}</span>
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent">{item.category}</span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{item.status}</span>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.descriptionPreview}</p>
            <p className="mt-3 text-xs text-muted-foreground">{item.authorDisplay} • {new Date(item.createdAt).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} • {item.commentCount}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
