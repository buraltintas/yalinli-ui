import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { dictionary, getLanguage } from "@/lib/i18n/dictionaries";
import { getAccessToken } from "@/lib/auth";
import { NewPetitionForm } from "@/components/forms/new-petition-form";

export default async function NewPetitionPage() {
  const lang = await getLanguage();
  const t = dictionary[lang];
  if (!(await getAccessToken())) redirect("/login");
  return (
    <PageShell lang={lang}>
      <h1 className="mb-4 text-2xl font-semibold">{t.newPetitionTitle}</h1>
      <NewPetitionForm lang={lang} />
    </PageShell>
  );
}
