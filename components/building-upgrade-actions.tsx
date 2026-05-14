"use client";

import { useFormStatus } from "react-dom";

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

function nextCost(type: BuildingType, nextLevel: number) {
  if (type === "BARRACKS") {
    if (nextLevel === 1) return 200;
    if (nextLevel === 2) return 400;
    if (nextLevel === 3) return 800;
    return null;
  }

  if (nextLevel === 1) return 150;
  if (nextLevel === 2) return 300;
  if (nextLevel === 3) return 600;

  return null;
}

function SubmitButton({
  disabled,
  cost,
}: {
  disabled: boolean;
  cost: number;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={[
        "mt-4 w-full border px-4 py-3 text-xs font-black uppercase tracking-[0.22em] transition",
        disabled || pending
          ? "cursor-not-allowed border-[#251014] bg-black/50 text-[#6f625c]"
          : "border-[#c3222b] bg-black/70 text-[#fff8ef] hover:bg-[#991b1b]",
      ].join(" ")}
    >
      {pending ? "Ordenando..." : `Mejorar · ${formatNumber(cost)} oro`}
    </button>
  );
}

function BuildingCard({
  territoryId,
  type,
  currentLevel,
  gold,
  pending,
  action,
}: {
  territoryId: string;
  type: BuildingType;
  currentLevel: number;
  gold: number;
  pending: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const nextLevel = currentLevel + 1;
  const cost = nextCost(type, nextLevel);
  const maxed = currentLevel >= 3;
  const disabled = maxed || pending || !cost || gold < cost;

  return (
    <article className="group relative overflow-hidden border border-[#3a0c12] bg-black/50 p-4 transition hover:border-[#7f1d1d]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(195,34,43,0.13),transparent_42%)] opacity-0 transition group-hover:opacity-100" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
              {buildingLabel(type)}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
              {buildingDescription(type)}
            </p>
          </div>

          {pending && (
            <span className="shrink-0 border border-[#854d0e] bg-[#1a1005] px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#fde68a]">
              En cola
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="border border-[#251014] bg-black/45 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7f7470]">
              Actual
            </p>
            <p className="mt-1 text-2xl font-black text-[#fff8ef]">
              {currentLevel}
            </p>
          </div>

          <div className="border border-[#251014] bg-black/45 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7f7470]">
              Siguiente
            </p>
            <p className="mt-1 text-2xl font-black text-[#fff8ef]">
              {maxed ? "Máx." : nextLevel}
            </p>
          </div>
        </div>

        {maxed ? (
          <div className="mt-4 border border-[#251014] bg-black/45 p-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f7470]">
            Nivel máximo alcanzado
          </div>
        ) : (
          <form action={action}>
            <input type="hidden" name="territoryId" value={territoryId} />
            <input type="hidden" name="buildingType" value={type} />

            <SubmitButton disabled={disabled} cost={cost ?? 0} />

            {cost && gold < cost && (
              <p className="mt-3 text-xs leading-5 text-[#fca5a5]">
                Oro insuficiente en este territorio. Necesitas{" "}
                {formatNumber(cost)} oro.
              </p>
            )}
          </form>
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
  food,
  goldBuildingLevel,
  foodBuildingLevel,
  barracksLevel,
  pendingBuildingTypes = [],
  action,
}: BuildingUpgradeActionsProps) {
  const isCapital = territoryType === "CAPITAL";

  if (territoryType === "STATION") {
    return null;
  }

  return (
    <section className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] p-5">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
          Gestión económica
        </p>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-[#fff8ef]">
              {territoryName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
              {isCapital
                ? "Capital: puede mejorar oro, comida y cuartel."
                : "Ciudad: solo puede mejorar producción de oro."}
            </p>
          </div>

          {isDisputed && (
            <span className="border border-[#7f1d1d] bg-black/60 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#fca5a5]">
              En disputa
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 border-b border-[#251014] p-5 md:grid-cols-2">
        <div className="border border-[#3a0c12] bg-black/50 p-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
            Oro almacenado
          </p>
          <p className="mt-2 text-3xl font-black text-[#fff8ef]">
            {formatNumber(gold)}
          </p>
        </div>

        <div className="border border-[#3a0c12] bg-black/50 p-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
            Comida almacenada
          </p>
          <p className="mt-2 text-3xl font-black text-[#fff8ef]">
            {formatNumber(food)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-3">
        <BuildingCard
          territoryId={territoryId}
          type="GOLD"
          currentLevel={goldBuildingLevel}
          gold={gold}
          pending={pendingBuildingTypes.includes("GOLD")}
          action={action}
        />

        {isCapital && (
          <>
            <BuildingCard
              territoryId={territoryId}
              type="FOOD"
              currentLevel={foodBuildingLevel}
              gold={gold}
              pending={pendingBuildingTypes.includes("FOOD")}
              action={action}
            />

            <BuildingCard
              territoryId={territoryId}
              type="BARRACKS"
              currentLevel={barracksLevel}
              gold={gold}
              pending={pendingBuildingTypes.includes("BARRACKS")}
              action={action}
            />
          </>
        )}
      </div>
    </section>
  );
}
