export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-5 py-12">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Acorta tu enlace</h1>
        <p className="mt-2 text-slate-600">Convierte una URL larga en un enlace fácil de compartir.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Acortar enlace">
        <label htmlFor="url" className="text-sm font-semibold">Enlace original</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="url"
            type="url"
            placeholder="https://ejemplo.com/pagina"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button type="button" disabled className="rounded-lg bg-slate-200 px-4 py-2 font-semibold text-slate-600">
            Acortar
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">El acortamiento se habilitará al conectar el servicio.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="resultado">
        <h2 id="resultado" className="text-sm font-semibold">Enlace acortado</h2>
        <p className="mt-2 text-sm text-slate-600">Aquí aparecerá tu enlace corto.</p>
      </section>
    </main>
  );
}
