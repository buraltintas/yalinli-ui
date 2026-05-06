import { PageShell } from "@/components/page-shell";
import { dictionary, getLanguage } from "@/lib/i18n/dictionaries";
import { SubmitEntryForm } from "@/components/forms/submit-entry-form";

export default async function SubmitPage() {
  const lang = await getLanguage();
  const t = dictionary[lang];
  return (
    <PageShell lang={lang}>
      <h1 className="mb-4 text-2xl font-semibold">{t.navSubmit}</h1>
      <SubmitEntryForm lang={lang} />
    </PageShell>
  );
}
