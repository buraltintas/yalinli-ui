import { PageShell } from '@/components/page-shell';
import { getLanguage, dictionary } from '@/lib/i18n/dictionaries';
import { api } from '@/lib/api/server-client';
import { ExportPrintButton } from '@/components/export-print-button';

type ExportSignature = {
  rowNumber: number;
  signerFullName: string;
  signerEmail: string;
  signedAt: string;
  electronicApprovalText?: string;
  wetSignatureLabel?: string;
  wetSignaturePlaceholder?: string;
  signatureHash?: string;
};

type ExportData = {
  petitionId?: string;
  title: string;
  description: string;
  targetAuthority?: string;
  requestedAction?: string;
  createdBy?: { id?: string; email?: string; fullName?: string };
  createdAt?: string;
  exportedAt?: string;
  signatureCount?: number;
  legalNote: string;
  signatures?: ExportSignature[];
};

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lang = await getLanguage();
  const t = dictionary[lang];
  let data: ExportData | null = null;
  let errorStatus: number | null = null;

  try {
    data = await api.get(`/v1/petitions/${id}/export-data`, {
      auth: true,
      refresh: false,
    });
  } catch (error) {
    errorStatus =
      typeof error === 'object' && error
        ? ((error as { status?: number }).status ?? null)
        : null;
  }

  if (errorStatus === 403) {
    return (
      <PageShell lang={lang}>
        <div className='rounded-2xl border border-border bg-card p-5 text-muted-foreground'>
          {t.petitionExportUnauthorized}
        </div>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell lang={lang}>
        <div className='rounded-2xl border border-border bg-card p-5 text-muted-foreground'>
          {t.petitionExportUnavailable}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell lang={lang}>
      <ExportPrintButton label={t.petitionExportPrint} />
      <h1 className='text-xl font-bold'>{data.title}</h1>
      <p className='mt-2 text-sm text-muted-foreground'>{data.description}</p>
      <div className='mt-4 grid gap-3 text-sm'>
        {data.targetAuthority ? (
          <div>
            <strong>{t.petitionExportTargetAuthority}:</strong>{' '}
            {data.targetAuthority}
          </div>
        ) : null}
        {data.requestedAction ? (
          <div>
            <strong>{t.petitionExportRequestedAction}:</strong>{' '}
            {data.requestedAction}
          </div>
        ) : null}
        {data.createdBy?.fullName || data.createdBy?.email ? (
          <div>
            <strong>{t.petitionExportCreatedBy}:</strong>{' '}
            {[data.createdBy?.fullName, data.createdBy?.email]
              .filter(Boolean)
              .join(' ')}
          </div>
        ) : null}
        {data.createdAt ? (
          <div>
            <strong>{t.petitionExportCreatedAt}:</strong>{' '}
            {new Date(data.createdAt).toLocaleString(
              lang === 'tr' ? 'tr-TR' : 'en-US',
            )}
          </div>
        ) : null}
        {data.exportedAt ? (
          <div>
            <strong>{t.petitionExportedAt}:</strong>{' '}
            {new Date(data.exportedAt).toLocaleString(
              lang === 'tr' ? 'tr-TR' : 'en-US',
            )}
          </div>
        ) : null}
        {typeof data.signatureCount === 'number' ? (
          <div>
            <strong>{t.petitionExportSignatureCount}:</strong>{' '}
            {data.signatureCount}
          </div>
        ) : null}
      </div>
      <p className='mt-4 text-sm'>{data.legalNote}</p>
      <table className='mt-4 w-full border text-sm'>
        <thead>
          <tr>
            <th className='border p-2'>#</th>
            <th className='border p-2'>{t.petitionExportSignerName}</th>
            <th className='border p-2'>{t.petitionExportSignerEmail}</th>
            <th className='border p-2'>{t.petitionExportSignedAt}</th>
            <th className='border p-2'>{t.petitionExportWetSignature}</th>
          </tr>
        </thead>
        <tbody>
          {(data.signatures || []).map((s: ExportSignature) => (
            <tr key={s.rowNumber}>
              <td className='border p-2'>{s.rowNumber}</td>
              <td className='border p-2'>{s.signerFullName}</td>
              <td className='border p-2'>{s.signerEmail}</td>
              <td className='border p-2'>
                {new Date(s.signedAt).toLocaleString(
                  lang === 'tr' ? 'tr-TR' : 'en-US',
                )}
              </td>
              <td className='border p-2 h-12' />
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
}
