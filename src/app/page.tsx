"use client";

import { useRef, useState, type FormEvent } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const submitting = useRef(false);
  const resultInput = useRef<HTMLInputElement>(null);

  async function shorten(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    setShortUrl("");
    setCopyMessage("");

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(typeof result.error === "string" ? result.error : "No se pudo acortar el enlace. Intenta de nuevo.");
        return;
      }
      const destination = new URL(result.shortUrl);
      if (!["http:", "https:"].includes(destination.protocol)) {
        throw new Error("Respuesta inválida");
      }
      setShortUrl(destination.href);
    } catch {
      setError("No se pudo completar la solicitud. Revisa tu conexión e intenta de nuevo.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  async function copyLink() {
    setCopyMessage("");
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopyMessage("Enlace copiado.");
    } catch {
      resultInput.current?.focus();
      resultInput.current?.select();
      setCopyMessage("No se pudo copiar automáticamente. Selecciona el enlace y cópialo manualmente.");
    }
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-5 py-12">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Acorta tu enlace</h1>
        <p className="mt-2 text-slate-600">Convierte una URL larga en un enlace fácil de compartir.</p>
      </header>

      <form onSubmit={shorten} aria-busy={loading} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Acortar enlace">
        <label htmlFor="url" className="text-sm font-semibold">Enlace original</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="url"
            type="url"
            name="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={loading}
            aria-describedby={error ? "url-help url-error" : "url-help"}
            autoComplete="url"
            placeholder="https://ejemplo.com/pagina"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
          />
          <button type="submit" disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-wait disabled:opacity-60">
            {loading ? "Acortando…" : "Acortar"}
          </button>
        </div>
        <p id="url-help" className="mt-3 text-sm text-slate-600">Ingresa una dirección que comience con https:// o http://.</p>
        {loading && <p role="status" className="mt-3 text-sm text-slate-600">Creando tu enlace…</p>}
        {error && <p id="url-error" role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="resultado">
        <h2 id="resultado" className="text-sm font-semibold">Enlace acortado</h2>
        {shortUrl ? (
          <div className="mt-3">
            <p role="status" className="mb-3 text-sm text-emerald-700">Tu enlace está listo para compartir.</p>
            <label htmlFor="short-url" className="sr-only">Enlace corto para copiar</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input ref={resultInput} id="short-url" readOnly value={shortUrl} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" />
              <button type="button" onClick={copyLink} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Copiar</button>
            </div>
            <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">Abrir enlace ↗</a>
            <p role="status" className="mt-2 text-sm text-slate-600">{copyMessage}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Aquí aparecerá tu enlace corto.</p>
        )}
      </section>
    </main>
  );
}
