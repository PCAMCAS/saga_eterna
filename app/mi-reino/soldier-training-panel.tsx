"use client";

import { useActionState } from "react";
import { ActionState, trainSoldiers } from "./actions";

type SoldierTrainingOrder = {
  id: string;
  territory_id: string;
  soldiers: number;
  cost_gold: number;
  completes_day: number;
  completes_year: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
};

type SoldierTrainingPanelProps = {
  capitalId: string;
  capitalName: string;
  gold: number;
  soldiers: number;
  barracksLevel: number;
  pendingOrder?: SoldierTrainingOrder | null;
};

const initialState: ActionState = {
  ok: false,
  message: "",
};

function formatNumber(value: number) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

function capacityForLevel(level: number) {
  const capacities = [10, 25, 50, 80, 120, 175, 250, 350, 500, 750];

  if (level < 1 || level > 10) return 0;

  return capacities[level - 1] ?? 0;
}

function unitCostForLevel(level: number) {
  if (level >= 10) return 3;
  if (level >= 7) return 4;
  return 5;
}

export function SoldierTrainingPanel({
  capitalId,
  capitalName,
  gold,
  soldiers,
  barracksLevel,
  pendingOrder = null,
}: SoldierTrainingPanelProps) {
  const [state, formAction, pending] = useActionState(trainSoldiers, initialState);

  const capacity = capacityForLevel(barracksLevel);
  const unitCost = unitCostForLevel(barracksLevel);
  const canTrain = barracksLevel > 0 && !pendingOrder;

  return (
    <section className="mt-5 border border-[#3a0c12] bg-black/45 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
            Cuartel de soldados
          </p>
          <h4 className="mt-2 text-xl font-black text-[#fff8ef]">
            {capitalName}
          </h4>
          <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
            Los soldados regulares estarán disponibles al inicio del siguiente
            día. El coste depende del nivel del cuartel.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-right">
          <div className="border border-[#251014] bg-black/45 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7f7470]">
              Soldados
            </p>
            <p className="mt-1 text-2xl font-black text-[#fff8ef]">
              {formatNumber(soldiers)}
            </p>
          </div>

          <div className="border border-[#251014] bg-black/45 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7f7470]">
              Capacidad
            </p>
            <p className="mt-1 text-2xl font-black text-[#fff8ef]">
              {capacity}
            </p>
          </div>
        </div>
      </div>

      {barracksLevel <= 0 && (
        <div className="mt-4 border border-[#7f1d1d] bg-black/45 p-3 text-sm leading-6 text-[#fca5a5]">
          Necesitas construir un cuartel para entrenar soldados regulares.
        </div>
      )}

      {pendingOrder && (
        <div className="mt-4 border border-[#854d0e] bg-black/45 p-3 text-sm leading-6 text-[#fde68a]">
          En entrenamiento: {pendingOrder.soldiers} soldados. Finalizan el día{" "}
          {pendingOrder.completes_day} del año {pendingOrder.completes_year}.
        </div>
      )}

      <form action={formAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <input type="hidden" name="capitalId" value={capitalId} />

        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
            Cantidad
          </span>
          <input
            type="number"
            name="amount"
            min={1}
            max={capacity || undefined}
            defaultValue={capacity > 0 ? Math.min(10, capacity) : 1}
            disabled={pending || !canTrain}
            className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-4 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:opacity-60"
          />
        </label>

        <button
          type="submit"
          disabled={pending || !canTrain || gold < 5}
          className="self-end border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#fff8ef] transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? "Ordenando..." : "Entrenar"}
        </button>
      </form>

      <p className="mt-3 text-xs leading-5 text-[#7f7470]">
        Oro disponible en esta capital: {formatNumber(gold)}. Coste total =
        cantidad × {unitCost}.
      </p>

      {state.message && (
        <div
          className={[
            "mt-4 border p-3 text-sm leading-6",
            state.ok
              ? "border-[#3f6212] text-[#bef264]"
              : "border-[#7f1d1d] text-[#fca5a5]",
          ].join(" ")}
        >
          {state.message}
        </div>
      )}
    </section>
  );
}
