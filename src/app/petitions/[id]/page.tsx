import Link from 'next/link';
import { PetitionSignForm } from '@/components/forms/petition-sign-form';
import { PageShell } from '@/components/page-shell';
import { getLanguage, dictionary } from '@/lib/i18n/dictionaries';
import { api } from '@/lib/api/server-client';

type PetitionDetail = {
  id: string;
  ID?: string;
  title: string;
  Title?: string;
  description: string;
  Description?: string;
  signatureCount: number;
  SignatureCount?: number;
  isOwner?: boolean;
  IsOwner?: boolean;
  createdBy?: { id?: string; ID?: string };
  CreatedBy?: { id?: string; ID?: string };
  signers?: string[];
  Signers?: string[];
  maskedSigners?: string[];
  MaskedSigners?: string[];
  canExport?: boolean;
  CanExport?: boolean;
};

type Me = {
  id?: string | null;
  ID?: string | null;
  name?: string | null;
  Name?: string | null;
};

function normalizePetition(petition: PetitionDetail) {
  return {
    id: petition.id || petition.ID || '',
    title: petition.title || petition.Title || '',
    description: petition.description || petition.Description || '',
    signatureCount: petition.signatureCount ?? petition.SignatureCount ?? 0,
    isOwner: petition.isOwner ?? petition.IsOwner ?? false,
    createdBy: petition.createdBy || petition.CreatedBy,
    signers: petition.signers || petition.Signers || [],
    maskedSigners: petition.maskedSigners || petition.MaskedSigners || [],
    canExport: petition.canExport ?? petition.CanExport ?? false,
  };
}

export default async function PetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lang = await getLanguage();
  const t = dictionary[lang];
  const petitionRaw = await api
    .get(`/v1/petitions/${id}`, { auth: true, refresh: false })
    .catch(() => null as PetitionDetail | null);
  const petition = petitionRaw ? normalizePetition(petitionRaw) : null;
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

  const canExport = petition.isOwner;

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
            {lang === 'tr' ? 'Pdf indir' : 'Download PDF'}
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
