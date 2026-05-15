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

const goldIncomeByLevel = [0, 25, 50, 100, 150, 225, 325, 450, 600, 800, 1000];
const foodIncomeByLevel = [0, 25, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000];
const barracksCapacityByLevel = [0, 10, 25, 50, 80, 120, 175, 250, 350, 500, 750];

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

function getEconomyEntry(
  territoryId: string,
  economy: TerritoryEconomy[],
): TerritoryEconomy {
  return (
    economy.find((entry) => entry.territory_id === territoryId) ?? {
      territory_id: territoryId,
      gold: 0,
      food: 0,
      gold_building_level: 0,
      food_building_level: 0,
      barracks_level: 0,
    }
  );
}

function pendingTypesForTerritory(
  territoryId: string,
  buildingOrders: BuildingOrder[],
) {
  return buildingOrders
    .filter((order) => order.territory_id === territoryId && order.status === "PENDING")
    .map((order) => order.building_type);
}

function dailyGoldFor(territory: Territory, entry: TerritoryEconomy) {
  const buildingIncome = goldIncomeByLevel[entry.gold_building_level] ?? 0;
  return territory.type === "CAPITAL" ? 100 + buildingIncome : buildingIncome;
}

function dailyFoodFor(territory: Territory, entry: TerritoryEconomy) {
  if (territory.type !== "CAPITAL") return 0;
  return foodIncomeByLevel[entry.food_building_level] ?? 0;
}

function BuildingLevelPill({
  label,
  level,
  detail,
  tone = "red",
}: {
  label: string;
  level: number;
  detail: string;
  tone?: "red" | "gold" | "green";
}) {
  const toneClass =
    tone === "gold"
      ? "border-[#854d0e] text-[#f7c873]"
      : tone === "green"
        ? "border-[#3f6212] text-[#bef264]"
        : "border-[#3a0c12] text-[#fff8ef]";

  return (
    <div className={["border bg-black/45 p-4", toneClass].join(" ")}>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7f7470]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[#fff8ef]">
        Nivel {level}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#b6a9a1]">{detail}</p>
    </div>
  );
}

function ResourceBox({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: number;
  detail?: string;
  tone?: "neutral" | "gold" | "food" | "danger";
}) {
  const toneClass =
    tone === "gold"
      ? "text-[#f7c873]"
      : tone === "food"
        ? "text-[#bef264]"
        : tone === "danger"
          ? "text-[#fca5a5]"
          : "text-[#fff8ef]";

  return (
    <div className="border border-[#251014] bg-black/55 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d83a3a]">
        {label}
      </p>
      <p className={["mt-3 text-3xl font-black", toneClass].join(" ")}>
        {formatNumber(value)}
      </p>
      {detail && <p className="mt-2 text-xs leading-5 text-[#7f7470]">{detail}</p>}
    </div>
  );
}

function CityEconomyCard({
  territory,
  entry,
  pendingBuildingTypes,
}: {
  territory: Territory;
  entry: TerritoryEconomy;
  pendingBuildingTypes: Array<"GOLD" | "FOOD" | "BARRACKS">;
}) {
  return (
    <article className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] bg-black/45 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
              Ciudad económica
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-[#fff8ef]">
              {territory.name}
            </h3>
          </div>

          <span className="border border-[#854d0e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#fde68a]">
            Nivel máx. 3
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#b6a9a1]">
          Las ciudades producen oro mediante edificios económicos. La comida y
          el cuartel solo pertenecen a capitales.
        </p>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <ResourceBox
          label="Oro"
          value={entry.gold}
          detail="Almacenado"
          tone="gold"
        />
        <ResourceBox
          label="Oro diario"
          value={dailyGoldFor(territory, entry)}
          detail="Producción"
          tone="gold"
        />
        <ResourceBox
          label="Guarnición"
          value={Number(territory.soldiers ?? 0) + Number(territory.mercenaries ?? 0)}
          detail="Fuerza total"
        />
      </div>

      <div className="border-t border-[#251014] p-5">
        <BuildingUpgradeActions
          territoryId={territory.id}
          territoryName={territory.name}
          territoryType={territory.type}
          isDisputed={Boolean(territory.is_disputed)}
          gold={Number(entry.gold ?? 0)}
          food={Number(entry.food ?? 0)}
          goldBuildingLevel={Number(entry.gold_building_level ?? 0)}
          foodBuildingLevel={Number(entry.food_building_level ?? 0)}
          barracksLevel={Number(entry.barracks_level ?? 0)}
          pendingBuildingTypes={pendingBuildingTypes}
          action={orderBuildingUpgradeFromForm}
        />
      </div>
    </article>
  );
}

