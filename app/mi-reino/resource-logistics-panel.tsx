"use client";

import { useActionState, useMemo, useState } from "react";
import { ActionState, sendResourceMovement } from "./actions";

type Territory = {
  id: string;
  name: string;
  type: "CAPITAL" | "CITY" | "STATION";
};

type TerritoryEconomy = {
  territory_id: string;
  gold: number;
  food: number;
};

type Route = {
  id: string;
  from_territory_id: string;
  to_territory_id: string;
  travel_hours: number;
  route_type: "LAND" | "SEA";
};

type ResourceMovement = {
  id: string;
  source_territory_id: string;
  target_territory_id: string;
  resource_type: "GOLD" | "FOOD";
  amount: number;
  status: "IN_TRANSIT" | "ARRIVED" | "CANCELLED";
  departure_day: number;
  departure_year: number;
  arrival_day: number;
  arrival_year: number;
  arrival_tick?: number | null;
};

type ResourceLogisticsPanelProps = {
  territories: Territory[];
  economy: TerritoryEconomy[];
  routes: Route[];
  movements: ResourceMovement[];
};

const initialState: ActionState = {
  ok: false,
  message: "",
};

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

function resourceLabel(type: "GOLD" | "FOOD") {
  return type === "GOLD" ? "Oro" : "Comida";
}

function resourceTone(type: "GOLD" | "FOOD") {
  return type === "GOLD" ? "text-[#f7c873]" : "text-[#bef264]";
}

function economyFor(territoryId: string, economy: TerritoryEconomy[]) {
  return (
    economy.find((entry) => entry.territory_id === territoryId) ?? {
      territory_id: territoryId,
      gold: 0,
      food: 0,
    }
  );
}

export function ResourceLogisticsPanel({
  territories,
  economy,
  routes,
  movements,
}: ResourceLogisticsPanelProps) {
  const [state, formAction, pending] = useActionState(
    sendResourceMovement,
    initialState,
  );

  const [sourceId, setSourceId] = useState("");

  const territoryById = useMemo(
    () => new Map(territories.map((territory) => [territory.id, territory])),
    [territories],
  );

  const connectedTargets = useMemo(() => {
    if (!sourceId) return [];

    const connectedIds = new Set<string>();

    for (const route of routes) {
      if (route.from_territory_id === sourceId) {
        connectedIds.add(route.to_territory_id);
      }

      if (route.to_territory_id === sourceId) {
        connectedIds.add(route.from_territory_id);
      }
    }

    return territories.filter((territory) => connectedIds.has(territory.id));
  }, [routes, sourceId, territories]);

  const sourceEconomy = sourceId ? economyFor(sourceId, economy) : null;
  const inTransit = movements.filter((movement) => movement.status === "IN_TRANSIT");

  return (
    <section id="logistica" className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] bg-gradient-to-r from-[#120507] to-black p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
              Logística del Reino
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
              Transporte de recursos
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#b6a9a1]">
              Envía oro o comida entre territorios propios conectados. El recurso
              sale inmediatamente del origen y llega al avanzar los días.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <div className="border border-[#251014] bg-black/55 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7f7470]">
                En tránsito
              </p>
              <p className="mt-2 text-3xl font-black text-[#fff8ef]">
                {formatNumber(inTransit.length)}
              </p>
            </div>

            <div className="border border-[#251014] bg-black/55 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7f7470]">
                Rutas
              </p>
              <p className="mt-2 text-3xl font-black text-[#7dd3fc]">
                {formatNumber(routes.length)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form action={formAction} className="border border-[#251014] bg-black/35 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#d83a3a]">
            Nueva orden logística
          </p>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                Origen
              </span>
              <select
                name="sourceTerritoryId"
                required
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
                disabled={pending}
                className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecciona territorio</option>
                {territories.map((territory) => {
                  const entry = economyFor(territory.id, economy);

                  return (
                    <option key={territory.id} value={territory.id}>
                      {territory.name} · {formatNumber(entry.gold)} oro ·{" "}
                      {formatNumber(entry.food)} comida
                    </option>
                  );
                })}
              </select>
            </label>

            {sourceEconomy && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-[#251014] bg-black/45 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
                    Oro disponible
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#f7c873]">
                    {formatNumber(sourceEconomy.gold)}
                  </p>
                </div>

                <div className="border border-[#251014] bg-black/45 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
                    Comida disponible
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#bef264]">
                    {formatNumber(sourceEconomy.food)}
                  </p>
                </div>
              </div>
            )}

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                Destino
              </span>
              <select
                name="targetTerritoryId"
                required
                disabled={pending || !sourceId || connectedTargets.length === 0}
                className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue=""
              >
                <option value="" disabled>
                  {sourceId
                    ? connectedTargets.length === 0
                      ? "Sin destinos conectados"
                      : "Selecciona destino conectado"
                    : "Selecciona origen primero"}
                </option>
                {connectedTargets.map((territory) => (
                  <option key={territory.id} value={territory.id}>
                    {territory.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                  Recurso
                </span>
                <select
                  name="resourceType"
                  required
                  disabled={pending}
                  className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue="GOLD"
                >
                  <option value="GOLD">Oro</option>
                  <option value="FOOD">Comida</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                  Cantidad
                </span>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  step="1"
                  required
                  disabled={pending}
                  className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Cantidad"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {pending ? "Enviando..." : "Enviar transporte"}
            </button>

            {state.message && (
              <div
                className={[
                  "border p-4 text-sm leading-6",
                  state.ok
                    ? "border-[#3f6212] text-[#bef264]"
                    : "border-[#7f1d1d] text-[#fca5a5]",
                ].join(" ")}
              >
                {state.message}
              </div>
            )}
          </div>
        </form>

        <div className="border border-[#251014] bg-black/35">
          <div className="border-b border-[#251014] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#d83a3a]">
              Transportes activos
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-[#fff8ef]">
              Recursos en camino
            </h3>
          </div>

          <div className="space-y-3 p-5">
            {inTransit.length === 0 ? (
              <p className="border border-[#251014] bg-black/35 p-4 text-sm leading-6 text-[#b6a9a1]">
                No hay transportes de recursos en tránsito.
              </p>
            ) : (
              inTransit.slice(0, 8).map((movement) => {
                const source = territoryById.get(movement.source_territory_id);
                const target = territoryById.get(movement.target_territory_id);

                return (
                  <article
                    key={movement.id}
                    className="border border-[#251014] bg-black/45 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span
                          className={[
                            "border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                            movement.resource_type === "GOLD"
                              ? "border-[#854d0e] text-[#f7c873]"
                              : "border-[#3f6212] text-[#bef264]",
                          ].join(" ")}
                        >
                          {resourceLabel(movement.resource_type)}
                        </span>

                        <p className="mt-3 text-sm font-black text-[#fff8ef]">
                          {source?.name ?? "Origen desconocido"} →{" "}
                          {target?.name ?? "Destino desconocido"}
                        </p>
                      </div>

                      <p
                        className={[
                          "text-2xl font-black",
                          resourceTone(movement.resource_type),
                        ].join(" ")}
                      >
                        {formatNumber(movement.amount)}
                      </p>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-[#b6a9a1]">
                      Llegada prevista: día {movement.arrival_day} del{" "}
                      {movement.arrival_year} d.C.
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
