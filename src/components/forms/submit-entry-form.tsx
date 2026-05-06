"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, X } from "lucide-react";
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
const MAX_PREPARED_IMAGE_BYTES = 850 * 1024;
const MAX_IMAGES = 3;

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export function SubmitEntryForm({ lang }: { lang: "tr" | "en" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const selectedImagesRef = useRef<SelectedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
        imageAddMore: "Görsel ekle",
        imageSelected: "seçilen görsel",
        imageNone: "Henüz görsel seçilmedi",
        imageLimit: "En fazla 3 görsel ekleyebilirsiniz.",
        imageRemove: "Görseli kaldır",
        imageAlt: "Seçilen görsel önizlemesi",
        anonymous: "Adım görünmesin",
        anonymousHint: "Anonim seçerseniz paylaşımınızda adınız görünmez.",
        terms: "Gönderdiğim içeriğin doğruluğundan ve hukuka uygunluğundan sorumlu olduğumu; Kullanım Şartları’nı ve Gizlilik Metni’ni okuduğumu kabul ediyorum.",
        termsLink: "Kullanım Koşulları",
        privacyLink: "Gizlilik",
        termsModalTitle: "Kullanım Koşulları",
        privacyModalTitle: "Gizlilik ve KVKK",
        termsModalBody: "Platformu kullanırken yasalara uygun, saygılı ve topluluk yararını gözeten paylaşımlar yapmayı; gönderdiğiniz içerikten sorumlu olduğunuzu kabul edersiniz.",
        privacyModalBody: "Paylaşımlarınız, bildirimleriniz ve üyelik bilgileriniz platformun çalışması, güvenlik, bildirim tercihleri ve içerik kaldırma süreçleri için işlenebilir. Özel nitelikli kişisel veri paylaşmayın.",
        termsRequired: "Devam etmek için koşulları kabul etmelisiniz.",
        submit: "Gönder",
        uploading: "Gönderiliyor...",
        success: "Bildiriminiz yayınlandı. Teşekkür ederiz.",
        reviewSuccess: "Bildiriminiz alındı. Yayına alınmadan önce kontrol edilebilir.",
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
        imageAddMore: "Add image",
        imageSelected: "selected image",
        imageNone: "No image selected yet",
        imageLimit: "You can add up to 3 images.",
        imageRemove: "Remove image",
        imageAlt: "Selected image preview",
        anonymous: "Do not show my name",
        anonymousHint: "If you choose anonymous, your name will not be shown on the post.",
        terms: "I confirm that I am responsible for the accuracy and legality of my submission and that I have read the Terms of Use and Privacy Policy.",
        termsLink: "Terms",
        privacyLink: "Privacy",
        termsModalTitle: "Terms of Use",
        privacyModalTitle: "Privacy Policy",
        termsModalBody: "By using the platform, you agree to share lawfully, respectfully, and for community benefit, and you accept responsibility for the content you submit.",
        privacyModalBody: "Your submissions, reports, and account information may be processed for platform operation, security, notification preferences, and content removal workflows. Do not share sensitive personal data.",
        termsRequired: "You must accept terms to continue.",
        submit: "Submit",
        uploading: "Submitting...",
        success: "Your submission has been published. Thank you.",
        reviewSuccess: "Your submission has been received. It may be reviewed before publishing.",
        uploadLabel: "Images",
      };

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const typeOptions: Array<{ value: Form["type"]; label: string }> = [
    { value: "problem", label: lang === "tr" ? "Sorun" : "Problem" },
    { value: "beauty", label: lang === "tr" ? "Güzellikler" : "Beauty" },
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

  const { register, handleSubmit, control, formState: { errors, isValid } } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { language: lang, isAnonymous: false, type: "problem", category: "infrastructure" }
  });
  const selectedType = useWatch({ control, name: "type" });

  return (
    <form className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-6" onSubmit={handleSubmit(async (values) => {
      setLoading(true); setMessage("");
      try {
        const mediaIds: string[] = [];
        if (selectedImages.length > 0) {
          for (const { file } of selectedImages) {
            const uploadFile = await prepareImageForUpload(file);
            const fd = new FormData();
            fd.append("file", uploadFile);
            const up = await fetch("/api/media/upload", { method: "POST", body: fd });
            const upData = await up.json();
            if (!up.ok) throw new Error(upData?.error?.message || "Upload failed");
            mediaIds.push(upData.id);
          }
        }
        const payload = {
          ...values,
          displayName: values.displayName?.trim() || null,
          contactEmail: values.contactEmail?.trim() || null,
          locationText: values.locationText?.trim() || null,
          eventDate: values.eventDate ? new Date(values.eventDate).toISOString() : null,
          privacyAccepted: values.termsAccepted,
          mediaIds
        };
        const res = await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Error");
        setMessage(data.status === "approved" ? t.success : t.reviewSuccess);
        if (data.id && data.status === "approved") {
          router.push(`/entries/${data.id}`);
        }
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
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const incomingFiles = Array.from(e.target.files || []).filter((file) => file.type.startsWith("image/"));
            if (incomingFiles.length === 0) return;
            setSelectedImages((current) => {
              const remainingSlots = MAX_IMAGES - current.length;
              const next = incomingFiles.slice(0, Math.max(remainingSlots, 0)).map((file) => ({
                id: createImageId(),
                file,
                previewUrl: URL.createObjectURL(file)
              }));
              return [...current, ...next].slice(0, MAX_IMAGES);
            });
            e.currentTarget.value = "";
          }}
        />
        {selectedImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {selectedImages.map((image, index) => (
              <div key={image.id} className="group relative overflow-hidden rounded-2xl border border-border bg-background">
                <Image
                  src={image.previewUrl}
                  alt={`${t.imageAlt} ${index + 1}`}
                  width={480}
                  height={360}
                  unoptimized
                  className="aspect-[4/3] w-full object-cover"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm ring-1 ring-border transition hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label={`${t.imageRemove} ${index + 1}`}
                  onClick={() => {
                    setSelectedImages((current) => {
                      const target = current.find((item) => item.id === image.id);
                      if (target) URL.revokeObjectURL(target.previewUrl);
                      return current.filter((item) => item.id !== image.id);
                    });
                  }}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="absolute bottom-2 left-2 rounded-full bg-background/95 px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
                  {index + 1}/{MAX_IMAGES}
                </div>
              </div>
            ))}
            {selectedImages.length < MAX_IMAGES ? (
              <button
                type="button"
                className="flex aspect-[4/3] min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background px-3 text-center text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-6 w-6 text-primary" aria-hidden="true" />
                {t.imageAddMore}
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {selectedImages.length > 0
            ? `${selectedImages.length} ${t.imageSelected}`
            : t.imageNone}
        </p>
        <p className="text-sm text-muted-foreground">{t.imageHint}</p>
        {selectedImages.length >= MAX_IMAGES ? <p className="text-sm font-medium text-primary">{t.imageLimit}</p> : null}
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
      <button
        disabled={loading || !isValid}
        className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? t.uploading : t.submit}
      </button>
      {message ? <p className="text-sm">{message}</p> : null}
    </form>
  );
}

async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= MAX_PREPARED_IMAGE_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  let maxSide = Math.min(1600, Math.max(bitmap.width, bitmap.height));
  let quality = 0.82;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) break;
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);

    if (blob && blob.size <= MAX_PREPARED_IMAGE_BYTES) {
      const safeName = file.name.replace(/\.[^.]+$/, "") || "yalinli-image";
      return new File([blob], `${safeName}.jpg`, { type: "image/jpeg" });
    }

    if (quality > 0.56) {
      quality -= 0.08;
    } else {
      maxSide = Math.round(maxSide * 0.78);
      quality = 0.72;
    }
  }

  throw new Error("Görsel yüklenemedi. Lütfen daha küçük bir görsel seçin.");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function createImageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
