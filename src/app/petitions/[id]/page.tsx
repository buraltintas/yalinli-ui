import Link from 'next/link';
import { PetitionSignForm } from '@/components/forms/petition-sign-form';
import { PageShell } from '@/components/page-shell';
import { getLanguage, dictionary } from '@/lib/i18n/dictionaries';
import { api } from '@/lib/api/server-client';

type PetitionDetail = {
  id: string;
  title: string;
  description: string;
  signatureCount: number;
  signers?: string[];
  maskedSigners?: string[];
  canExport?: boolean;
};

type Me = { name?: string | null; Name?: string | null };

export default async function PetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lang = await getLanguage();
  const t = dictionary[lang];
  const petition = await api
    .get(`/v1/petitions/${id}`, { auth: true, refresh: false })
    .catch(() => null as PetitionDetail | null);
  const me = await api
    .get('/v1/me', { auth: true, refresh: false })
    .catch(() => null as Me | null);

  if (!petition) {
    return (
      <PageShell lang={lang}>
        <div className='rounded-2xl border border-border bg-card p-5 text-muted-foreground'>
          {lang === 'tr'
            ? 'Kampanya şu anda yüklenemiyor.'
            : 'Petition is currently unavailable.'}
        </div>
      </PageShell>
    );
  }

  const canExport = !!petition.canExport;

  return (
    <PageShell lang={lang}>
      <h1 className='text-2xl font-semibold'>{petition.title}</h1>
      <p className='mt-2'>{petition.description}</p>
      <p className='mt-2 text-sm'>{petition.signatureCount}</p>
      <div className='mt-3 flex flex-wrap gap-2'>
        {canExport ? (
          <Link
            href={`/petitions/${id}/export`}
            className='rounded border px-3 py-2'
          >
            {lang === 'tr'
              ? 'İmza listesini indir / PDF oluştur'
              : 'Download signatures / Create PDF'}
          </Link>
        ) : null}
      </div>
      {me ? (
        <PetitionSignForm
          petitionId={id}
          lang={lang}
          initialName={me.name || me.Name || ''}
        />
      ) : (
        <Link
          href={`/login?next=/petitions/${id}`}
          className='mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-5 text-base font-extrabold text-primary-foreground'
        >
          {t.signInToSign}
        </Link>
      )}
      <div className='mt-4'>
        <h2 className='font-semibold'>{t.petitionSignersTitle}</h2>
        <ul className='list-disc pl-5'>
          {(petition.signers || petition.maskedSigners || []).map(
            (s: string) => (
              <li key={s}>{s}</li>
            ),
          )}
        </ul>
      </div>
    </PageShell>
  );
}
