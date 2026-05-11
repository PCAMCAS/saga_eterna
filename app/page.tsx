export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050203] text-[#f3eee8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_82%,rgba(244,214,170,0.16),transparent_17%),radial-gradient(circle_at_48%_18%,rgba(125,18,31,0.44),transparent_34%),radial-gradient(circle_at_82%_70%,rgba(60,7,14,0.5),transparent_26%),linear-gradient(135deg,#040102_0%,#160509_45%,#050203_100%)]" />
      <div className="absolute inset-0 opacity-25 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.04)_42%,transparent_76%)]" />
      <div className="absolute inset-0 opacity-[0.18] bg-[radial-gradient(circle,rgba(255,245,225,0.22)_1px,transparent_1px)] bg-[size:26px_26px]" />

      <header className="relative z-10 border-b border-[#3a0c12] bg-black/55 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <p className="text-2xl font-black uppercase tracking-tight text-[#fff8ef]">
            Saga <span className="text-[#c12a2a]">Eterna</span>
          </p>

          <nav className="hidden gap-10 text-xs font-black uppercase tracking-[0.38em] text-[#d7c9bd] md:flex">
            <a href="/mundo" className="transition hover:text-[#e12b2b]">
              Mundo
            </a>
            <a href="/supa-test" className="transition hover:text-[#e12b2b]">
              Conexión
            </a>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl items-center gap-10 px-8 py-12 lg:grid-cols-[1.05fr_400px]">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.55em] text-[#d83a3a]">
            Crónica estratégica persistente
          </p>

          <h1 className="mt-7 text-7xl font-black uppercase leading-[0.9] tracking-tight text-[#fff8ef] md:text-8xl">
            Saga
            <br />
            Eterna
          </h1>

          <div className="mt-8 h-px max-w-lg bg-gradient-to-r from-[#d21f2b] via-[#6f1119] to-transparent" />

          <p className="mt-8 max-w-2xl text-xl leading-9 text-[#d8c9be]">
            Un mundo medieval anacrónico donde los reinos conquistan, resisten,
            investigan y movilizan ejércitos día tras día.
          </p>

          <div className="mt-11 flex flex-wrap items-center gap-5">
            <a
              href="/mundo"
              className="group inline-flex items-center gap-4 rounded-full border border-[#c3222b] bg-black/70 px-6 py-3.5 text-sm font-black uppercase tracking-[0.3em] text-[#fff8ef] shadow-[0_0_45px_rgba(157,23,31,0.23)] transition hover:border-[#ff4545] hover:bg-[#b91c1c] hover:text-white"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full border border-[#c3222b] bg-[#090304] text-lg transition group-hover:border-white group-hover:bg-black/30">
                →
              </span>
              Entrar al mundo
            </a>

            <p className="text-xs uppercase tracking-[0.35em] text-[#9f8e84]">
              Año 792 d.C.
            </p>
          </div>
        </div>

        <aside className="relative border border-[#3a0c12] bg-[#080607]/90 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="absolute -left-10 top-10 hidden h-px w-20 bg-[#c3222b] lg:block" />
          <div className="absolute -right-4 bottom-16 hidden h-2 w-2 rounded-full border border-[#c3222b] lg:block" />

          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#8a1520] via-[#5f0f18] to-[#170508] p-7">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#ffdada]">
              Estado del mundo
            </p>
            <h2 className="mt-6 text-4xl font-black uppercase leading-tight text-white">
              Los reinos ya marchan.
            </h2>
          </div>

          <div className="space-y-6 bg-[#0c0b0b] p-7">
            <div>
              <h3 className="text-xl font-black text-[#fff8ef]">Reinos</h3>
              <p className="mt-2 leading-7 text-[#bdb1aa]">
                Cada jugador elige un reino y podrá influir en sus decisiones
                estratégicas.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-[#3a0c12] via-[#312526] to-transparent" />

            <div>
              <h3 className="text-xl font-black text-[#fff8ef]">Campañas</h3>
              <p className="mt-2 leading-7 text-[#bdb1aa]">
                Las tropas viajan por nodos del mapa, tardando 24 horas reales
                por cada tramo.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-[#3a0c12] via-[#312526] to-transparent" />

            <div>
              <h3 className="text-xl font-black text-[#fff8ef]">Crónica</h3>
              <p className="mt-2 leading-7 text-[#bdb1aa]">
                Las conquistas, defensas e investigaciones quedarán registradas
                en el historial global.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
