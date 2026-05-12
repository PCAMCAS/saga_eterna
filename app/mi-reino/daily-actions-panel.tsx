"use client";

import { useActionState } from "react";
import { ActionState, scoutTerritory } from "./actions";

type TerritoryOption = {
  id: string;
  name: string;
  ownerName: string;
};

type DailyActionsPanelProps = {
  territories: TerritoryOption[];
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
    <div className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
          Acciones diarias
        </p>
        <h2 className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
          Día {currentDay} del {currentYear} d.C.
        </h2>
      </div>

      <div className="space-y-5 p-6">
        <form action={formAction} className="border border-[#251014] bg-black/45 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-black text-[#fff8ef]">
                Investigar tropas
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
                Revela las tropas de una ciudad del mundo. El resultado se
                publicará para todos en el registro global.
              </p>
            </div>

            <span
              className={[
                "border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                scoutUsed
                  ? "border-[#7f1d1d] text-[#fca5a5]"
                  : "border-[#3f6212] text-[#bef264]",
              ].join(" ")}
            >
              {scoutUsed ? "Usada" : "Disponible"}
            </span>
          </div>

          <select
            name="targetTerritoryId"
            disabled={scoutUsed || pending}
            required
            className="mt-5 w-full border border-[#3a0c12] bg-black/70 px-4 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-60"
            defaultValue=""
          >
            <option value="" disabled>
              Selecciona territorio
            </option>

            {territories.map((territory) => (
              <option key={territory.id} value={territory.id}>
                {territory.name} — {territory.ownerName}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={scoutUsed || pending}
            className="mt-4 w-full border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.28em] text-[#fff8ef] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Enviando exploradores..." : "Investigar"}
          </button>

          {state.message && (
            <div
              className={[
                "mt-4 border p-4 text-sm leading-6",
                state.ok
                  ? "border-[#3f6212] text-[#bef264]"
                  : "border-[#7f1d1d] text-[#fca5a5]",
              ].join(" ")}
            >
              {state.message}
            </div>
          )}
        </form>

        <article className="border border-[#251014] bg-black/45 p-4 opacity-70">
          <h3 className="font-black text-[#fff8ef]">
            Reforzar territorio
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
            Próximamente: mover soldados entre territorios aliados respetando 24
            horas por tramo.
          </p>
        </article>

        <article className="border border-[#251014] bg-black/45 p-4 opacity-70">
          <h3 className="font-black text-[#fff8ef]">
            Mover tropas al enemigo
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
            Próximamente: enviar soldados hacia territorios enemigos conectados.
          </p>
        </article>
      </div>
    </div>
  );
}
