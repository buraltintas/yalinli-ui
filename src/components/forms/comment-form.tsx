"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";

type Language = "tr" | "en";

const copy = {
  tr: {
    title: "Yorum yaz",
    displayName: "Görünecek ad (opsiyonel)",
    displayNamePlaceholder: "Örn: Ayşe",
    body: "Yorumunuz",
    bodyPlaceholder: "Kısa ve saygılı bir yorum yazın.",
    anonymous: "Adım görünmesin",
    terms: "Yorumumun hukuka uygun olduğunu ve kullanım koşullarını kabul ettiğimi onaylıyorum.",
    submit: "Yorumu gönder",
    loading: "Gönderiliyor...",
    success: "Yorumunuz yayınlandı. Teşekkür ederiz.",
    error: "Yorum gönderilemedi. Lütfen bilgileri kontrol edip tekrar deneyin."
  },
  en: {
    title: "Write a comment",
    displayName: "Display name (optional)",
    displayNamePlaceholder: "Example: Ayşe",
    body: "Your comment",
    bodyPlaceholder: "Write a short and respectful comment.",
    anonymous: "Do not show my name",
    terms: "I confirm that my comment is lawful and I accept the terms of use.",
    submit: "Submit comment",
    loading: "Submitting...",
    success: "Your comment has been published. Thank you.",
    error: "Comment could not be submitted. Please check the information and try again."
  }
};

export function CommentForm({ entryId, lang }: { entryId: string; lang: Language }) {
  const t = copy[lang];
  const [displayName, setDisplayName] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const canSubmit = body.trim().length > 0 && termsAccepted && !loading;

  return (
    <form
      className="mt-6 space-y-4 rounded-2xl border border-border bg-background p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        try {
          const res = await fetch(`/api/entries/${entryId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              displayName: displayName.trim() || null,
              body,
              language: lang,
              isAnonymous,
              termsAccepted
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || t.error);
          setMessage(t.success);
          setBody("");
          window.location.reload();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : t.error);
        } finally {
          setLoading(false);
        }
      }}
    >
      <h3 className="text-lg font-extrabold">{t.title}</h3>
      <label className="grid gap-2">
        <span className="text-sm font-bold">{t.displayName}</span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={loading || isAnonymous}
          placeholder={t.displayNamePlaceholder}
          className="min-h-12 rounded-2xl border border-border bg-card px-4 text-base outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-bold">{t.body}</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={loading}
          placeholder={t.bodyPlaceholder}
          rows={4}
          required
          className="rounded-2xl border border-border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
        <Checkbox checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(checked === true)} />
        <span>{t.anonymous}</span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
        <Checkbox checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} />
        <span>{t.terms}</span>
      </label>
      <button
        disabled={!canSubmit}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-extrabold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <Send className="h-4 w-4" />
        {loading ? t.loading : t.submit}
      </button>
      {message ? <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
