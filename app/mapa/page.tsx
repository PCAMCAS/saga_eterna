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
  owner_kingdom_id: string | null;
};

type Route = {
  id: string;
  from_territory_id: string;
  to_territory_id: string;
  travel_hours: number;
};

export default async function MapaPage() {
  const supabase = await createClient();

  const [{ data: kingdoms }, { data: territories }, { data: routes }] =
    await Promise.all([
      supabase.from("kingdoms").select("*").order("name"),
      supabase.from("territories").select("*").order("name"),
      supabase.from("routes").select("*"),
    ]);

  const kingdomList = (kingdoms ?? []) as Kingdom[];
  const territoryList = (territories ?? []) as Territory[];
  const routeList = (routes ?? []) as Route[];

  const kingdomById = new Map(
    kingdomList.map((kingdom) => [kingdom.id, kingdom]),
  );

  const territoryById = new Map(
    territoryList.map((territory) => [territory.id, territory]),
  );

  const uniqueRoutes = routeList.filter((route) => {
    return route.from_territory_id < route.to_territory_id;
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-[#f3eee8]">
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-[#3a0c12] bg-black/80 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-lg font-black uppercase tracking-[0.22em] text-[#fff8ef]"
          >
            Saga <span className="text-[#8f2228]">·</span> Eterna
          </Link>

          <nav className="flex items-center gap-6 text-xs font-black uppercase tracking-[0.32em] text-[#d7c9bd]">
            <Link href="/mundo" className="transition hover:text-[#e12b2b]">
              Volver al mundo
            </Link>
            <Link href="/registro-global" className="transition hover:text-[#e12b2b]">
              Registro
            </Link>
            <Link href="/mi-reino" className="transition hover:text-[#e12b2b]">
              Mi Reino
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative h-screen w-screen pt-[73px]">
        <div className="relative h-full w-full overflow-auto bg-[#050203]">
          <div className="relative mx-auto min-w-[1500px] max-w-[1900px]">
            <img
              src="/maps/saga-eterna-map.png"
              alt="Mapa de Saga Eterna"
              className="block w-full select-none"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {uniqueRoutes.map((route) => {
                const from = territoryById.get(route.from_territory_id);
                const to = territoryById.get(route.to_territory_id);

                if (!from || !to) {
                  return null;
                }

                const isMaritime =
                  from.type === "STATION" || to.type === "STATION";

                return (
                  <line
                    key={route.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={
                      isMaritime
                        ? "rgba(125, 190, 220, 0.82)"
                        : "rgba(230, 35, 45, 0.82)"
                    }
                    strokeWidth={isMaritime ? 1.8 : 2.1}
                    strokeDasharray={isMaritime ? "7 6" : undefined}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    className={
                      isMaritime
                        ? "drop-shadow-[0_0_3px_rgba(125,190,220,0.8)]"
                        : "drop-shadow-[0_0_3px_rgba(230,35,45,0.8)]"
                    }
                  />
                );
              })}
            </svg>

            {territoryList.map((territory) => {
              const owner = territory.owner_kingdom_id
                ? kingdomById.get(territory.owner_kingdom_id)
                : null;

              const isCapital = territory.type === "CAPITAL";
              const isStation = territory.type === "STATION";

              if (isStation) {
                return (
                  <div
                    key={territory.id}
                    className="group absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center"
                    style={{
                      left: `${territory.x}%`,
                      top: `${territory.y}%`,
                    }}
                  >
                    <span className="block h-2.5 w-2.5 rounded-full border border-slate-100/80 bg-slate-500 shadow-[0_0_12px_rgba(148,163,184,0.85)]" />

                    <div className="pointer-events-none absolute left-1/2 top-7 z-40 hidden w-52 -translate-x-1/2 border border-slate-600 bg-black/95 p-3 text-center shadow-2xl group-hover:block">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300">
                        Nodo de viaje
                      </p>
                      <h3 className="mt-2 text-sm font-black text-[#fff8ef]">
                        {territory.name}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-[#b6a9a1]">
                        Punto de ruta. No puede conquistarse.
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={territory.id}
                  className="group absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center"
                  style={{
                    left: `${territory.x}%`,
                    top: `${territory.y}%`,
                  }}
                >
                  <span
                    className={[
                      "block rounded-full border border-black/90 shadow-[0_0_16px_currentColor]",
                      isCapital ? "h-5 w-5 ring-2 ring-[#d83a3a]" : "h-4 w-4",
                    ].join(" ")}
                    style={{
                      backgroundColor: owner?.color ?? "#d7d7d7",
                      color: owner?.color ?? "#d7d7d7",
                    }}
                  />

                  <div className="pointer-events-none absolute left-1/2 top-8 z-40 hidden w-64 -translate-x-1/2 border border-[#3a0c12] bg-[#050203]/95 p-4 text-left shadow-2xl group-hover:block">
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

                    <p className="text-sm leading-6 text-[#b6a9a1]">
                      Líder:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {owner?.leader ?? "Desconocido"}
                      </span>
                    </p>

                    <p className="text-sm leading-6 text-[#b6a9a1]">
                      Soldados:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {territory.soldiers.toLocaleString("es-ES")}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}

            <div className="absolute bottom-5 right-5 z-20 border border-[#3a0c12] bg-black/80 p-4 text-xs shadow-2xl backdrop-blur">
              <p className="font-black uppercase tracking-[0.28em] text-[#d83a3a]">
                Leyenda
              </p>
              <div className="mt-3 space-y-2 text-[#d7c9bd]">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 rounded-full border-2 border-[#d83a3a] bg-[#fff8ef]" />
                  <span>Capital</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-[#fff8ef]" />
                  <span>Ciudad conquistable</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                  <span>Nodo de viaje</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-[#e6232d]" />
                  <span>Ruta terrestre</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 border-t border-dashed border-sky-300" />
                  <span>Ruta marítima / intermedia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
