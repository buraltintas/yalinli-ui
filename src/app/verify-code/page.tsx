import { PageShell } from "@/components/page-shell";
import { VerifyCodeForm } from "@/components/forms/auth-forms";
import { dictionary, getLanguage } from "@/lib/i18n/dictionaries";

export default async function VerifyCodePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; purpose?: string }>;
}) {
  const lang = await getLanguage();
  const t = dictionary[lang];
  const params = await searchParams;
  const purpose = params.purpose === "signup" ? "signup" : "login";

  return (
    <PageShell lang={lang}>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{lang === "tr" ? "Kodu doğrula" : "Verify code"}</h1>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t.authVerifyHint}</p>
      <VerifyCodeForm
        initialEmail={params.email || ""}
        initialPurpose={purpose}
        labels={{
          email: t.profileEmail,
          code: lang === "tr" ? "E-postadaki kod" : "Code from email",
          submit: lang === "tr" ? "Kodu doğrula" : "Verify code",
          loading: lang === "tr" ? "Doğrulanıyor..." : "Verifying...",
          success: lang === "tr" ? "Giriş tamamlandı. Yönlendiriliyorsunuz." : "Signed in. Redirecting.",
          failed: t.authCodeFailed,
          spam: t.authSpamHint
        }}
      />
    </PageShell>
  );
}
