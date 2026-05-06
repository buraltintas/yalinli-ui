"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Bir sorun oluştu / Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sayfa yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
        </p>
        <button onClick={reset} className="mt-4 rounded-xl bg-primary px-4 py-2 text-primary-foreground">
          Tekrar dene / Try again
        </button>
      </div>
    </div>
  );
}
