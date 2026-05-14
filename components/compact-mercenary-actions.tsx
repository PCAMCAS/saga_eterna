"use client";

import { useActionState } from "react";
import { ActionState, buyMercenaries } from "@/app/mi-reino/actions";

type CompactMercenaryActionsProps = {
  capitalId: string;
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

export function CompactMercenaryActions({
  capitalId,
  gold,
  mercenaries,
  isDisputed = false,
}: CompactMercenaryActionsProps) {
  const [state, formAction, pending] = useActionState(
    buyMercenaries,
    initialState,
  );

  const unitCost = isDisputed ? 20 : 10;

  return (
    <section className="mt-4 border border-[#251014] bg-black/45 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
        Mercenarios
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[#b6a9a1]">
        <p>
          Actuales:{" "}
          <span className="font-black text-[#fff8ef]">
            {formatNumber(mercenaries)}
          </span>
        </p>
        <p>
          Coste:{" "}
          <span className="font-black text-[#fff8ef]">{unitCost}</span>
        </p>
      </div>

      <form action={formAction} className="mt-3 flex gap-2">
        <input type="hidden" name="capitalId" value={capitalId} />

        <input
          type="number"
          name="amount"
          min={1}
          defaultValue={10}
          disabled={pending}
          className="min-w-0 flex-1 border border-[#3a0c12] bg-black/70 px-3 py-2 text-xs text-[#fff8ef] outline-none focus:border-[#c3222b]"
        />

        <button
          type="submit"
          disabled={pending || gold < unitCost}
          className="border border-[#7f1d1d] bg-black/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#fff8ef] transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? "..." : "Comprar"}
        </button>
      </form>

      {isDisputed && (
        <p className="mt-2 text-xs leading-5 text-[#fde68a]">
          Capital en disputa: coste doble.
        </p>
      )}

      {state.message && (
        <p
          className={[
            "mt-3 text-xs leading-5",
            state.ok ? "text-[#bef264]" : "text-[#fca5a5]",
          ].join(" ")}
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