export function EconomyPanel({
  territories,
  economy,
  buildingOrders,
  soldierTrainingOrders,
}: EconomyPanelProps) {
  const capitals = territories.filter((territory) => territory.type === "CAPITAL");
  const cities = territories.filter((territory) => territory.type === "CITY");
  const primaryCapital = capitals[0];

  const totalGold = territories.reduce(
    (total, territory) => total + getEconomyEntry(territory.id, economy).gold,
    0,
  );

  const totalFood = territories.reduce(
    (total, territory) => total + getEconomyEntry(territory.id, economy).food,
    0,
  );

  const totalGoldDaily = territories.reduce(
    (total, territory) =>
      total + dailyGoldFor(territory, getEconomyEntry(territory.id, economy)),
    0,
  );

  const totalFoodDaily = territories.reduce(
    (total, territory) =>
      total + dailyFoodFor(territory, getEconomyEntry(territory.id, economy)),
    0,
  );

  if (!primaryCapital) {
    return (
      <section id="economia" className="border border-[#251014] bg-black/45 p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
          Economía del reino
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
          Sin capital
        </h2>
        <p className="mt-4 text-sm leading-6 text-[#b6a9a1]">
          Tu reino no tiene una capital controlada. La economía avanzada no está
          disponible.
        </p>
      </section>
    );
  }

  const capitalEntry = getEconomyEntry(primaryCapital.id, economy);
  const capitalPendingTypes = pendingTypesForTerritory(
    primaryCapital.id,
    buildingOrders,
  );

  const pendingTraining =
    soldierTrainingOrders.find(
      (order) =>
        order.territory_id === primaryCapital.id && order.status === "PENDING",
    ) ?? null;

  return (
    <section id="economia" className="space-y-6">
      <div className="border border-[#3a0c12] bg-gradient-to-br from-[#120507] via-black to-[#060304]">
        <div className="grid gap-6 border-b border-[#3a0c12] p-6 xl:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
              Economía del Reino
            </p>
            <h2 className="mt-3 text-4xl font-black uppercase text-[#fff8ef]">
              Oro, comida y edificios
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#b6a9a1]">
              El oro y la comida se almacenan en cada territorio. Las capitales
              concentran el poder económico, el entrenamiento y los mercenarios.
            </p>
          </div>

          <div className="grid min-w-[320px] grid-cols-2 gap-3">
            <ResourceBox label="Oro total" value={totalGold} tone="gold" />
            <ResourceBox label="Comida total" value={totalFood} tone="food" />
            <ResourceBox
              label="Oro diario"
              value={totalGoldDaily}
              detail="Producción"
              tone="gold"
            />
            <ResourceBox
              label="Comida diaria"
              value={totalFoodDaily}
              detail="Producción"
              tone="food"
            />
          </div>
        </div>

        <div className="p-6">
          <article className="border border-[#3a0c12] bg-black/55 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
            <div className="grid gap-6 border-b border-[#3a0c12] bg-gradient-to-r from-[#120507] to-black p-6 xl:grid-cols-[1fr_auto]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                  Capital económica
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h3 className="text-4xl font-black uppercase text-[#fff8ef]">
                    {primaryCapital.name}
                  </h3>
                  <span className="border border-[#854d0e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#f7c873]">
                    Capital · Nivel máx. 10
                  </span>
                  {primaryCapital.is_disputed && (
                    <span className="border border-[#7f1d1d] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#fca5a5]">
                      En disputa
                    </span>
                  )}
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#b6a9a1]">
                  La capital puede mejorar oro, comida y cuartel. Desde aquí se
                  compran mercenarios y se entrenan soldados regulares.
                </p>
              </div>

              <div className="grid min-w-[360px] grid-cols-2 gap-3">
                <ResourceBox
                  label="Oro almacenado"
                  value={capitalEntry.gold}
                  tone="gold"
                />
                <ResourceBox
                  label="Comida almacenada"
                  value={capitalEntry.food}
                  tone="food"
                />
              </div>
            </div>

            <div className="grid gap-5 border-b border-[#251014] p-6 xl:grid-cols-3">
              <BuildingLevelPill
                label="Edificio de oro"
                level={capitalEntry.gold_building_level}
                detail={`+${goldIncomeByLevel[capitalEntry.gold_building_level] ?? 0} oro/día`}
                tone="gold"
              />
              <BuildingLevelPill
                label="Producción de comida"
                level={capitalEntry.food_building_level}
                detail={`+${foodIncomeByLevel[capitalEntry.food_building_level] ?? 0} comida/día`}
                tone="green"
              />
              <BuildingLevelPill
                label="Cuartel"
                level={capitalEntry.barracks_level}
                detail={`${barracksCapacityByLevel[capitalEntry.barracks_level] ?? 0} soldados/día`}
              />
            </div>

            <div className="grid gap-6 p-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                  Mejoras de edificios
                </p>
                <div className="mt-4">
                  <BuildingUpgradeActions
                    territoryId={primaryCapital.id}
                    territoryName={primaryCapital.name}
                    territoryType={primaryCapital.type}
                    isDisputed={Boolean(primaryCapital.is_disputed)}
                    gold={Number(capitalEntry.gold ?? 0)}
                    food={Number(capitalEntry.food ?? 0)}
                    goldBuildingLevel={Number(capitalEntry.gold_building_level ?? 0)}
                    foodBuildingLevel={Number(capitalEntry.food_building_level ?? 0)}
                    barracksLevel={Number(capitalEntry.barracks_level ?? 0)}
                    pendingBuildingTypes={capitalPendingTypes}
                    action={orderBuildingUpgradeFromForm}
                  />
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <MercenaryPurchasePanel
                  capitalId={primaryCapital.id}
                  capitalName={primaryCapital.name}
                  gold={Number(capitalEntry.gold ?? 0)}
                  mercenaries={Number(primaryCapital.mercenaries ?? 0)}
                  isDisputed={Boolean(primaryCapital.is_disputed)}
                />

                <SoldierTrainingPanel
                  capitalId={primaryCapital.id}
                  capitalName={primaryCapital.name}
                  gold={Number(capitalEntry.gold ?? 0)}
                  soldiers={Number(primaryCapital.soldiers ?? 0)}
                  barracksLevel={Number(capitalEntry.barracks_level ?? 0)}
                  pendingOrder={pendingTraining}
                />
              </div>
            </div>
          </article>
        </div>
      </div>

      {cities.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {cities.map((territory) => {
            const entry = getEconomyEntry(territory.id, economy);
            const pendingBuildingTypes = pendingTypesForTerritory(
              territory.id,
              buildingOrders,
            );

            return (
              <CityEconomyCard
                key={territory.id}
                territory={territory}
                entry={entry}
                pendingBuildingTypes={pendingBuildingTypes}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
