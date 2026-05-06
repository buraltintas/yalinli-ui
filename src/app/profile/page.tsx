import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

import { GuestLanguageForm, ProfileForm } from "@/components/forms/profile-form";
import { PageShell } from "@/components/page-shell";
import { dictionary, getLanguage } from "@/lib/i18n/dictionaries";
import { api } from "@/lib/api/server-client";

export default async function ProfilePage() {
  const lang = await getLanguage();
  const t = dictionary[lang];
  const me = await api.get("/v1/me", { auth: true }).catch(() => null);
  return (
    <PageShell lang={lang}>
      {me ? (
        <ProfileForm
          me={me}
          labels={{
            title: t.profileTitle,
            accountTitle: t.profileAccountTitle,
            accountHelp: t.profileAccountHelp,
            email: t.profileEmail,
            emailHelp: t.profileEmailHelp,
            displayName: t.profileDisplayName,
            displayNamePlaceholder: t.profileDisplayNamePlaceholder,
            displayNameHelp: t.profileDisplayNameHelp,
            preferredLanguage: t.profilePreferredLanguage,
            notificationsTitle: t.profileNotificationsTitle,
            notificationsHelp: t.profileNotificationsHelp,
            emailNotificationsEnabled: t.profileEmailNotificationsEnabled,
            notifyNewEntries: t.profileNotifyNewEntries,
            notifyResolvedProblems: t.profileNotifyResolvedProblems,
            notifyNewPetitions: t.profileNotifyNewPetitions,
            notifyNewEvents: t.profileNotifyNewEvents,
            notifyAnnouncements: t.profileNotifyAnnouncements,
            save: t.profileSave,
            saving: t.profileSaving,
            saved: t.profileSaved,
            saveError: t.profileSaveError,
            logout: t.profileLogout,
            loggingOut: t.profileLoggingOut
          }}
        />
      ) : (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.profileTitle}</h1>
          <p className="mt-2 text-base font-semibold text-foreground">{t.profileSignInRequired}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.profileSignInHelp}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <LogIn className="h-5 w-5" />
              {t.navLogin}
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 text-base font-extrabold text-foreground shadow-sm transition hover:bg-muted"
            >
              <UserPlus className="h-5 w-5" />
              {t.navSignup}
            </Link>
          </div>
          <GuestLanguageForm lang={lang} label={t.profilePreferredLanguage} />
        </section>
      )}
    </PageShell>
  );
}
