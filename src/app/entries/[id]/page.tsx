import { PageShell } from "@/components/page-shell";
import { getLanguage, dictionary } from "@/lib/i18n/dictionaries";
import { api } from "@/lib/api/server-client";

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLanguage();
  const t = dictionary[lang];
  const [entry, comments] = await Promise.all([
    api.get(`/v1/entries/${id}`),
    api.get(`/v1/entries/${id}/comments`)
  ]);

  return (
    <PageShell lang={lang}>
      <article className="rounded-lg border bg-white p-4">
        <h1 className="text-xl font-bold">{entry.title}</h1>
        <p className="mt-2 whitespace-pre-wrap">{entry.description}</p>
        <p className="mt-2 text-sm text-slate-600">{entry.authorDisplay}</p>
        <a href="/contact" className="mt-3 inline-block rounded border px-3 py-2">{t.report}</a>
      </article>
      <section className="mt-4 rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Comments</h2>
        <div className="space-y-2">
          {(comments.items || []).map((c: { id: string; body: string; authorDisplay: string }) => <p key={c.id} className="rounded border p-2 text-sm">{c.authorDisplay}: {c.body}</p>)}
        </div>
      </section>
    </PageShell>
  );
}
