export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b0704] text-[#f4ead8]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-8">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#c8942f]">
          Simulador estratégico persistente
        </p>

        <h1 className="max-w-4xl text-6xl font-bold tracking-tight text-[#fff7e6]">
          Saga Eterna
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d6c7ad]">
          Un mundo medieval anacrónico donde los reinos conquistan, resisten,
          investigan y movilizan ejércitos día tras día.
        </p>

        <div className="mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#3a2816] bg-[#17100a] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-[#d6a13a]">Reinos</h2>
            <p className="mt-3 text-sm leading-6 text-[#b8aa91]">
              Cada jugador elige un reino y podrá influir en sus decisiones
              estratégicas.
            </p>
          </div>

          <div className="rounded-2xl border border-[#3a2816] bg-[#17100a] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-[#d6a13a]">Campañas</h2>
            <p className="mt-3 text-sm leading-6 text-[#b8aa91]">
              Las tropas viajan por nodos del mapa, tardando 24 horas reales
              por cada tramo.
            </p>
          </div>

          <div className="rounded-2xl border border-[#3a2816] bg-[#17100a] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-[#d6a13a]">Crónica</h2>
            <p className="mt-3 text-sm leading-6 text-[#b8aa91]">
              Las conquistas, defensas e investigaciones quedarán registradas
              en el historial global.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
