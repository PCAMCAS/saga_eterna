"use client";

import { CompactBuildingActions } from "@/components/compact-building-actions";
import { orderBuildingUpgradeFromForm } from "@/app/mi-reino/actions";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  ActionState,
  attackTerritory,
  reinforceTerritory,
  scoutTerritory,
} from "@/app/mi-reino/actions";

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
  soldiers: number | null;
  owner_kingdom_id: string | null;
  is_disputed: boolean;
};

type Route = {
  id: string;
  from_territory_id: string;
  to_territory_id: string;
  travel_hours: number;
  route_type: "LAND" | "SEA";
};

type TerritoryDispute = {
  id: string;
  territory_id: string;
  attacker_kingdom_id: string;
  defender_kingdom_id: string;
  attacker_soldiers: number;
  defender_soldiers_at_open: number;
  opened_day: number;
};

type ScoutReport = {
  id: string;
  territory_id: string;
  game_day: number;
  year: number;
  observed_soldiers: number;
  created_at: string | null;
};

type TerritoryEconomy = {
  territory_id: string;
  gold: number;
  food: number;
  gold_building_level: number;
  food_building_level: number;
  barracks_level: number;
};

type BuildingOrder = {
  id: string;
  territory_id: string;
  building_type: "GOLD" | "FOOD" | "BARRACKS";
  target_level: number;
  cost_gold: number;
  completes_day: number;
  completes_year: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
};

type MapaInteractivoProps = {
  kingdoms: Kingdom[];
  territories: Territory[];
  routes: Route[];
  userEmail: string | null;
  selectedKingdomId: string | null;
  scoutUsed: boolean;
  currentDay: number;
  currentYear: number;
  disputes: TerritoryDispute[];
  scoutReports: ScoutReport[];
  territoryEconomy: TerritoryEconomy[];
  buildingOrders: BuildingOrder[];
};

const SEA_NODE_NAMES = new Set([
  "Mar del Norte",
  "Canal de la Mancha",
  "Mar Balear",
  "Mar Tirreno",
  "Mar Negro Occidental",
  "Mar Negro Oriental",
]);

const initialActionState: ActionState = {
  ok: false,
  message: "",
};

function isSeaNode(name: string) {
  return SEA_NODE_NAMES.has(name);
}

