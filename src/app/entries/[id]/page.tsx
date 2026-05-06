import Link from "next/link";
import { MessageCircle, ShieldAlert } from "lucide-react";

import { CommentForm } from "@/components/forms/comment-form";
import { PageShell } from "@/components/page-shell";
import { getLanguage, dictionary } from "@/lib/i18n/dictionaries";
import { api } from "@/lib/api/server-client";

type Entry = {
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  category?: string;
  status?: string;
  authorDisplay?: string;
  imageUrls?: string[];
};

type Comment = {
  id?: string;
  body?: string;
  authorDisplay?: string;
  createdAt?: string;
};

const categoryLabels = {
  tr: {
    infrastructure: "Altyapı",
    environment: "Çevre",
    transport: "Ulaşım",
    safety: "Güvenlik",
    social: "Sosyal",
    animals: "Sokak Hayvanları",
    cleaning: "Temizlik",
    other: "Diğer"
  },
  en: {
    infrastructure: "Infrastructure",
    environment: "Environment",
    transport: "Transport",
    safety: "Safety",
    social: "Social",
    animals: "Street Animals",
    cleaning: "Cleaning",
    other: "Other"
  }
} as const;

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLanguage();
  const t = dictionary[lang];
  const [entry, comments] = await Promise.all([
    api.get(`/v1/entries/${id}`).catch(() => null as Entry | null),
    api.get(`/v1/entries/${id}/comments`).catch(() => ({ items: [] as Comment[] }))
  ]);
  const categoryLabel = entry?.category
    ? categoryLabels[lang][entry.category as keyof typeof categoryLabels.tr] || entry.category
    : "";

  if (!entry) {
    return (
      <PageShell lang={lang}>
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold">{lang === "tr" ? "Paylaşım bulunamadı" : "Post not found"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {lang === "tr" ? "Bu paylaşım yayında olmayabilir veya kaldırılmış olabilir." : "This post may not be visible or may have been removed."}
          </p>
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-bold text-primary-foreground">
            {t.navHome}
          </Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell lang={lang}>
      <article className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
        <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold">
          {categoryLabel ? <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{categoryLabel}</span> : null}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{entry.title}</h1>
        {entry.authorDisplay ? <p className="mt-2 text-sm font-semibold text-muted-foreground">{entry.authorDisplay}</p> : null}

        {(entry.imageUrls || []).length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(entry.imageUrls || []).slice(0, 3).map((url: string) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="max-h-80 w-full rounded-2xl border border-border object-cover sm:h-48" />
            ))}
          </div>
        ) : null}

        <p className="mt-5 whitespace-pre-wrap text-base leading-7">{entry.description}</p>

        <Link
          href="/contact"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted"
        >
          <ShieldAlert className="h-4 w-4" />
          {t.report}
        </Link>
      </article>

      <section className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
        <h2 className="flex items-center gap-2 text-xl font-extrabold">
          <MessageCircle className="h-5 w-5 text-primary" />
          {lang === "tr" ? "Yorumlar" : "Comments"}
        </h2>
        <div className="mt-4 space-y-3">
          {(comments.items || []).length === 0 ? (
            <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              {lang === "tr" ? "Henüz yorum yok. İlk yorumu sen yazabilirsin." : "No comments yet. You can write the first one."}
            </p>
          ) : null}
          {(comments.items || []).map((comment: Comment) => (
            <div key={comment.id} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-bold">{comment.authorDisplay || t.anonymous}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{comment.body}</p>
            </div>
          ))}
        </div>
        <CommentForm entryId={id} lang={lang} />
      </section>
    </PageShell>
  );
}
