type BuildingType = "GOLD" | "FOOD" | "BARRACKS";

type BuildingUpgradeActionsProps = {
  territoryId: string;
  territoryName: string;
  territoryType: "CAPITAL" | "CITY" | "STATION";
  isDisputed?: boolean;
  gold: number;
  food: number;
  goldBuildingLevel: number;
  foodBuildingLevel: number;
  barracksLevel: number;
  pendingBuildingTypes?: BuildingType[];
  action: (formData: FormData) => void | Promise<void>;
};

const goldIncomeByLevel = [0, 25, 50, 100, 150, 225, 325, 450, 600, 800, 1000];
const foodIncomeByLevel = [0, 25, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000];
const barracksCapacityByLevel = [0, 10, 25, 50, 80, 120, 175, 250, 350, 500, 750];

function formatNumber(value: number) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

function buildingLabel(type: BuildingType) {
  if (type === "GOLD") return "Edificio de oro";
  if (type === "FOOD") return "Producción de comida";
  return "Cuartel";
}

function buildingDescription(type: BuildingType) {
  if (type === "GOLD") {
    return "Aumenta el oro diario generado por este territorio.";
  }

  if (type === "FOOD") {
    return "Produce comida para mantener soldados regulares.";
  }

  return "Permite entrenar soldados regulares desde la capital.";
}

function currentValue(type: BuildingType, level: number) {
  if (type === "GOLD") return `+${formatNumber(goldIncomeByLevel[level] ?? 0)} oro/día`;
  if (type === "FOOD") return `+${formatNumber(foodIncomeByLevel[level] ?? 0)} comida/día`;

  const capacity = barracksCapacityByLevel[level] ?? 0;
  return capacity <= 0 ? "Sin entrenamiento" : `${formatNumber(capacity)} soldados/día`;
}

function upgradeCost(type: BuildingType, nextLevel: number) {
  const base = type === "BARRACKS" ? 200 : 150;
  return base * Math.max(1, nextLevel);
}

function BuildingUpgradeCard({
  territoryId,
  type,
  currentLevel,
  maxLevel,
  gold,
  pending,
  action,
}: {
  territoryId: string;
  type: BuildingType;
  currentLevel: number;
  maxLevel: number;
  gold: number;
  pending: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const nextLevel = currentLevel + 1;
  const maxed = currentLevel >= maxLevel;
  const cost = upgradeCost(type, nextLevel);
  const canPay = gold >= cost;
  const disabled = maxed || pending || !canPay;

  return (
    <article className="grid gap-5 border border-[#251014] bg-black/45 p-5 xl:grid-cols-[minmax(0,1fr)_220px]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#d83a3a]">
              {buildingLabel(type)}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#b6a9a1]">
              {buildingDescription(type)}
            </p>
          </div>

          {pending && (
            <span className="border border-[#854d0e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#fde68a]">
              En construcción
            </span>
          )}

          {maxed && (
            <span className="border border-[#3f6212] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#bef264]">
              Nivel máximo
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="border border-[#251014] bg-black/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7f7470]">
              Actual
            </p>
            <p className="mt-2 text-2xl font-black text-[#fff8ef]">
              Nivel {currentLevel}
            </p>
            <p className="mt-2 text-sm leading-5 text-[#b6a9a1]">
              {currentValue(type, currentLevel)}
            </p>
          </div>

          <div className="border border-[#3a0c12] bg-black/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7f7470]">
              Siguiente
            </p>
            <p className="mt-2 text-2xl font-black text-[#fff8ef]">
              {maxed ? "Completo" : `Nivel ${nextLevel}`}
            </p>
            <p className="mt-2 text-sm leading-5 text-[#b6a9a1]">
              {maxed ? "No hay más mejoras disponibles." : currentValue(type, nextLevel)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between border border-[#251014] bg-black/55 p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
            Coste
          </p>
          <p className="mt-2 text-3xl font-black text-[#f7c873]">
            {maxed ? "—" : formatNumber(cost)}
          </p>
          {!maxed && (
            <p className="mt-1 text-xs text-[#7f7470]">
              oro requerido
            </p>
          )}
        </div>

        <form action={action} className="mt-5">
          <input type="hidden" name="territoryId" value={territoryId} />
          <input type="hidden" name="buildingType" value={type} />

          <button
            type="submit"
            disabled={disabled}
            className="w-full border border-[#c3222b] bg-black/70 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#fff8ef] transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {maxed
              ? "Completado"
              : pending
                ? "Pendiente"
                : !canPay
                  ? "Oro insuficiente"
                  : "Mejorar"}
          </button>
        </form>

        {!maxed && !pending && !canPay && (
          <p className="mt-3 text-xs leading-5 text-[#fca5a5]">
            Necesitas {formatNumber(cost)} oro en este territorio.
          </p>
        )}
      </div>
    </article>
  );
}

export function BuildingUpgradeActions({
  territoryId,
  territoryName,
  territoryType,
  isDisputed = false,
  gold,
  goldBuildingLevel,
  foodBuildingLevel,
  barracksLevel,
  pendingBuildingTypes = [],
  action,
}: BuildingUpgradeActionsProps) {
  if (territoryType === "STATION") {
    return null;
  }

  const isCapital = territoryType === "CAPITAL";
  const maxLevel = isCapital ? 10 : 3;

  const availableBuildings: BuildingType[] = isCapital
    ? ["GOLD", "FOOD", "BARRACKS"]
    : ["GOLD"];

  return (
    <section className="border border-[#251014] bg-black/35">
      <div className="border-b border-[#251014] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#d83a3a]">
              Gestión económica
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-[#fff8ef]">
              {territoryName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
              {isCapital
                ? "Capital: puede mejorar oro, comida y cuartel."
                : "Ciudad: solo puede mejorar producción de oro."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="border border-[#854d0e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#f7c873]">
              Oro: {formatNumber(gold)}
            </span>
            <span className="border border-[#251014] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#d7c9bd]">
              Máx. nivel {maxLevel}
            </span>
            {isDisputed && (
              <span className="border border-[#7f1d1d] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#fca5a5]">
                En disputa
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        {availableBuildings.map((type) => (
          <BuildingUpgradeCard
            key={type}
            territoryId={territoryId}
            type={type}
            currentLevel={
              type === "GOLD"
                ? goldBuildingLevel
                : type === "FOOD"
                  ? foodBuildingLevel
                  : barracksLevel
            }
            maxLevel={maxLevel}
            gold={gold}
            pending={pendingBuildingTypes.includes(type)}
            action={action}
          />
        ))}
      </div>
    </section>
  );
}
