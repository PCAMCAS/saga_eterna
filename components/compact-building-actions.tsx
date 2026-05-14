"use client";

import { useFormStatus } from "react-dom";

type BuildingType = "GOLD" | "FOOD" | "BARRACKS";

type CompactBuildingActionsProps = {
  territoryId: string;
  territoryType: "CAPITAL" | "CITY" | "STATION";
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

function label(type: BuildingType) {
  if (type === "GOLD") return "Oro";
  if (type === "FOOD") return "Comida";
  return "Cuartel";
}

function cost(type: BuildingType, nextLevel: number) {
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

function CompactButton({
  disabled,
  children,
}: {
  disabled: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={[
        "border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition",
        disabled || pending
          ? "cursor-not-allowed border-[#251014] bg-black/40 text-[#665a55]"
          : "border-[#7f1d1d] bg-black/70 text-[#fff8ef] hover:bg-[#991b1b]",
      ].join(" ")}
    >
      {pending ? "..." : children}
    </button>
  );
}

function UpgradeMiniForm({
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
  const upgradeCost = cost(type, nextLevel);
  const maxed = currentLevel >= 3;
  const disabled = maxed || pending || !upgradeCost || gold < upgradeCost;

  return (
    <form action={action}>
      <input type="hidden" name="territoryId" value={territoryId} />
      <input type="hidden" name="buildingType" value={type} />

      <CompactButton disabled={disabled}>
        {maxed
          ? `${label(type)} máx.`
          : pending
            ? `${label(type)} en cola`
            : `${label(type)} N${nextLevel} · ${upgradeCost}`}
      </CompactButton>
    </form>
  );
}

export function CompactBuildingActions({
  territoryId,
  territoryType,
  gold,
  food,
  goldBuildingLevel,
  foodBuildingLevel,
  barracksLevel,
  pendingBuildingTypes = [],
  action,
}: CompactBuildingActionsProps) {
  if (territoryType === "STATION") {
    return null;
  }

  const isCapital = territoryType === "CAPITAL";

  return (
    <section className="mt-6 border border-[#251014] bg-black/45 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
        Economía
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[#b6a9a1]">
        <p>
          Oro:{" "}
          <span className="font-black text-[#fff8ef]">
            {formatNumber(gold)}
          </span>
        </p>
        <p>
          Comida:{" "}
          <span className="font-black text-[#fff8ef]">
            {formatNumber(food)}
          </span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <UpgradeMiniForm
          territoryId={territoryId}
          type="GOLD"
          currentLevel={goldBuildingLevel}
          gold={gold}
          pending={pendingBuildingTypes.includes("GOLD")}
          action={action}
        />

        {isCapital && (
          <>
            <UpgradeMiniForm
              territoryId={territoryId}
              type="FOOD"
              currentLevel={foodBuildingLevel}
              gold={gold}
              pending={pendingBuildingTypes.includes("FOOD")}
              action={action}
            />

            <UpgradeMiniForm
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

      <p className="mt-3 text-xs leading-5 text-[#7f7470]">
        Las mejoras se completan al inicio del siguiente día.
      </p>
    </section>
  );
}
