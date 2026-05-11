import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type Kingdom = {
  id: string;
  name: string;
  description: string | null;
  color: string;
};

type Territory = {
  id: string;
  name: string;
  type: "CAPITAL" | "CITY" | "STATION";
  x: number;
  y: number;
  soldiers: number;
  owner_kingdom_id: string;
};

type GlobalLog = {
  id: string;
  game_day: number;
  year: number;
  message: string;
  type: string;
  created_at: string;
};

export default async function MundoPage() {
  const supabase = await createClient();

  const [{ data: kingdoms }, { data: territories }, { data: logs }] =
    await Promise.all([
      supabase.from("kingdoms").select("*").order("name"),
      supabase.from("territories").select("*").order("name"),
      supabase
        .from("global_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const kingdomList = (kingdoms ?? []) as Kingdom[];
  const territoryList = (territories ?? []) as Territory[];
  const logList = (logs ?? []) as GlobalLog[];

  const kingdomById = new Map(
    kingdomList.map((kingdom) => [kingdom.id, kingdom]),
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050203] text-[#f3eee8]">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_18%_82%,rgba(244,214,170,0.10),transparent_17%),radial-gradient(circle_at_48%_18%,rgba(125,18,31,0.36),transparent_34%),radial-gradient(circle_at_82%_70%,rgba(60,7,14,0.44),transparent_26%),linear-gradient(135deg,#040102_0%,#160509_45%,#050203_100%)]" />
      <div className="fixed inset-0 opacity-[0.10] bg-[radial-gradient(circle_at_20%_30%,rgba(255,245,225,0.24)_0_1px,transparent_1px),radial-gradient(circle_at_70%_60%,rgba(255,245,225,0.16)_0_1px,transparent_1px)] bg-[size:52px_52px,38px_38px]" />

      <header className="relative z-10 border-b border-[#3a0c12] bg-black/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <Link
            href="/"
            className="text-xl font-black uppercase tracking-[0.22em] text-[#fff8ef]"
          >
            Saga <span className="text-[#8f2228]">·</span> Eterna
          </Link>

          <nav className="flex gap-8 text-xs font-black uppercase tracking-[0.38em] text-[#d7c9bd]">
            <Link href="/mundo" className="text-[#e12b2b]">
              Mundo
            </Link>
            <Link href="/supa-test" className="transition hover:text-[#e12b2b]">
              Conexión
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1500px] gap-8 px-8 py-10 xl:grid-cols-[340px_1fr_390px]">
        <aside className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-7">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Facciones
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase text-[#fff8ef]">
              Reinos
            </h2>
          </div>

          <div className="space-y-4 p-7">
            {kingdomList.map((kingdom) => (
              <article
                key={kingdom.id}
                className="group border border-[#251014] bg-black/45 p-5 transition hover:border-[#c3222b] hover:bg-black/65"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="h-3 w-3 rounded-full shadow-[0_0_18px_currentColor]"
                    style={{
                      backgroundColor: kingdom.color,
                      color: kingdom.color,
                    }}
                  />
                  <h3 className="font-black text-[#fff8ef] transition group-hover:text-[#ffdddd]">
                    {kingdom.name}
                  </h3>
                </div>

                <p className="mt-4 text-sm leading-6 text-[#a99b94]">
                  {kingdom.description ?? "Sin descripción."}
                </p>
              </article>
            ))}
          </div>
        </aside>

        <section className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="flex items-start justify-between gap-6 border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-7">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
                Teatro de guerra
              </p>
              <h1 className="mt-4 text-5xl font-black uppercase leading-none text-[#fff8ef]">
                Mapa del mundo
              </h1>
              <p className="mt-5 max-w-xl leading-7 text-[#b6a9a1]">
                Vista inicial de territorios. Más adelante aquí irá el mapa
                interactivo con rutas, estaciones y movimientos.
              </p>
            </div>

            <div className="min-w-28 border border-[#3a0c12] bg-black/70 px-5 py-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                Año
              </p>
              <p className="mt-2 text-4xl font-black text-[#fff8ef]">792</p>
              <p className="font-black uppercase tracking-[0.18em] text-[#b6a9a1]">
                d.C.
              </p>
            </div>
          </div>

          <div className="relative m-7 min-h-[460px] overflow-hidden border border-[#251014] bg-[#090708]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(199,35,43,0.13),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent)]" />
            <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle,rgba(255,245,225,0.24)_0_1px,transparent_1px)] bg-[size:36px_36px]" />

            <div className="absolute left-8 top-8 h-px w-28 bg-[#c3222b]" />
            <div className="absolute left-8 top-8 h-28 w-px bg-[#c3222b]" />
            <div className="absolute bottom-8 right-8 h-px w-28 bg-[#c3222b]" />
            <div className="absolute bottom-8 right-8 h-28 w-px bg-[#c3222b]" />

            {territoryList.map((territory) => {
              const owner = kingdomById.get(territory.owner_kingdom_id);

              return (
                <article
                  key={territory.id}
                  className="absolute w-48 -translate-x-1/2 -translate-y-1/2 border border-[#3a0c12] bg-[#050203]/95 p-4 shadow-2xl transition hover:border-[#e12b2b] hover:bg-black"
                  style={{
                    left: `${territory.x}%`,
                    top: `${territory.y}%`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-[#fff8ef]">
                        {territory.name}
                      </h3>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                        {territory.type === "CAPITAL"
                          ? "Capital"
                          : territory.type === "CITY"
                            ? "Ciudad"
                            : "Estación"}
                      </p>
                    </div>

                    <span
                      className="mt-1 h-3 w-3 rounded-full shadow-[0_0_16px_currentColor]"
                      style={{
                        backgroundColor: owner?.color ?? "#d7d7d7",
                        color: owner?.color ?? "#d7d7d7",
                      }}
                    />
                  </div>

                  <div className="mt-5 space-y-2 text-sm">
                    <p className="text-[#b6a9a1]">
                      Dueño:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {owner?.name ?? "Desconocido"}
                      </span>
                    </p>
                    <p className="text-[#b6a9a1]">
                      Soldados:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {territory.soldiers.toLocaleString("es-ES")}
                      </span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-7">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Registro
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase text-[#fff8ef]">
              Crónica global
            </h2>
          </div>

          <div className="space-y-4 p-7">
            {logList.length === 0 ? (
              <p className="text-sm text-[#a99b94]">
                Todavía no hay sucesos registrados.
              </p>
            ) : (
              logList.map((log) => (
                <article
                  key={log.id}
                  className="border border-[#251014] bg-black/45 p-5"
                >
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                    Día {log.game_day} del {log.year} d.C.
                  </p>
                  <p className="mt-4 text-sm leading-6 text-[#d7c9bd]">
                    {log.message}
                  </p>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
