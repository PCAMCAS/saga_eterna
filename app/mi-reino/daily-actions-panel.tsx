"use client";

import { useActionState } from "react";
import { ActionState, scoutTerritory } from "./actions";

type ScoutTarget = {
  id: string;
  name: string;
  ownerName: string;
};

type DailyActionsPanelProps = {
  territories: ScoutTarget[];
  scoutUsed: boolean;
  currentDay: number;
  currentYear: number;
};

const initialState: ActionState = {
  ok: false,
  message: "",
};

export function DailyActionsPanel({
  territories,
  scoutUsed,
  currentDay,
  currentYear,
}: DailyActionsPanelProps) {
  const [state, formAction, pending] = useActionState(
    scoutTerritory,
    initialState,
  );

  return (
    <section className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] bg-black/50 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#d83a3a]">
          Acciones diarias
        </p>
        <h3 className="mt-2 text-xl font-black uppercase text-[#fff8ef]">
          Día {currentDay} del {currentYear} d.C.
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#b6a9a1]">
          Acciones limitadas que puedes ejecutar una vez por día.
        </p>
      </div>

      <div className="p-5">
        <div className="border border-[#251014] bg-black/45 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#fff8ef]">
                Investigar tropas
              </p>
              <p className="mt-2 text-xs leading-5 text-[#b6a9a1]">
                Revela las tropas de un territorio enemigo y publica el
                resultado en el registro global.
              </p>
            </div>

            <span
              className={[
                "border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                scoutUsed
                  ? "border-[#854d0e] text-[#fde68a]"
                  : "border-[#3f6212] text-[#bef264]",
              ].join(" ")}
            >
              {scoutUsed ? "Usada" : "Disponible"}
            </span>
          </div>

          <form action={formAction} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                Objetivo
              </span>
              <select
                name="targetTerritoryId"
                required
                disabled={pending || scoutUsed || territories.length === 0}
                className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecciona territorio
                </option>
                {territories.map((territory) => (
                  <option key={territory.id} value={territory.id}>
                    {territory.name} · {territory.ownerName}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={pending || scoutUsed || territories.length === 0}
              className="w-full border border-[#c3222b] bg-black/70 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#fff8ef] transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {pending
                ? "Investigando..."
                : scoutUsed
                  ? "Investigación usada"
                  : territories.length === 0
                    ? "Sin objetivos"
                    : "Investigar"}
            </button>
          </form>

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
        </div>
      </div>
    </section>
  );
}
