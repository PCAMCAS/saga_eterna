"use client";

import { useActionState } from "react";
import { ActionState, buyMercenaries } from "./actions";

type MercenaryPurchasePanelProps = {
  capitalId: string;
  capitalName: string;
  gold: number;
  mercenaries: number;
  isDisputed?: boolean;
};

const initialState: ActionState = {
  ok: false,
  message: "",
};

function formatNumber(value: number) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

export function MercenaryPurchasePanel({
  capitalId,
  capitalName,
  gold,
  mercenaries,
  isDisputed = false,
}: MercenaryPurchasePanelProps) {
  const [state, formAction, pending] = useActionState(
    buyMercenaries,
    initialState,
  );

  const unitCost = isDisputed ? 20 : 10;

  return (
    <section className="mt-5 border border-[#3a0c12] bg-black/45 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
            Cuartel de mercenarios
          </p>
          <h4 className="mt-2 text-xl font-black text-[#fff8ef]">
            {capitalName}
          </h4>
          <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
            Los mercenarios llegan inmediatamente a la capital.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-right">
          <div className="border border-[#251014] bg-black/45 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7f7470]">
              Mercenarios
            </p>
            <p className="mt-1 text-2xl font-black text-[#fff8ef]">
              {formatNumber(mercenaries)}
            </p>
          </div>

          <div className="border border-[#251014] bg-black/45 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7f7470]">
              Coste
            </p>
            <p className="mt-1 text-2xl font-black text-[#fff8ef]">
              {unitCost}
            </p>
          </div>
        </div>
      </div>

      {isDisputed && (
        <div className="mt-4 border border-[#854d0e] bg-black/45 p-3 text-sm leading-6 text-[#fde68a]">
          Capital en disputa: los mercenarios cobran el doble por entrar en una
          zona de asedio.
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
            defaultValue={10}
            disabled={pending}
            className="mt-2 w-full border border-[#3a0c12] bg-black/70 px-4 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:opacity-60"
          />
        </label>

        <button
          type="submit"
          disabled={pending || gold < unitCost}
          className="self-end border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#fff8ef] transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? "Contratando..." : "Contratar"}
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
