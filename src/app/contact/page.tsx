import { PageShell } from "@/components/page-shell";
import { getLanguage } from "@/lib/i18n/dictionaries";

export default async function ContactPage() {
  const lang = await getLanguage();
  return <PageShell lang={lang}><h1 className="text-2xl font-semibold">Contact</h1><p className="mt-3">{lang === "tr" ? "Düzeltme/kaldırma talepleri için bu sayfayı ve içerik bildirimi akışını kullanın." : "Use this page and content reporting flow for correction/removal requests."}</p></PageShell>;
}
