"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LanguageSwitcher({ current }: { current: "tr" | "en" }) {
  const [pending, start] = useTransition();

  return (
    <Select
      value={current}
      disabled={pending}
      onValueChange={(value) =>
        start(async () => {
          await fetch("/api/lang", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang: value })
          });
          window.location.reload();
        })
      }
    >
      <SelectTrigger aria-label="Language" className="w-[132px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="tr">Türkçe</SelectItem>
        <SelectItem value="en">English</SelectItem>
      </SelectContent>
    </Select>
  );
}
