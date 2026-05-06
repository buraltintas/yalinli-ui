import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { dictionary, getLanguage } from "@/lib/i18n/dictionaries";
import { api } from "@/lib/api/server-client";

type PetitionListItem = { id: string; title: string; description: string; signatureCount: number };

export default async function PetitionList() {
  const lang = await getLanguage();
  const t = dictionary[lang];
  const data = await api.get("/v1/petitions").catch(() => ({ items: [] as PetitionListItem[] }));
  return (
    <PageShell lang={lang}>
      <section className="mb-4 rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t.petitions}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{lang === "tr" ? "Mahalle için toplu çözüm çağrıları" : "Collective action requests for the neighborhood"}</p>
          </div>
          <Link href="/petitions/new" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{t.startPetition}</Link>
        </div>
      </section>
      {(data.items || []).length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t.noPetitions}</section>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {(data.items || []).map((p: PetitionListItem) => (
          <Link key={p.id} href={`/petitions/${p.id}`} className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition-transform hover:-translate-y-0.5">
            <h2 className="text-lg font-extrabold tracking-tight">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            <div className="mt-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{p.signatureCount} {lang === "tr" ? "imza" : "signatures"}</div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
