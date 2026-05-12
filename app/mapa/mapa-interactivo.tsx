"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
  route_type: "LAND" | "SEA";
};

type MapaInteractivoProps = {
  kingdoms: Kingdom[];
  territories: Territory[];
  routes: Route[];
};

const SEA_NODE_NAMES = new Set([
  "Mar del Norte",
  "Canal de la Mancha",
  "Mar Balear",
  "Mar Tirreno",
  "Mar Negro Occidental",
  "Mar Negro Oriental",
]);

function isSeaNode(name: string) {
  return SEA_NODE_NAMES.has(name);
}

export function MapaInteractivo({
  kingdoms,
  territories,
  routes,
}: MapaInteractivoProps) {
  const [showLandRoutes, setShowLandRoutes] = useState(true);
  const [showSeaRoutes, setShowSeaRoutes] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [showLandNodes, setShowLandNodes] = useState(true);
  const [showSeaNodes, setShowSeaNodes] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  const kingdomById = useMemo(() => {
    return new Map(kingdoms.map((kingdom) => [kingdom.id, kingdom]));
  }, [kingdoms]);

  const territoryById = useMemo(() => {
    return new Map(territories.map((territory) => [territory.id, territory]));
  }, [territories]);

  const uniqueRoutes = useMemo(() => {
    return routes.filter((route) => {
      return route.from_territory_id < route.to_territory_id;
    });
  }, [routes]);

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

                const isSeaRoute = route.route_type === "SEA";

                if (isSeaRoute && !showSeaRoutes) {
                  return null;
                }

                if (!isSeaRoute && !showLandRoutes) {
                  return null;
                }

                return (
                  <line
                    key={route.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={
                      isSeaRoute
                        ? "rgba(96, 180, 215, 0.72)"
                        : "rgba(215, 32, 42, 0.78)"
                    }
                    strokeWidth={isSeaRoute ? 1.45 : 1.85}
                    strokeDasharray={isSeaRoute ? "6 7" : undefined}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    className={
                      isSeaRoute
                        ? "drop-shadow-[0_0_2px_rgba(96,180,215,0.65)]"
                        : "drop-shadow-[0_0_2px_rgba(215,32,42,0.65)]"
                    }
                  />
                );
              })}
            </svg>

            {territories.map((territory) => {
              const owner = territory.owner_kingdom_id
                ? kingdomById.get(territory.owner_kingdom_id)
                : null;

              const isCapital = territory.type === "CAPITAL";
              const isStation = territory.type === "STATION";
              const seaNode = isSeaNode(territory.name);

              if (isStation) {
                if (seaNode && !showSeaNodes) {
                  return null;
                }

                if (!seaNode && !showLandNodes) {
                  return null;
                }

                return (
                  <div
                    key={territory.id}
                    className="group absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center"
                    style={{
                      left: `${territory.x}%`,
                      top: `${territory.y}%`,
                    }}
                  >
                    <span
                      className={[
                        "block h-2.5 w-2.5 rounded-full border shadow-[0_0_10px_currentColor]",
                        seaNode
                          ? "border-sky-100/70 bg-sky-700 text-sky-400"
                          : "border-[#f2d29b]/70 bg-[#9b7b47] text-[#d9aa5a]",
                      ].join(" ")}
                    />

                    <div className="pointer-events-none absolute left-1/2 top-7 z-40 hidden w-56 -translate-x-1/2 border border-[#3a0c12] bg-black/95 p-3 text-center shadow-2xl group-hover:block">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                        {seaNode ? "Nodo marítimo" : "Nodo terrestre"}
                      </p>
                      <h3 className="mt-2 text-sm font-black text-[#fff8ef]">
                        {territory.name}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-[#b6a9a1]">
                        Punto de viaje. No puede conquistarse.
                      </p>
                    </div>
                  </div>
                );
              }

              if (!showCities) {
                return null;
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

            <div className="absolute left-5 top-5 z-20 border border-[#3a0c12] bg-black/80 p-4 text-xs shadow-2xl backdrop-blur">
              <p className="font-black uppercase tracking-[0.28em] text-[#d83a3a]">
                Capas
              </p>

              <div className="mt-3 grid gap-2 text-[#d7c9bd]">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showCities}
                    onChange={() => setShowCities((value) => !value)}
                  />
                  Ciudades
                </label>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showLandRoutes}
                    onChange={() => setShowLandRoutes((value) => !value)}
                  />
                  Rutas terrestres
                </label>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showSeaRoutes}
                    onChange={() => setShowSeaRoutes((value) => !value)}
                  />
                  Rutas marítimas
                </label>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showLandNodes}
                    onChange={() => setShowLandNodes((value) => !value)}
                  />
                  Nodos terrestres
                </label>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showSeaNodes}
                    onChange={() => setShowSeaNodes((value) => !value)}
                  />
                  Nodos marítimos
                </label>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showLegend}
                    onChange={() => setShowLegend((value) => !value)}
                  />
                  Leyenda
                </label>
              </div>
            </div>

            {showLegend && (
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
                    <span className="h-2.5 w-2.5 rounded-full bg-[#9b7b47]" />
                    <span>Nodo terrestre</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-700" />
                    <span>Nodo marítimo</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-px w-8 bg-[#d7202a]" />
                    <span>Ruta terrestre</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-px w-8 border-t border-dashed border-sky-300" />
                    <span>Ruta marítima</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
