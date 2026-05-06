"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Language } from "@/lib/types";

type Labels = {
  title: string;
  fullName: string;
  publicName: string;
  anonymous: string;
  terms: string;
  submit: string;
  loading: string;
  success: string;
  error: string;
  publicHelp: string;
  exportHelp: string;
};

const copy: Record<Language, Labels> = {
  tr: {
    title: "Dilekçeyi destekle",
    fullName: "Ad soyad",
    publicName: "Ad soyadım görünsün",
    anonymous: "Anonim görünsün",
    terms: "Bu imza kampanyasını yalinli.org üzerinden elektronik olarak desteklediğimi; bu kaydın nitelikli elektronik imza veya ıslak imza yerine geçmediğini kabul ediyorum.",
    submit: "Dilekçeyi imzala",
    loading: "İmzalanıyor...",
    success: "Dilekçeyi desteklediniz. Teşekkür ederiz.",
    error: "İmza kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.",
    publicHelp: "Ad soyadınız dilekçe sayfasında herkese açık listelenir.",
    exportHelp: "Kampanya sahibi, imza listesini dışa aktarırken ad soyad ve e-posta bilgilerini görebilir."
  },
  en: {
    title: "Support this petition",
    fullName: "Full name",
    publicName: "Show my full name",
    anonymous: "Show anonymously",
    terms: "I confirm that I electronically support this petition through yalinli.org and understand that this record does not replace a qualified electronic signature or wet signature.",
    submit: "Sign petition",
    loading: "Signing...",
    success: "You have supported this petition. Thank you.",
    error: "Signature could not be saved. Please check the information and try again.",
    publicHelp: "Your full name will be listed publicly on the petition page.",
    exportHelp: "The campaign creator can see full name and email in signature exports."
  }
};

export function PetitionSignForm({ petitionId, lang, initialName }: { petitionId: string; lang: Language; initialName?: string | null }) {
  const t = copy[lang];
  const [fullName, setFullName] = useState(initialName || "");
  const [visibility, setVisibility] = useState("public_name");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const canSubmit = fullName.trim().length > 0 && termsAccepted && !loading;

  return (
    <form
      className="mt-5 space-y-4 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");

        try {
          const res = await fetch(`/api/petitions/${petitionId}/sign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visibility, termsAccepted, fullName })
          });

          if (!res.ok) throw new Error(t.error);
          setMessage(t.success);
          toast.success(t.success);
          window.location.reload();
        } catch {
          setMessage(t.error);
          toast.error(t.error);
        } finally {
          setLoading(false);
        }
      }}
    >
      <div>
        <h2 className="text-lg font-extrabold">{t.title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.publicHelp}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.exportHelp}</p>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold">{t.fullName}</span>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="min-h-12 rounded-2xl border border-border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-primary/40"
          autoComplete="name"
          required
        />
      </label>

      <Select value={visibility} onValueChange={setVisibility}>
        <SelectTrigger className="h-12 w-full rounded-2xl text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="public_name">{t.publicName}</SelectItem>
          <SelectItem value="anonymous">{t.anonymous}</SelectItem>
        </SelectContent>
      </Select>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 text-sm leading-6">
        <Checkbox checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} />
        <span>{t.terms}</span>
      </label>

      <button
        disabled={!canSubmit}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-base font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? t.loading : t.submit}
      </button>

      {message ? <p className="rounded-2xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">{message}</p> : null}
    </form>
  );
}
