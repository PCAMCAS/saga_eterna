import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type Kingdom = {
  id: string;
  name: string;
  leader: string | null;
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
        .limit(8),
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
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-8 py-5">
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
            <Link href="/registro-global" className="transition hover:text-[#e12b2b]">
              Registro
            </Link>
            <Link href="/facciones" className="transition hover:text-[#e12b2b]">
              Facciones
            </Link>
            <Link href="/mi-reino" className="transition hover:text-[#e12b2b]">
              Mi Reino
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1800px] gap-7 px-8 py-8 xl:grid-cols-[330px_1fr_360px]">
        <aside className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-6">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Facciones
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase text-[#fff8ef]">
              Reinos
            </h2>
          </div>

          <div className="max-h-[720px] space-y-3 overflow-y-auto p-6">
            {kingdomList.map((kingdom) => (
              <article
                key={kingdom.id}
                className="group border border-[#251014] bg-black/45 p-4 transition hover:border-[#c3222b] hover:bg-black/65"
              >
                <div className="flex items-center gap-3">
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

                <p className="mt-2 text-xs font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                  {kingdom.leader ?? "Sin líder"}
                </p>

                <p className="mt-3 text-sm leading-6 text-[#a99b94]">
                  {kingdom.description ?? "Sin descripción."}
                </p>
              </article>
            ))}
          </div>
        </aside>

        <section className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="flex items-start justify-between gap-6 border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
                Teatro de guerra
              </p>
              <h1 className="mt-4 text-5xl font-black uppercase leading-none text-[#fff8ef]">
                Mapa del mundo
              </h1>
              <p className="mt-5 max-w-xl leading-7 text-[#b6a9a1]">
                Ciudades, capitales y dominios iniciales de la campaña.
              </p>

              <Link
                href="/mapa"
                className="mt-5 inline-flex border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.28em] text-[#fff8ef] transition hover:bg-[#b91c1c]"
              >
                Ver mapa completo
              </Link>
            </div>

            <div className="min-w-28 border border-[#3a0c12] bg-black/70 px-5 py-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                Año
              </p>
              <p className="mt-2 text-4xl font-black text-[#fff8ef]">
                {currentYear}
              </p>
              <p className="font-black uppercase tracking-[0.18em] text-[#b6a9a1]">
                d.C.
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="relative overflow-hidden border border-[#251014] bg-black">
              <img
                src="/maps/saga-eterna-map.png"
                alt="Mapa de Saga Eterna"
                className="block w-full select-none"
              />

              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />

              {territoryList.map((territory) => {
                const owner = kingdomById.get(territory.owner_kingdom_id);
                const isCapital = territory.type === "CAPITAL";

                return (
                  <div
                    key={territory.id}
                    className="group absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${territory.x}%`,
                      top: `${territory.y}%`,
                    }}
                  >
                    <div className="relative flex flex-col items-center">
                      <span
                        className={[
                          "block rounded-full border border-black shadow-[0_0_18px_currentColor]",
                          isCapital ? "h-4 w-4" : "h-3 w-3",
                        ].join(" ")}
                        style={{
                          backgroundColor: owner?.color ?? "#d7d7d7",
                          color: owner?.color ?? "#d7d7d7",
                        }}
                      />

                      <span
                        className={[
                          "mt-1 whitespace-nowrap bg-black/75 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#fff8ef] shadow-lg",
                          isCapital ? "border border-[#d83a3a]" : "border border-black/60",
                        ].join(" ")}
                      >
                        {territory.name}
                      </span>

                      <div className="pointer-events-none absolute left-1/2 top-8 z-20 hidden w-56 -translate-x-1/2 border border-[#3a0c12] bg-[#050203]/95 p-4 text-left shadow-2xl group-hover:block">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                          {isCapital ? "Capital" : "Ciudad"}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-[#fff8ef]">
                          {territory.name}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-[#b6a9a1]">
                          Dueño:{" "}
                          <span className="font-black text-[#fff8ef]">
                            {owner?.name ?? "Desconocido"}
                          </span>
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#b6a9a1]">
                          Soldados:{" "}
                          <span className="font-black text-[#fff8ef]">
                            {territory.soldiers.toLocaleString("es-ES")}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs leading-6 text-[#8f817a]">
              Las capitales aparecen con marco rojo. Cada movimiento entre nodos
              conectados tardará 24 horas reales por tramo.
            </p>
          </div>
        </section>

        <aside className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-6">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Registro
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase text-[#fff8ef]">
              Crónica global
            </h2>
          </div>

          <div className="space-y-4 p-6">
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
