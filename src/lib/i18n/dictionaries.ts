import { cookies } from "next/headers";
import { headers } from "next/headers";
import { cache } from "react";
import { getAccessToken } from "@/lib/auth";
import { Language } from "@/lib/types";

export const DEFAULT_LANGUAGE: Language = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE as Language) || "tr";

export const dictionary = {
  tr: {
    brand: "Yalınlı İçin",
    subtitle: "Yalınlı Mahallesi sorun, çözüm ve sosyal paylaşım platformu",
    disclaimer: "Resmi kamu kurumu, belediye veya muhtarlık sayfası değildir. Bağımsız mahalle sakinleri girişimidir.",
    navHome: "Ana sayfa",
    navSubmit: "Bildirim yap",
    navPetitions: "İmza kampanyaları",
    navAbout: "Hakkında",
    navProfile: "Profil",
    navLogin: "Giriş",
    navSignup: "Üye Ol",
    navContact: "İletişim",
    navPetitionsShort: "İmzalar",
    submit: "Bildirim Yap",
    petitions: "İmza Kampanyaları",
    feedTitle: "Mahalle Akışı",
    feedSubtitle: "Sorunlar, öneriler, etkinlikler ve güzel anlar",
    noPetitions: "Şu an görünür imza kampanyası yok.",
    startPetition: "Yeni imza kampanyası başlat",
    filtersAll: "Tümü",
    filtersProblems: "Sorun",
    filtersRequests: "İstek",
    filtersSuggestions: "Öneri",
    filtersEvents: "Etkinlik",
    filtersBeauties: "Güzellikler",
    anonymous: "Anonim",
    noPosts: "Henüz paylaşım yok. İlk bildirimi sen yapabilirsin.",
    authHint: "Şifre yok. E-posta adresinize gelen kod ile giriş yapabilirsiniz.",
    authSignupTitle: "Yalınlı’ya katıl",
    authSignupHint: "Mahalle sorunlarını, önerileri ve dilekçeleri güvenli şekilde takip etmek için üyelik oluşturun.",
    authNameHelp: "Ad soyad, dilekçe imzalarında güvenli kayıt için gereklidir. Herkese açık sayfalarda tam adınız gösterilmez.",
    authVerifyHint: "E-postanıza gönderilen 6 haneli kodu girin.",
    authSpamHint: "Kod birkaç dakika içinde gelmezse spam veya gereksiz klasörünü kontrol edin.",
    authAlreadyRegistered: "Bu e-posta zaten kayıtlı. Giriş kodu alabilirsiniz.",
    authNotFound: "Bu e-posta ile kayıt bulunamadı. Üye olabilirsiniz.",
    authCodeFailed: "Kod doğrulanamadı. Lütfen kodu kontrol edin veya yeni kod isteyin.",
    report: "Bildir / İçerik kaldırma talebi",
    signInToSign: "İmzalamak için giriş yapın",
    petitionSignersTitle: "İmzalayanlar",
    profileSignInRequired: "Profil için giriş gerekli.",
    profileSignInHelp: "Profilini, bildirim tercihlerini ve üyelik bilgilerini düzenlemek için giriş yapabilirsin.",
    profileTitle: "Profil",
    profileAccountTitle: "Hesap bilgileri",
    profileAccountHelp: "Bu bilgiler mahalle platformunda nasıl görüneceğini belirler.",
    profileEmail: "E-posta adresi",
    profileEmailHelp: "E-posta adresi giriş ve güvenlik için kullanılır, herkese açık gösterilmez.",
    profileDisplayName: "Ad soyad",
    profileDisplayNamePlaceholder: "Örn: Burak Altıntaş",
    profileDisplayNameHelp: "Dilekçe imzalarında güvenli kayıt için kullanılır. Herkese açık sayfalarda tam adınız gösterilmez.",
    profilePreferredLanguage: "Dil tercihi",
    profileNotificationsTitle: "E-posta bildirimleri",
    profileNotificationsHelp: "Mahalle akışından haberdar olmak istediğin konuları seçebilirsin.",
    profileEmailNotificationsEnabled: "E-posta bildirimleri açık",
    profileNotifyNewEntries: "Yeni paylaşımlar",
    profileNotifyResolvedProblems: "Çözülen problemler",
    profileNotifyNewPetitions: "Yeni dilekçeler",
    profileNotifyNewEvents: "Yeni etkinlikler",
    profileNotifyAnnouncements: "Duyurular",
    profileSave: "Profili kaydet",
    profileSaving: "Kaydediliyor...",
    profileSaved: "Profil bilgileriniz güncellendi.",
    profileSaveError: "Profil kaydedilemedi. Lütfen tekrar deneyin.",
    profileLogout: "Çıkış yap",
    profileLoggingOut: "Çıkış yapılıyor...",
    newPetitionTitle: "Yeni imza kampanyası",
    nonOfficial: "Bağımsız mahalle girişimi",
    termsPlaceholder: "Kullanım koşulları metni.",
    privacyPlaceholder: "Gizlilik ve KVKK aydınlatma metni."
  },
  en: {
    brand: "For Yalınlı",
    subtitle: "Problems, solutions, and social sharing platform for Yalınlı neighborhood",
    disclaimer: "This is not an official public institution, municipality, or muhtarlık website. It is an independent neighborhood residents’ initiative.",
    navHome: "Home",
    navSubmit: "Submit",
    navPetitions: "Petitions",
    navAbout: "About",
    navProfile: "Profile",
    navLogin: "Login",
    navSignup: "Sign up",
    navContact: "Contact",
    navPetitionsShort: "Signs",
    submit: "Submit",
    petitions: "Petitions",
    feedTitle: "Neighborhood Feed",
    feedSubtitle: "Problems, suggestions, events, and local life",
    noPetitions: "There are no visible petitions right now.",
    startPetition: "Start a new petition",
    filtersAll: "All",
    filtersProblems: "Problems",
    filtersRequests: "Requests",
    filtersSuggestions: "Suggestions",
    filtersEvents: "Events",
    filtersBeauties: "Beauties",
    anonymous: "Anonymous",
    noPosts: "No posts yet. You can submit the first one.",
    authHint: "No password. You can sign in with the code sent to your email.",
    authSignupTitle: "Join Yalinli",
    authSignupHint: "Create an account to follow neighborhood issues, suggestions, and petitions securely.",
    authNameHelp: "Your full name is required for petition signing records. It is not shown publicly.",
    authVerifyHint: "Enter the 6-digit code sent to your email.",
    authSpamHint: "If the code does not arrive within a few minutes, please check your spam folder.",
    authAlreadyRegistered: "This email is already registered. You can request a login code.",
    authNotFound: "No account found with this email. You can sign up.",
    authCodeFailed: "The code could not be verified. Please check it or request a new code.",
    report: "Report / Removal request",
    signInToSign: "Sign in to support this petition",
    petitionSignersTitle: "Signers",
    profileSignInRequired: "Sign in required for profile.",
    profileSignInHelp: "Sign in to edit your profile, notification preferences, and membership details.",
    profileTitle: "Profile",
    profileAccountTitle: "Account details",
    profileAccountHelp: "These details control how you appear on the neighborhood platform.",
    profileEmail: "Email address",
    profileEmailHelp: "Your email is used for login and security. It is not shown publicly.",
    profileDisplayName: "Full name",
    profileDisplayNamePlaceholder: "Example: Burak Altıntaş",
    profileDisplayNameHelp: "Used for secure petition signing records. Your full name is not shown publicly.",
    profilePreferredLanguage: "Language preference",
    profileNotificationsTitle: "Email notifications",
    profileNotificationsHelp: "Choose which neighborhood updates you want to receive.",
    profileEmailNotificationsEnabled: "Email notifications enabled",
    profileNotifyNewEntries: "New posts",
    profileNotifyResolvedProblems: "Resolved problems",
    profileNotifyNewPetitions: "New petitions",
    profileNotifyNewEvents: "New events",
    profileNotifyAnnouncements: "Announcements",
    profileSave: "Save profile",
    profileSaving: "Saving...",
    profileSaved: "Your profile has been updated.",
    profileSaveError: "Profile could not be saved. Please try again.",
    profileLogout: "Log out",
    profileLoggingOut: "Logging out...",
    newPetitionTitle: "New petition",
    nonOfficial: "Independent neighborhood initiative",
    termsPlaceholder: "Terms of use.",
    privacyPlaceholder: "Privacy policy."
  }
} as const;

const API_BASE_VALUE = process.env.YALINLI_API_BASE_URL;
const BFF_SECRET_VALUE = process.env.YALINLI_API_BFF_SECRET;

export async function getProfileLanguage(accessToken?: string): Promise<Language | null> {
  if (!accessToken || !API_BASE_VALUE || !BFF_SECRET_VALUE) return null;

  try {
    const res = await fetch(`${API_BASE_VALUE}/v1/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-BFF-SECRET": BFF_SECRET_VALUE
      },
      cache: "no-store"
    });

    if (!res.ok) return null;
    const me = await res.json();
    return me?.preferredLanguage === "en" ? "en" : me?.preferredLanguage === "tr" ? "tr" : null;
  } catch {
    return null;
  }
}

export const getLanguage = cache(async function getLanguage(): Promise<Language> {
  const profileLanguage = await getProfileLanguage(await getAccessToken());
  if (profileLanguage) return profileLanguage;

  const c = await cookies();
  const lang = c.get("yalinli_lang")?.value;
  if (lang === "tr" || lang === "en") return lang;

  const acceptLanguage = (await headers()).get("accept-language") || "";
  if (acceptLanguage.toLowerCase().startsWith("tr")) return "tr";
  return "en";
});
