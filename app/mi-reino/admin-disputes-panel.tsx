"use client";

import { useActionState } from "react";
import { ActionState, resolveTerritoryDispute } from "./actions";

type Kingdom = {
  id: string;
  name: string;
};

type Territory = {
  id: string;
  name: string;
};

type TerritoryDispute = {
  id: string;
  territory_id: string;
  attacker_kingdom_id: string;
  defender_kingdom_id: string;
  attacker_soldiers: number;
  defender_soldiers_at_open: number;
  opened_day: number;
};

type AdminDisputesPanelProps = {
  disputes: TerritoryDispute[];
  territories: Territory[];
  kingdoms: Kingdom[];
};

const initialState: ActionState = {
  ok: false,
  message: "",
};

export function AdminDisputesPanel({
  disputes,
  territories,
  kingdoms,
}: AdminDisputesPanelProps) {
  const [state, formAction, pending] = useActionState(
    resolveTerritoryDispute,
    initialState,
  );

  const territoryById = new Map(
    territories.map((territory) => [territory.id, territory]),
  );

  const kingdomById = new Map(kingdoms.map((kingdom) => [kingdom.id, kingdom]));

  return (
    <section className="border border-[#7f1d1d] bg-black/45">
      <div className="border-b border-[#7f1d1d] p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#fca5a5]">
          Administración
        </p>
        <h2 className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
          Disputas territoriales
        </h2>
      </div>

      <div className="space-y-4 p-6">
        {disputes.length === 0 ? (
          <p className="text-sm leading-6 text-[#b6a9a1]">
            No hay territorios en disputa.
          </p>
        ) : (
          disputes.map((dispute) => {
            const territory = territoryById.get(dispute.territory_id);
            const attacker = kingdomById.get(dispute.attacker_kingdom_id);
            const defender = kingdomById.get(dispute.defender_kingdom_id);

            return (
              <form
                key={dispute.id}
                action={formAction}
                className="border border-[#251014] bg-black/45 p-4"
              >
                <input type="hidden" name="disputeId" value={dispute.id} />

                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                  Día {dispute.opened_day}
                </p>

                <h3 className="mt-2 text-xl font-black text-[#fff8ef]">
                  {territory?.name ?? "Territorio desconocido"}
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#b6a9a1]">
                  Atacante:{" "}
                  <span className="font-black text-[#fff8ef]">
                    {attacker?.name ?? "Desconocido"}
                  </span>
                </p>

                <p className="text-sm leading-6 text-[#b6a9a1]">
                  Defensor:{" "}
                  <span className="font-black text-[#fff8ef]">
                    {defender?.name ?? "Desconocido"}
                  </span>
                </p>

                <p className="text-sm leading-6 text-[#b6a9a1]">
                  Fuerza de asedio:{" "}
                  <span className="font-black text-[#fff8ef]">
                    {Number(dispute.attacker_soldiers ?? 0).toLocaleString(
                      "es-ES",
                    )}
                  </span>
                </p>

                <select
                  name="winnerKingdomId"
                  required
                  disabled={pending}
                  className="mt-4 w-full border border-[#3a0c12] bg-black/70 px-3 py-3 text-sm text-[#fff8ef] outline-none transition focus:border-[#c3222b] disabled:cursor-not-allowed disabled:opacity-60"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Elegir ganador
                  </option>
                  <option value={dispute.attacker_kingdom_id}>
                    {attacker?.name ?? "Atacante"}
                  </option>
                  <option value={dispute.defender_kingdom_id}>
                    {defender?.name ?? "Defensor"}
                  </option>
                </select>

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-4 w-full border border-[#c3222b] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Resolviendo..." : "Resolver disputa"}
                </button>
              </form>
            );
          })
        )}

        {state.message && (
          <div
            className={[
              "border p-4 text-sm leading-6",
              state.ok
                ? "border-[#3f6212] text-[#bef264]"
                : "border-[#7f1d1d] text-[#fca5a5]",
            ].join(" ")}
          >
            {state.message}
          </div>
        )}
      </div>
    </section>
  );
}
