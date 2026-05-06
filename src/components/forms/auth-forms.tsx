"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Lang = "tr" | "en";
type AuthPurpose = "signup" | "login";

type RequestCodeLabels = {
  email: string;
  name: string;
  nameHelp: string;
  language: string;
  notifications: string;
  submit: string;
  loading: string;
  sent: string;
  spam: string;
  alreadyRegistered: string;
  notFound: string;
  rateLimited: string;
  invalidInput: string;
  generic: string;
};

type VerifyLabels = {
  email: string;
  code: string;
  submit: string;
  loading: string;
  success: string;
  failed: string;
  spam: string;
};

function authErrorMessage(mode: AuthPurpose, lang: Lang, code?: string, labels?: RequestCodeLabels) {
  if (code === "user_already_exists") return labels?.alreadyRegistered;
  if (code === "user_not_found") return labels?.notFound;
  if (code === "rate_limited") return labels?.rateLimited;
  if (code === "invalid_input") return labels?.invalidInput;
  if (code === "unauthorized") return lang === "tr" ? "Oturumunuz geçerli değil. Lütfen tekrar giriş yapın." : "Your session is not valid. Please sign in again.";
  if (code === "request_failed") return labels?.generic;
  return labels?.generic || (mode === "signup" ? labels?.alreadyRegistered : labels?.notFound);
}

export function RequestCodeForm({
  mode,
  lang,
  initialEmail = "",
  notice,
  labels
}: {
  mode: AuthPurpose;
  lang: Lang;
  initialEmail?: string;
  notice?: string;
  labels: RequestCodeLabels;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Lang>(lang);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [msg, setMsg] = useState(notice || "");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const canRequestCode =
    email.trim().length > 0 &&
    (mode === "login" || name.trim().length > 0) &&
    !loading &&
    cooldown <= 0;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setMsg("");

        try {
          const payload =
            mode === "signup"
              ? { email: email.trim(), name: name.trim(), preferredLanguage, emailNotificationsEnabled }
              : { email: email.trim() };

          const res = await fetch(`/api/auth/${mode}/request-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const data = await res.json();

          if (!res.ok) {
            const message = authErrorMessage(mode, lang, data?.error?.code, labels) || labels.generic;
            setMsg(message);
            if (data?.error?.code === "rate_limited") {
              setCooldown(60);
            }

            if (mode === "signup" && data?.error?.code === "user_already_exists") {
              router.push(`/login?email=${encodeURIComponent(email)}&notice=already_registered`);
            }
            if (mode === "login" && data?.error?.code === "user_not_found") {
              router.push(`/signup?email=${encodeURIComponent(email)}&notice=not_found`);
            }
            return;
          }

          setMsg(`${labels.sent} ${labels.spam}`);
          router.push(`/verify-code?purpose=${mode}&email=${encodeURIComponent(email)}`);
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-bold" htmlFor={`${mode}-email`}>
          {labels.email}
        </label>
        <input
          id={`${mode}-email`}
          className="min-h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-primary/40"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={lang === "tr" ? "ornek@mail.com" : "name@mail.com"}
          disabled={loading}
          type="email"
          autoComplete="email"
          required
        />
      </div>

      {mode === "signup" ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold" htmlFor="signup-name">
              {labels.name}
            </label>
            <input
              id="signup-name"
              className="min-h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-primary/40"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={lang === "tr" ? "Ad Soyad" : "Full name"}
              disabled={loading}
              autoComplete="name"
              required
            />
            <p className="text-sm leading-6 text-muted-foreground">{labels.nameHelp}</p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold">{labels.language}</span>
            <Select value={preferredLanguage} onValueChange={(value) => setPreferredLanguage(value as Lang)}>
              <SelectTrigger className="h-12 w-full rounded-2xl text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">Türkçe</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold">
            <Checkbox checked={emailNotificationsEnabled} onCheckedChange={(checked) => setEmailNotificationsEnabled(checked === true)} />
            <span>{labels.notifications}</span>
          </label>
        </>
      ) : null}

      <button
        disabled={!canRequestCode}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-base font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? labels.loading : cooldown > 0 ? `${labels.submit} (${cooldown})` : labels.submit}
      </button>

      {msg ? <p className="rounded-2xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function VerifyCodeForm({
  initialEmail = "",
  initialPurpose = "login",
  labels
}: {
  initialEmail?: string;
  initialPurpose?: AuthPurpose;
  labels: VerifyLabels;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const canVerify = email.trim().length > 0 && code.length === 6 && !loading;

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setMsg("");

        try {
          const res = await fetch("/api/auth/verify-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, purpose: initialPurpose })
          });

          if (!res.ok) {
            setMsg(labels.failed);
            return;
          }

          setMsg(labels.success);
          window.location.href = initialPurpose === "signup" ? "/profile" : "/";
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-bold" htmlFor="verify-email">
          {labels.email}
        </label>
        <input
          id="verify-email"
          className="min-h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-primary/40"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold" htmlFor="verify-code">
          {labels.code}
        </label>
        <input
          id="verify-code"
          className="min-h-12 w-full rounded-2xl border border-border bg-background px-4 text-center text-xl font-extrabold tracking-[0.35em] outline-none focus:ring-2 focus:ring-primary/40"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={loading}
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          minLength={6}
          maxLength={6}
        />
      </div>

      <p className="text-sm leading-6 text-muted-foreground">{labels.spam}</p>

      <button
        disabled={!canVerify}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-base font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? labels.loading : labels.submit}
      </button>

      {msg ? <p className="rounded-2xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">{msg}</p> : null}
    </form>
  );
}
