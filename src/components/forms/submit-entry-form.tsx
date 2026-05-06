"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const schema = z.object({
  type: z.string().min(1),
  category: z.string().min(1),
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(4000),
  language: z.enum(["tr", "en"]),
  displayName: z.string().optional(),
  isAnonymous: z.boolean(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  locationText: z.string().optional(),
  eventDate: z.string().optional(),
  termsAccepted: z.literal(true)
});

type Form = z.infer<typeof schema>;

export function SubmitEntryForm({ lang }: { lang: "tr" | "en" }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const t = lang === "tr"
    ? {
        type: "Bildirim tipi",
        category: "Kategori",
        title: "Başlık",
        description: "Açıklama",
        displayName: "Görünecek ad (opsiyonel)",
        contactEmail: "İletişim e-postası (opsiyonel, herkese açık değil)",
        locationText: "Konum açıklaması (opsiyonel)",
        eventDate: "Etkinlik tarihi (opsiyonel)",
        typePlaceholder: "Tip seçin",
        categoryPlaceholder: "Kategori seçin",
        titlePlaceholder: "Örn: Park aydınlatmaları çalışmıyor",
        descriptionPlaceholder: "Sorunu, öneriyi veya etkinliği açıkça yazın.",
        displayNamePlaceholder: "Örn: Ahmet",
        contactEmailPlaceholder: "ornek@mail.com",
        locationTextPlaceholder: "Örn: Muhtarlık yanı çocuk parkı",
        imageHint: "En fazla 3 görsel. Yüz, plaka, özel adres, telefon numarası, çocuk fotoğrafı veya özel belge paylaşmayın.",
        imageCta: "Görsel seçmek için buraya dokunun",
        imageSelected: "seçilen görsel",
        imageNone: "Henüz görsel seçilmedi",
        anonymous: "Adım görünmesin",
        anonymousHint: "Anonim seçerseniz paylaşımınızda adınız görünmez.",
        terms: "Gönderdiğim içeriğin doğruluğundan ve hukuka uygunluğundan sorumlu olduğumu; Kullanım Şartları’nı ve Gizlilik Metni’ni okuduğumu kabul ediyorum.",
        termsLink: "Kullanım Koşulları",
        privacyLink: "Gizlilik",
        termsModalTitle: "Kullanım Koşulları (Özet)",
        privacyModalTitle: "Gizlilik (Özet)",
        termsModalBody: "Bu metin MVP için kısa bir özettir. Tam metin yakında yayınlanacaktır. Platformu kullanırken yasalara uygun, saygılı ve topluluk yararını gözeten paylaşımlar yapmayı kabul etmiş olursunuz.",
        privacyModalBody: "Bu metin MVP için kısa bir özettir. Tam metin yakında yayınlanacaktır. Paylaşımlarınızın moderasyon ve iletişim amaçlarıyla işlenebileceğini, hassas kişisel verileri paylaşmamanız gerektiğini kabul etmiş olursunuz.",
        termsRequired: "Devam etmek için koşulları kabul etmelisiniz.",
        submit: "Gönder",
        uploading: "Gönderiliyor...",
        success: "Bildiriminiz yayınlandı. Teşekkür ederiz.",
        uploadLabel: "Görseller",
      }
    : {
        type: "Entry type",
        category: "Category",
        title: "Title",
        description: "Description",
        displayName: "Display name (optional)",
        contactEmail: "Contact email (optional, not public)",
        locationText: "Location text (optional)",
        eventDate: "Event date (optional)",
        typePlaceholder: "Select type",
        categoryPlaceholder: "Select category",
        titlePlaceholder: "Example: Park lights are not working",
        descriptionPlaceholder: "Clearly explain the issue, suggestion, or event.",
        displayNamePlaceholder: "Example: Ahmet",
        contactEmailPlaceholder: "name@mail.com",
        locationTextPlaceholder: "Example: Playground near muhtarlık",
        imageHint: "Up to 3 images. Avoid faces, license plates, private addresses, phone numbers, children photos, or private documents.",
        imageCta: "Tap here to select images",
        imageSelected: "selected image",
        imageNone: "No image selected yet",
        anonymous: "Do not show my name",
        anonymousHint: "If you choose anonymous, your name will not be shown on the post.",
        terms: "I confirm that I am responsible for the accuracy and legality of my submission and that I have read the Terms of Use and Privacy Policy.",
        termsLink: "Terms",
        privacyLink: "Privacy",
        termsModalTitle: "Terms (Summary)",
        privacyModalTitle: "Privacy (Summary)",
        termsModalBody: "This is a short MVP summary. Full legal text will be published soon. By using the platform, you agree to share lawfully, respectfully, and for community benefit.",
        privacyModalBody: "This is a short MVP summary. Full legal text will be published soon. You acknowledge content may be processed for moderation and communication, and you should avoid sharing sensitive personal data.",
        termsRequired: "You must accept terms to continue.",
        submit: "Submit",
        uploading: "Submitting...",
        success: "Your submission has been published. Thank you.",
        uploadLabel: "Images",
      };

  const typeOptions: Array<{ value: Form["type"]; label: string }> = [
    { value: "problem", label: lang === "tr" ? "Sorun" : "Problem" },
    { value: "beauty", label: lang === "tr" ? "Güzellik" : "Beauty" },
    { value: "request", label: lang === "tr" ? "İstek" : "Request" },
    { value: "suggestion", label: lang === "tr" ? "Öneri" : "Suggestion" },
    { value: "event", label: lang === "tr" ? "Etkinlik" : "Event" }
  ];

  const categoryOptions = [
    { value: "infrastructure", label: lang === "tr" ? "Altyapı" : "Infrastructure" },
    { value: "environment", label: lang === "tr" ? "Çevre" : "Environment" },
    { value: "transport", label: lang === "tr" ? "Ulaşım" : "Transport" },
    { value: "safety", label: lang === "tr" ? "Güvenlik" : "Safety" },
    { value: "social", label: lang === "tr" ? "Sosyal" : "Social" },
    { value: "animals", label: lang === "tr" ? "Sokak Hayvanları" : "Street Animals" },
    { value: "cleaning", label: lang === "tr" ? "Temizlik" : "Cleaning" },
    { value: "other", label: lang === "tr" ? "Diğer" : "Other" }
  ];

  const { register, handleSubmit, control, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { language: lang, isAnonymous: false, type: "problem", category: "infrastructure" }
  });
  const selectedType = useWatch({ control, name: "type" });

  return (
    <form className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-6" onSubmit={handleSubmit(async (values) => {
      setLoading(true); setMessage("");
      try {
        const mediaIds: string[] = [];
        if (files) {
          for (const file of Array.from(files).slice(0, 3)) {
            const fd = new FormData();
            fd.append("file", file);
            const up = await fetch("/api/media/upload", { method: "POST", body: fd });
            const upData = await up.json();
            if (!up.ok) throw new Error(upData?.error?.message || "Upload failed");
            mediaIds.push(upData.id);
          }
        }
        const res = await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, mediaIds }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Error");
        setMessage(t.success);
      } catch (e: unknown) {
        setMessage(e instanceof Error ? e.message : "Error");
      } finally { setLoading(false); }
    })}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold">{t.type}</label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-11 w-full"><SelectValue placeholder={t.typePlaceholder} /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">{t.category}</label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-11 w-full"><SelectValue placeholder={t.categoryPlaceholder} /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">{t.title}</label>
        <input className="w-full rounded-xl border border-border bg-background p-3" placeholder={t.titlePlaceholder} {...register("title")} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">{t.description}</label>
        <textarea className="w-full rounded-xl border border-border bg-background p-3" placeholder={t.descriptionPlaceholder} rows={5} {...register("description")} />
      </div>
      {selectedType === "event" ? (
        <div className="space-y-2">
          <label className="text-sm font-semibold">{t.eventDate}</label>
          <input type="datetime-local" className="w-full rounded-xl border border-border bg-background p-3" {...register("eventDate")} />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold">{t.displayName}</label>
          <input className="w-full rounded-xl border border-border bg-background p-3" placeholder={t.displayNamePlaceholder} {...register("displayName")} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">{t.contactEmail}</label>
          <input className="w-full rounded-xl border border-border bg-background p-3" placeholder={t.contactEmailPlaceholder} {...register("contactEmail")} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">{t.locationText}</label>
        <input className="w-full rounded-xl border border-border bg-background p-3" placeholder={t.locationTextPlaceholder} {...register("locationText")} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">{t.uploadLabel}</label>
        <label
          htmlFor="entry-images"
          className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-4 text-center text-sm font-medium text-foreground hover:bg-muted"
        >
          {t.imageCta}
        </label>
        <input
          id="entry-images"
          className="sr-only"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(e.target.files)}
        />
        <p className="text-sm text-muted-foreground">
          {files && files.length > 0
            ? `${Math.min(files.length, 3)} ${t.imageSelected}`
            : t.imageNone}
        </p>
        <p className="text-sm text-muted-foreground">{t.imageHint}</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input className="mt-1" type="checkbox" {...register("isAnonymous")} />
        <span>
          <span className="font-medium">{t.anonymous}</span>
          <span className="mt-1 block text-muted-foreground">{t.anonymousHint}</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input className="mt-1" type="checkbox" {...register("termsAccepted")} />
        <span>
          {t.terms}{" "}
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-primary underline-offset-2 hover:underline">{t.termsLink}</button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="text-lg font-bold">{t.termsModalTitle}</DialogTitle>
              <p className="mt-3 text-sm text-muted-foreground">{t.termsModalBody}</p>
              <p className="mt-3 text-sm"><Link className="text-primary underline-offset-2 hover:underline" href="/terms">/terms</Link></p>
            </DialogContent>
          </Dialog>{" "}
          &{" "}
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-primary underline-offset-2 hover:underline">{t.privacyLink}</button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="text-lg font-bold">{t.privacyModalTitle}</DialogTitle>
              <p className="mt-3 text-sm text-muted-foreground">{t.privacyModalBody}</p>
              <p className="mt-3 text-sm"><Link className="text-primary underline-offset-2 hover:underline" href="/privacy">/privacy</Link></p>
            </DialogContent>
          </Dialog>
        </span>
      </label>
      {errors.termsAccepted ? <p className="text-sm text-red-700">{t.termsRequired}</p> : null}
      <button disabled={loading} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground">{loading ? t.uploading : t.submit}</button>
      {message ? <p className="text-sm">{message}</p> : null}
    </form>
  );
}
