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

type PlayerDisputesPanelProps = {
  disputes: TerritoryDispute[];
  territories: Territory[];
  kingdoms: Kingdom[];
  selectedKingdomId: string;
};

function formatSoldiers(value: number) {
  return value.toLocaleString("es-ES");
}

export function PlayerDisputesPanel({
  disputes,
  territories,
  kingdoms,
  selectedKingdomId,
}: PlayerDisputesPanelProps) {
  const territoryById = new Map(
    territories.map((territory) => [territory.id, territory]),
  );

  const kingdomById = new Map(kingdoms.map((kingdom) => [kingdom.id, kingdom]));

  const ownSieges = disputes.filter(
    (dispute) => dispute.attacker_kingdom_id === selectedKingdomId,
  );

  const ownDefenses = disputes.filter(
    (dispute) => dispute.defender_kingdom_id === selectedKingdomId,
  );

  return (
    <section className="border border-[#7f1d1d] bg-black/45">
      <div className="border-b border-[#7f1d1d] p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#fca5a5]">
          Territorios en disputa
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
          Batallas pendientes
        </h2>
        <p className="mt-4 text-sm leading-6 text-[#b6a9a1]">
          Estos territorios no se resolverán automáticamente. Requieren una
          batalla presencial y decisión final del administrador.
        </p>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[#fca5a5]">
            Asedios propios
          </h3>

          <div className="mt-4 space-y-3">
            {ownSieges.length === 0 ? (
              <p className="text-sm leading-6 text-[#b6a9a1]">
                Tu facción no mantiene ningún asedio pendiente.
              </p>
            ) : (
              ownSieges.map((dispute) => {
                const territory = territoryById.get(dispute.territory_id);
                const defender = kingdomById.get(dispute.defender_kingdom_id);

                return (
                  <article
                    key={dispute.id}
                    className="border border-[#7f1d1d] bg-black/45 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                      Abierta el día {dispute.opened_day}
                    </p>

                    <h4 className="mt-2 text-xl font-black text-[#fff8ef]">
                      {territory?.name ?? "Territorio desconocido"}
                    </h4>

                    <p className="mt-3 text-sm leading-6 text-[#b6a9a1]">
                      Defensor:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {defender?.name ?? "Desconocido"}
                      </span>
                    </p>

                    <p className="text-sm leading-6 text-[#b6a9a1]">
                      Fuerza de asedio registrada:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {formatSoldiers(Number(dispute.attacker_soldiers ?? 0))}
                      </span>
                    </p>

                    <div className="mt-4 border border-[#251014] bg-black/45 p-3 text-sm leading-6 text-[#fca5a5]">
                      Pendiente de batalla presencial. Puedes seguir enviando
                      refuerzos hacia la zona mientras siga abierta.
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[#fde68a]">
            Defensas pendientes
          </h3>

          <div className="mt-4 space-y-3">
            {ownDefenses.length === 0 ? (
              <p className="text-sm leading-6 text-[#b6a9a1]">
                Ningún territorio de tu facción está actualmente en disputa.
              </p>
            ) : (
              ownDefenses.map((dispute) => {
                const territory = territoryById.get(dispute.territory_id);
                const attacker = kingdomById.get(dispute.attacker_kingdom_id);

                return (
                  <article
                    key={dispute.id}
                    className="border border-[#854d0e] bg-black/45 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                      Abierta el día {dispute.opened_day}
                    </p>

                    <h4 className="mt-2 text-xl font-black text-[#fff8ef]">
                      {territory?.name ?? "Territorio desconocido"}
                    </h4>

                    <p className="mt-3 text-sm leading-6 text-[#b6a9a1]">
                      Atacante:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {attacker?.name ?? "Desconocido"}
                      </span>
                    </p>

                    <p className="text-sm leading-6 text-[#b6a9a1]">
                      Fuerza enemiga registrada:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {formatSoldiers(Number(dispute.attacker_soldiers ?? 0))}
                      </span>
                    </p>

                    <div className="mt-4 border border-[#251014] bg-black/45 p-3 text-sm leading-6 text-[#fde68a]">
                      El territorio sigue bajo tu bandera, pero está asediado.
                      Refuérzalo antes de la batalla presencial.
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
