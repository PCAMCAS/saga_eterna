"use client";

import { useActionState } from "react";
import { ActionState, advanceGameDay } from "./actions";

const initialState: ActionState = {
  ok: false,
  message: "",
};

type AdvanceDayPanelProps = {
  currentDay: number;
  currentYear: number;
};

export function AdvanceDayPanel({
  currentDay,
  currentYear,
}: AdvanceDayPanelProps) {
  const [state, formAction, pending] = useActionState(
    advanceGameDay,
    initialState,
  );

  return (
    <section className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
          Control temporal
        </p>
        <h2 className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
          Día {currentDay} del {currentYear} d.C.
        </h2>
      </div>

      <form action={formAction} className="p-6">
        <p className="text-sm leading-6 text-[#b6a9a1]">
          Herramienta provisional para probar llegadas de refuerzos y el paso
          del tiempo.
        </p>

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.28em] text-[#fff8ef] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Avanzando..." : "Avanzar día"}
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
    </section>
  );
}
