import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { getLanguage } from "@/lib/i18n/dictionaries";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME || "yalinli.org",
  description: "Yalınlı neighborhood platform",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLanguage();

  return (
    <html lang={lang} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
