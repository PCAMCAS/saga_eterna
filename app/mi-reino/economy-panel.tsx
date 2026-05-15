"use client";

import { BuildingUpgradeActions } from "@/components/building-upgrade-actions";
import { orderBuildingUpgradeFromForm } from "./actions";
import { MercenaryPurchasePanel } from "./mercenary-purchase-panel";
import { SoldierTrainingPanel } from "./soldier-training-panel";

type Territory = {
  id: string;
  name: string;
  type: "CAPITAL" | "CITY" | "STATION";
  is_disputed?: boolean;
  soldiers?: number | null;
  mercenaries?: number | null;
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

type SoldierTrainingOrder = {
  id: string;
  territory_id: string;
  soldiers: number;
  cost_gold: number;
  completes_day: number;
  completes_year: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
};

type EconomyPanelProps = {
  territories: Territory[];
  economy: TerritoryEconomy[];
  buildingOrders: BuildingOrder[];
  soldierTrainingOrders: SoldierTrainingOrder[];
};

function formatNumber(value: number) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

function goldIncomeForLevel(level: number) {
  if (level === 1) return 25;
  if (level === 2) return 50;
  if (level === 3) return 100;
  return 0;
}

function foodIncomeForLevel(level: number) {
  if (level === 1) return 25;
  if (level === 2) return 75;
  if (level === 3) return 150;
  return 0;
}

export function EconomyPanel({
  territories,
  economy,
  buildingOrders,
  soldierTrainingOrders,
}: EconomyPanelProps) {
  const economicTerritories = territories.filter(
    (territory) => territory.type !== "STATION",
  );

  const totalGold = economicTerritories.reduce((sum, territory) => {
    const entry = economy.find((item) => item.territory_id === territory.id);
    return sum + Number(entry?.gold ?? 0);
  }, 0);

  const totalFood = economicTerritories.reduce((sum, territory) => {
    const entry = economy.find((item) => item.territory_id === territory.id);
    return sum + Number(entry?.food ?? 0);
  }, 0);

  const dailyGold = economicTerritories.reduce((sum, territory) => {
    const entry = economy.find((item) => item.territory_id === territory.id);
    const level = Number(entry?.gold_building_level ?? 0);
    const base = territory.type === "CAPITAL" ? 100 : 0;

    return sum + base + goldIncomeForLevel(level);
  }, 0);

  const dailyFood = economicTerritories.reduce((sum, territory) => {
    const entry = economy.find((item) => item.territory_id === territory.id);
    const level = Number(entry?.food_building_level ?? 0);

    return sum + (territory.type === "CAPITAL" ? foodIncomeForLevel(level) : 0);
  }, 0);

  return (
    <section className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
          Economía del reino
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
          Oro, comida y edificios
        </h2>
        <p className="mt-4 text-sm leading-6 text-[#b6a9a1]">
          El oro está almacenado en cada territorio. Las construcciones se pagan
          desde el territorio donde se ordenan y se completan al inicio del
          siguiente día.
        </p>
      </div>

      <div className="grid gap-4 border-b border-[#251014] p-6 md:grid-cols-4">
        <article className="border border-[#3a0c12] bg-black/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
            Oro total
          </p>
          <p className="mt-2 text-3xl font-black text-[#fff8ef]">
            {formatNumber(totalGold)}
          </p>
        </article>

        <article className="border border-[#3a0c12] bg-black/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
            Comida total
          </p>
          <p className="mt-2 text-3xl font-black text-[#fff8ef]">
            {formatNumber(totalFood)}
          </p>
        </article>

        <article className="border border-[#3a0c12] bg-black/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
            Oro diario
          </p>
          <p className="mt-2 text-3xl font-black text-[#fff8ef]">
            +{formatNumber(dailyGold)}
          </p>
        </article>

        <article className="border border-[#3a0c12] bg-black/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
            Comida diaria
          </p>
          <p className="mt-2 text-3xl font-black text-[#fff8ef]">
            +{formatNumber(dailyFood)}
          </p>
        </article>
      </div>

      <div className="grid gap-6 p-6">
        {economicTerritories.length === 0 ? (
          <p className="text-sm leading-6 text-[#b6a9a1]">
            No tienes territorios económicos.
          </p>
        ) : (
          economicTerritories.map((territory) => {
            const entry = economy.find(
              (item) => item.territory_id === territory.id,
            );

            const pendingBuildingTypes = buildingOrders
              .filter(
                (order) =>
                  order.territory_id === territory.id &&
                  order.status === "PENDING",
              )
              .map((order) => order.building_type);

            return (
              <div key={territory.id}>
                <BuildingUpgradeActions
                  territoryId={territory.id}
                  territoryName={territory.name}
                  territoryType={territory.type}
                  isDisputed={Boolean(territory.is_disputed)}
                  gold={Number(entry?.gold ?? 0)}
                  food={Number(entry?.food ?? 0)}
                  goldBuildingLevel={Number(entry?.gold_building_level ?? 0)}
                  foodBuildingLevel={Number(entry?.food_building_level ?? 0)}
                  barracksLevel={Number(entry?.barracks_level ?? 0)}
                  pendingBuildingTypes={pendingBuildingTypes}
                  action={orderBuildingUpgradeFromForm}
                />

                {territory.type === "CAPITAL" && (
                  <>
                    <MercenaryPurchasePanel
                      capitalId={territory.id}
                      capitalName={territory.name}
                      gold={Number(entry?.gold ?? 0)}
                      mercenaries={Number(territory.mercenaries ?? 0)}
                      isDisputed={Boolean(territory.is_disputed)}
                    />

                    <SoldierTrainingPanel
                      capitalId={territory.id}
                      capitalName={territory.name}
                      gold={Number(entry?.gold ?? 0)}
                      soldiers={Number(territory.soldiers ?? 0)}
                      barracksLevel={Number(entry?.barracks_level ?? 0)}
                      pendingOrder={
                        soldierTrainingOrders.find(
                          (order) =>
                            order.territory_id === territory.id &&
                            order.status === "PENDING",
                        ) ?? null
                      }
                    />
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
