export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-8">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-amber-500">
          Simulador estratégico persistente
        </p>

        <h1 className="max-w-4xl text-6xl font-bold tracking-tight text-stone-50">
          Saga Eterna
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-300">
          Un mundo medieval anacrónico donde los reinos conquistan, resisten,
          investigan y movilizan ejércitos día tras día.
        </p>

        <div className="mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <h2 className="text-xl font-semibold text-amber-400">Reinos</h2>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Cada jugador elige un reino y podrá influir en sus decisiones
              estratégicas.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <h2 className="text-xl font-semibold text-amber-400">Campañas</h2>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Las tropas viajan por nodos del mapa, tardando 24 horas reales
              por cada tramo.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <h2 className="text-xl font-semibold text-amber-400">Crónica</h2>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Las conquistas, defensas e investigaciones quedarán registradas
              en el historial global.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
