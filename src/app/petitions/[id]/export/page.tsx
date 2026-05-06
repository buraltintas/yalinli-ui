import { PageShell } from "@/components/page-shell";
import { getLanguage } from "@/lib/i18n/dictionaries";
import { api } from "@/lib/api/server-client";

type ExportSignature = { rowNumber: number; signerFullName: string; signerEmail: string; signedAt: string };
type ExportData = { title: string; description: string; legalNote: string; signatures?: ExportSignature[] };

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLanguage();
  const data = await api.get(`/v1/petitions/${id}/export-data`, { auth: true, refresh: false }).catch(() => null as ExportData | null);

  if (!data) {
    return (
      <PageShell lang={lang}>
        <div className="rounded-2xl border border-border bg-card p-5 text-muted-foreground">
          {lang === "tr" ? "Dışa aktarma verisi şu anda alınamıyor." : "Export data is currently unavailable."}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell lang={lang}>
      <button className="mb-3 rounded border px-3 py-2 print:hidden" onClick={() => {}}>Use browser print</button>
      <h1 className="text-xl font-bold">{data.title}</h1>
      <p>{data.description}</p>
      <p className="mt-2 text-sm">{data.legalNote}</p>
      <table className="mt-4 w-full border text-sm">
        <thead><tr><th className="border p-2">#</th><th className="border p-2">Name</th><th className="border p-2">Email</th><th className="border p-2">Signed</th><th className="border p-2">Wet Signature</th></tr></thead>
        <tbody>{(data.signatures || []).map((s: ExportSignature) => <tr key={s.rowNumber}><td className="border p-2">{s.rowNumber}</td><td className="border p-2">{s.signerFullName}</td><td className="border p-2">{s.signerEmail}</td><td className="border p-2">{new Date(s.signedAt).toLocaleString()}</td><td className="border p-2 h-12" /></tr>)}</tbody>
      </table>
    </PageShell>
  );
}