export function MapaInteractivo({
  kingdoms,
  territories,
  routes,
  userEmail,
  selectedKingdomId,
  scoutUsed,
  currentDay,
  currentYear,
  disputes,
  scoutReports,
  territoryEconomy,
  buildingOrders,
}: MapaInteractivoProps) {
  const router = useRouter();
  const [showLandRoutes, setShowLandRoutes] = useState(true);
  const [showSeaRoutes, setShowSeaRoutes] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [showLandNodes, setShowLandNodes] = useState(true);
  const [showSeaNodes, setShowSeaNodes] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(
    null,
  );

  const [scoutState, scoutAction, scoutPending] = useActionState(
    scoutTerritory,
    initialActionState,
  );

  const [reinforceState, reinforceAction, reinforcePending] = useActionState(
    reinforceTerritory,
    initialActionState,
  );

  const [attackState, attackAction, attackPending] = useActionState(
    attackTerritory,
    initialActionState,
  );

  useEffect(() => {
    if (scoutState.ok || reinforceState.ok || attackState.ok) {
      router.refresh();
    }
  }, [
    scoutState.ok,
    reinforceState.ok,
    attackState.ok,
    scoutState.message,
    reinforceState.message,
    attackState.message,
    router,
  ]);

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

  const selectedTerritory = selectedTerritoryId
    ? territoryById.get(selectedTerritoryId) ?? null
    : null;

  const selectedTerritoryOwner = selectedTerritory?.owner_kingdom_id
    ? kingdomById.get(selectedTerritory.owner_kingdom_id) ?? null
    : null;

  const selectedScoutReport = selectedTerritory
    ? scoutReports.find(
        (report) => report.territory_id === selectedTerritory.id,
      ) ?? null
    : null;

  const selectedTerritoryEconomy = selectedTerritory
    ? territoryEconomy.find(
        (entry) => entry.territory_id === selectedTerritory.id,
      ) ?? null
    : null;

  const selectedPendingBuildingTypes = selectedTerritory
    ? buildingOrders
        .filter(
          (order) =>
            order.territory_id === selectedTerritory.id &&
            order.status === "PENDING",
        )
        .map((order) => order.building_type)
    : [];

  const selectedIsStation = selectedTerritory?.type === "STATION";
  const selectedIsOwned =
    Boolean(selectedTerritory?.owner_kingdom_id) &&
    selectedTerritory?.owner_kingdom_id === selectedKingdomId;

  const selectedIsEnemy =
    Boolean(selectedTerritory?.owner_kingdom_id) &&
    Boolean(selectedKingdomId) &&
    selectedTerritory?.owner_kingdom_id !== selectedKingdomId;

  const selectedDispute = selectedTerritory
    ? disputes.find(
        (dispute) => dispute.territory_id === selectedTerritory.id,
      ) ?? null
    : null;

  const selectedIsDisputeAttacker =
    Boolean(selectedKingdomId) &&
    selectedDispute?.attacker_kingdom_id === selectedKingdomId;

  const selectedIsDisputeDefender =
    Boolean(selectedKingdomId) &&
    selectedDispute?.defender_kingdom_id === selectedKingdomId;

  const canReinforceSelected =
    selectedIsOwned || selectedIsDisputeAttacker || selectedIsDisputeDefender;

  const ownedTerritories = useMemo(() => {
    if (!selectedKingdomId) return [];

    return territories
      .filter(
        (territory) =>
          territory.type !== "STATION" &&
          territory.owner_kingdom_id === selectedKingdomId,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedKingdomId, territories]);

  const reinforcementOrigins = useMemo(() => {
    if (!selectedTerritory || !canReinforceSelected) return [];

    const connectedIds = new Set<string>();

    for (const route of routes) {
      if (route.to_territory_id === selectedTerritory.id) {
        connectedIds.add(route.from_territory_id);
      }

      if (route.from_territory_id === selectedTerritory.id) {
        connectedIds.add(route.to_territory_id);
      }
    }

    return ownedTerritories
      .filter(
        (territory) =>
          territory.id !== selectedTerritory.id &&
          connectedIds.has(territory.id),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [canReinforceSelected, ownedTerritories, routes, selectedTerritory]);

  const attackOrigins = useMemo(() => {
    if (!selectedTerritory || !selectedIsEnemy || !selectedKingdomId) return [];

    const connectedIds = new Set<string>();

    for (const route of routes) {
      if (route.to_territory_id === selectedTerritory.id) {
        connectedIds.add(route.from_territory_id);
      }

      if (route.from_territory_id === selectedTerritory.id) {
        connectedIds.add(route.to_territory_id);
      }
    }

    return territories
      .filter(
        (territory) =>
          territory.type !== "STATION" &&
          territory.owner_kingdom_id === selectedKingdomId &&
          connectedIds.has(territory.id),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [routes, selectedIsEnemy, selectedKingdomId, selectedTerritory, territories]);

  const hasAttackOrigins = attackOrigins.length > 0;
  const hasAvailableAttackSoldiers = attackOrigins.some(
    (territory) => Number(territory.soldiers ?? 0) > 0,
  );

  const canUseScout =
    Boolean(userEmail) &&
    Boolean(selectedKingdomId) &&
    Boolean(selectedTerritory) &&
    selectedIsEnemy &&
    !selectedIsStation &&
    !scoutUsed &&
    !scoutPending;

  const canAttack =
    Boolean(userEmail) &&
    Boolean(selectedKingdomId) &&
    Boolean(selectedTerritory) &&
    selectedIsEnemy &&
    hasAttackOrigins &&
    hasAvailableAttackSoldiers &&
    !attackPending;

  const hasReinforcementOrigins = reinforcementOrigins.length > 0;
  const hasAvailableReinforcementSoldiers = reinforcementOrigins.some(
    (territory) => Number(territory.soldiers ?? 0) > 0,
  );

  const canReinforce =
    Boolean(userEmail) &&
    Boolean(selectedKingdomId) &&
    Boolean(selectedTerritory) &&
    canReinforceSelected &&
    hasReinforcementOrigins &&
    hasAvailableReinforcementSoldiers &&
    !reinforcePending;

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
            <Link href="/reglas" className="transition hover:text-[#e12b2b]">
              Reglas
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
              const isSelected = selectedTerritoryId === territory.id;

              if (isStation) {
                if (seaNode && !showSeaNodes) {
                  return null;
                }

                if (!seaNode && !showLandNodes) {
                  return null;
                }

                return (
                  <button
                    key={territory.id}
                    type="button"
                    onClick={() => setSelectedTerritoryId(territory.id)}
                    className="group absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center"
                    style={{
                      left: `${territory.x}%`,
                      top: `${territory.y}%`,
                    }}
                    title={territory.name}
                  >
                    <span
                      className={[
                        "block h-2.5 w-2.5 rounded-full border shadow-[0_0_10px_currentColor]",
                        seaNode
                          ? "border-sky-100/70 bg-sky-700 text-sky-400"
                          : "border-[#f2d29b]/70 bg-[#9b7b47] text-[#d9aa5a]",
                        isSelected ? "ring-2 ring-white" : "",
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
                  </button>
                );
              }

              if (!showCities) {
                return null;
              }

              return (
                <button
                  key={territory.id}
                  type="button"
                  onClick={() => setSelectedTerritoryId(territory.id)}
                  className="group absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center"
                  style={{
                    left: `${territory.x}%`,
                    top: `${territory.y}%`,
                  }}
                  title={territory.name}
                >
                  <span
                    className={[
                      "block rounded-full border border-black/90 shadow-[0_0_16px_currentColor]",
                      isCapital ? "h-5 w-5 ring-2 ring-[#d83a3a]" : "h-4 w-4",
                      isSelected ? "outline outline-2 outline-white" : "",
                    ].join(" ")}
                    style={{
                      backgroundColor: territory.is_disputed
                        ? "#dc2626"
                        : owner?.color ?? "#d7d7d7",
                      color: territory.is_disputed
                        ? "#dc2626"
                        : owner?.color ?? "#d7d7d7",
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
                        {territory.owner_kingdom_id === selectedKingdomId
                          ? Number(territory.soldiers ?? 0).toLocaleString("es-ES")
                          : "Desconocidos"}
                      </span>
                    </p>
                  </div>
                </button>
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

            {selectedTerritory && (
              <aside className="absolute right-5 top-5 z-20 w-[390px] border border-[#3a0c12] bg-black/85 shadow-2xl backdrop-blur">
                <div className="border-b border-[#3a0c12] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                        Selección
                      </p>

                      <h2 className="mt-3 text-2xl font-black uppercase leading-tight text-[#fff8ef]">
                        {selectedTerritory.name}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTerritoryId(null)}
                      className="border border-[#251014] bg-black/70 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#d7c9bd] transition hover:border-[#c3222b] hover:text-[#fff8ef]"
                    >
                      X
                    </button>
                  </div>

                  <div className="mt-4 space-y-2 text-sm leading-6 text-[#b6a9a1]">
                    <p>
                      Tipo:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {selectedTerritory.type === "CAPITAL"
                          ? "Capital"
                          : selectedTerritory.type === "CITY"
                            ? "Ciudad"
                            : isSeaNode(selectedTerritory.name)
                              ? "Nodo marítimo"
                              : "Nodo terrestre"}
                      </span>
                    </p>

                    <p>
                      Dueño:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {selectedTerritoryOwner?.name ?? "Sin dueño"}
                      </span>
                    </p>

                    {selectedTerritory.is_disputed && (
                      <p>
                        Estado:{" "}
                        <span className="font-black text-[#fca5a5]">
                          En disputa
                        </span>
                      </p>
                    )}

                    {!selectedIsStation && selectedIsOwned && (
                      <p>
                        Soldados:{" "}
                        <span className="font-black text-[#fff8ef]">
                          {Number(selectedTerritory.soldiers ?? 0).toLocaleString("es-ES")}
                        </span>
                      </p>
                    )}

                    {!selectedIsStation && !selectedIsOwned && selectedScoutReport && (
                      <p>
                        Último informe:{" "}
                        <span className="font-black text-[#fde68a]">
                          {Number(selectedScoutReport.observed_soldiers ?? 0).toLocaleString("es-ES")} soldados
                        </span>{" "}
                        <span className="text-[#7f7470]">
                          · Día {selectedScoutReport.game_day}
                        </span>
                      </p>
                    )}

                    {!selectedIsStation && !selectedIsOwned && !selectedScoutReport && (
                      <p>
                        Soldados:{" "}
                        <span className="font-black text-[#d83a3a]">
                          Desconocidos
                        </span>
                      </p>
                    )}

                    {!selectedIsStation &&
                      selectedIsOwned &&
                      selectedTerritoryEconomy && (
                        <div className="mt-6">
                          <CompactBuildingActions
                            territoryId={selectedTerritory.id}
                            territoryType={selectedTerritory.type}
                            gold={Number(selectedTerritoryEconomy.gold ?? 0)}
                            food={Number(selectedTerritoryEconomy.food ?? 0)}
                            goldBuildingLevel={Number(
                              selectedTerritoryEconomy.gold_building_level ?? 0,
                            )}
                            foodBuildingLevel={Number(
                              selectedTerritoryEconomy.food_building_level ?? 0,
                            )}
                            barracksLevel={Number(
                              selectedTerritoryEconomy.barracks_level ?? 0,
                            )}
                            pendingBuildingTypes={selectedPendingBuildingTypes}
                            action={orderBuildingUpgradeFromForm}
                          />
                        </div>
                      )}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  {!userEmail ? (
                    <Link
                      href="/login"
                      className="block border border-[#c3222b] bg-black/70 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition hover:bg-[#b91c1c]"
                    >
                      Entrar para actuar
                    </Link>
                  ) : !selectedKingdomId ? (
                    <Link
                      href="/mi-reino"
                      className="block border border-[#c3222b] bg-black/70 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition hover:bg-[#b91c1c]"
                    >
                      Elegir reino
                    </Link>
                  ) : selectedIsStation ? (
                    <div className="border border-[#251014] bg-black/45 p-4 text-sm leading-6 text-[#b6a9a1]">
                      Los nodos de viaje no tienen acciones directas.
                    </div>
                  ) : canReinforceSelected ? (
                    <form
                      key={`reinforce-${selectedTerritory.id}-${selectedTerritory.soldiers ?? "hidden"}-${reinforceState.message}`}
                      action={reinforceAction}
                      className="border border-[#251014] bg-black/45 p-4"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                        {selectedIsDisputeAttacker
                          ? "Reforzar asedio"
                          : "Reforzar territorio"}
                      </p>

                      <input
                        type="hidden"
                        name="targetTerritoryId"
                        value={selectedTerritory.id}
                      />

                      <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-[#d7c9bd]">
                        Origen
                      </label>
                      <select
                        name="fromTerritoryId"
                        required
                        disabled={!canReinforce}
                        className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-50"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Selecciona ciudad aliada conectada
                        </option>
                        {reinforcementOrigins.map((territory) => (
                          <option key={territory.id} value={territory.id}>
                            {territory.name} · {Number(territory.soldiers ?? 0).toLocaleString("es-ES")} soldados
                          </option>
                        ))}
                      </select>

                      <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-[#d7c9bd]">
                        Soldados
                      </label>
                      <input
                        type="number"
                        name="amount"
                        min="1"
                        step="1"
                        required
                        disabled={!canReinforce}
                        className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Cantidad"
                      />

                      <button
                        type="submit"
                        disabled={!canReinforce}
                        className="mt-4 w-full border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {reinforcePending
                          ? "Enviando..."
                          : reinforcementOrigins.length === 0
                            ? "Sin origen conectado"
                            : selectedIsDisputeAttacker
                              ? "Enviar al asedio"
                              : "Enviar refuerzo"}
                      </button>
                    </form>
                  ) : selectedIsEnemy && !selectedDispute ? (
                    <>
                      <form key={`scout-${selectedTerritory.id}-${scoutState.message}`} action={scoutAction}>
                        <input
                          type="hidden"
                          name="targetTerritoryId"
                          value={selectedTerritory.id}
                        />

                        <button
                          type="submit"
                          disabled={!canUseScout}
                          className="w-full border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {scoutPending
                            ? "Investigando..."
                            : scoutUsed
                              ? "Investigación usada"
                              : "Investigar tropas"}
                        </button>
                      </form>

                      <form
                        key={`attack-${selectedTerritory.id}-${attackState.message}`}
                        action={attackAction}
                        className="border border-[#251014] bg-black/45 p-4"
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                          Atacar territorio
                        </p>

                        <input
                          type="hidden"
                          name="targetTerritoryId"
                          value={selectedTerritory.id}
                        />

                        <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-[#d7c9bd]">
                          Origen
                        </label>
                        <select
                          name="fromTerritoryId"
                          required
                          disabled={!canAttack}
                          className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-50"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Selecciona ciudad aliada conectada
                          </option>
                          {attackOrigins.map((territory) => (
                            <option key={territory.id} value={territory.id}>
                              {territory.name} · {Number(territory.soldiers ?? 0).toLocaleString("es-ES")} soldados
                            </option>
                          ))}
                        </select>

                        <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-[#d7c9bd]">
                          Soldados
                        </label>
                        <input
                          type="number"
                          name="amount"
                          min="1"
                          step="1"
                          required
                          disabled={!canAttack}
                          className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Cantidad"
                        />

                        <button
                          type="submit"
                          disabled={!canAttack}
                          className="mt-4 w-full border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {attackPending
                            ? "Atacando..."
                            : !hasAttackOrigins
                              ? "Sin origen conectado"
                              : !hasAvailableAttackSoldiers
                                ? "Sin soldados disponibles"
                                : "Lanzar ataque"}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="border border-[#251014] bg-black/45 p-4 text-sm leading-6 text-[#b6a9a1]">
                      Este territorio no pertenece a ningún reino.
                    </div>
                  )}

                  {(scoutState.message || reinforceState.message || attackState.message) && (
                    <div
                      className={[
                        "border p-4 text-sm leading-6",
                        scoutState.ok || reinforceState.ok || attackState.ok
                          ? "border-[#3f6212] text-[#bef264]"
                          : "border-[#7f1d1d] text-[#fca5a5]",
                      ].join(" ")}
                    >
                      {attackState.message || reinforceState.message || scoutState.message}
                    </div>
                  )}

                  <div className="border border-[#251014] bg-black/45 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                      Día {currentDay} del {currentYear} d.C.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
                      Las acciones disponibles dependen de si el territorio es
                      aliado, enemigo o un nodo de viaje.
                    </p>
                  </div>
                </div>
              </aside>
            )}

            {showLegend && !selectedTerritory && (
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
