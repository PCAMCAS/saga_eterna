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

type TerritoryDisputeAttacker = {
  id: string;
  dispute_id: string;
  kingdom_id: string;
  soldiers: number;
};

type AdminDisputesPanelProps = {
  disputes: TerritoryDispute[];
  attackers: TerritoryDisputeAttacker[];
  territories: Territory[];
  kingdoms: Kingdom[];
};

const initialState: ActionState = {
  ok: false,
  message: "",
};

function formatSoldiers(value: number) {
  return value.toLocaleString("es-ES");
}

export function AdminDisputesPanel({
  disputes,
  attackers,
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
            const defender = kingdomById.get(dispute.defender_kingdom_id);

            const disputeAttackers = attackers
              .filter((attacker) => attacker.dispute_id === dispute.id)
              .sort((a, b) => Number(b.soldiers ?? 0) - Number(a.soldiers ?? 0));

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

                <div className="mt-4 border border-[#854d0e] bg-black/45 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#fde68a]">
                    Defensor
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
                    <span className="font-black text-[#fff8ef]">
                      {defender?.name ?? "Desconocido"}
                    </span>
                    {" · "}
                    {formatSoldiers(
                      Number(dispute.defender_soldiers_at_open ?? 0),
                    )}{" "}
                    soldados al abrirse
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#fca5a5]">
                    Atacantes
                  </p>

                  {disputeAttackers.length === 0 ? (
                    <p className="text-sm leading-6 text-[#b6a9a1]">
                      No hay atacantes registrados.
                    </p>
                  ) : (
                    disputeAttackers.map((attacker) => {
                      const kingdom = kingdomById.get(attacker.kingdom_id);

                      return (
                        <div
                          key={attacker.id}
                          className="flex items-center justify-between gap-3 border border-[#251014] bg-black/45 px-3 py-2 text-sm"
                        >
                          <span className="font-black text-[#fff8ef]">
                            {kingdom?.name ?? "Reino desconocido"}
                          </span>
                          <span className="text-[#fca5a5]">
                            {formatSoldiers(Number(attacker.soldiers ?? 0))}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

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

                  <option value={dispute.defender_kingdom_id}>
                    Defensor · {defender?.name ?? "Desconocido"}
                  </option>

                  {disputeAttackers.map((attacker) => {
                    const kingdom = kingdomById.get(attacker.kingdom_id);

                    return (
                      <option key={attacker.id} value={attacker.kingdom_id}>
                        Atacante · {kingdom?.name ?? "Desconocido"} ·{" "}
                        {formatSoldiers(Number(attacker.soldiers ?? 0))} soldados
                      </option>
                    );
                  })}
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
