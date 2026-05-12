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

type PlayerDisputesPanelProps = {
  disputes: TerritoryDispute[];
  attackers: TerritoryDisputeAttacker[];
  territories: Territory[];
  kingdoms: Kingdom[];
  selectedKingdomId: string;
};

function formatSoldiers(value: number) {
  return value.toLocaleString("es-ES");
}

export function PlayerDisputesPanel({
  disputes,
  attackers,
  territories,
  kingdoms,
  selectedKingdomId,
}: PlayerDisputesPanelProps) {
  const territoryById = new Map(
    territories.map((territory) => [territory.id, territory]),
  );

  const kingdomById = new Map(kingdoms.map((kingdom) => [kingdom.id, kingdom]));

  const participatesInDispute = (dispute: TerritoryDispute) => {
    return (
      dispute.defender_kingdom_id === selectedKingdomId ||
      attackers.some(
        (attacker) =>
          attacker.dispute_id === dispute.id &&
          attacker.kingdom_id === selectedKingdomId,
      )
    );
  };

  const visibleDisputes = disputes.filter(participatesInDispute);

  const ownSieges = visibleDisputes.filter((dispute) =>
    attackers.some(
      (attacker) =>
        attacker.dispute_id === dispute.id &&
        attacker.kingdom_id === selectedKingdomId,
    ),
  );

  const ownDefenses = visibleDisputes.filter(
    (dispute) => dispute.defender_kingdom_id === selectedKingdomId,
  );

  const renderAttackers = (dispute: TerritoryDispute) => {
    const disputeAttackers = attackers
      .filter((attacker) => attacker.dispute_id === dispute.id)
      .sort((a, b) => {
        const aIsOwn = a.kingdom_id === selectedKingdomId;
        const bIsOwn = b.kingdom_id === selectedKingdomId;

        if (aIsOwn && !bIsOwn) return -1;
        if (!aIsOwn && bIsOwn) return 1;

        return kingdomById
          .get(a.kingdom_id)
          ?.name.localeCompare(kingdomById.get(b.kingdom_id)?.name ?? "") ?? 0;
      });

    if (disputeAttackers.length === 0) {
      return (
        <p className="mt-3 text-sm leading-6 text-[#b6a9a1]">
          No hay fuerzas atacantes registradas.
        </p>
      );
    }

    return (
      <div className="mt-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
          Fuerzas atacantes
        </p>

        {disputeAttackers.map((attacker) => {
          const kingdom = kingdomById.get(attacker.kingdom_id);
          const isOwnForce = attacker.kingdom_id === selectedKingdomId;

          return (
            <div
              key={attacker.id}
              className={[
                "flex items-center justify-between gap-3 border bg-black/45 px-3 py-2 text-sm",
                isOwnForce ? "border-[#854d0e]" : "border-[#251014]",
              ].join(" ")}
            >
              <span className="font-black text-[#fff8ef]">
                {kingdom?.name ?? "Reino desconocido"}
                {isOwnForce ? " · Tus tropas" : ""}
              </span>

              <span className={isOwnForce ? "text-[#fde68a]" : "text-[#d83a3a]"}>
                {isOwnForce
                  ? formatSoldiers(Number(attacker.soldiers ?? 0))
                  : "Desconocidas"}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

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
                const ownForce = attackers.find(
                  (attacker) =>
                    attacker.dispute_id === dispute.id &&
                    attacker.kingdom_id === selectedKingdomId,
                );

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
                      Tu fuerza de asedio:{" "}
                      <span className="font-black text-[#fde68a]">
                        {formatSoldiers(Number(ownForce?.soldiers ?? 0))}
                      </span>
                    </p>

                    {renderAttackers(dispute)}

                    <div className="mt-4 border border-[#251014] bg-black/45 p-3 text-sm leading-6 text-[#fca5a5]">
                      Pendiente de batalla presencial. Puedes seguir enviando
                      refuerzos hacia el asedio mientras siga abierto.
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
                      Defensores al abrirse la disputa:{" "}
                      <span className="font-black text-[#fff8ef]">
                        Propios
                      </span>
                    </p>

                    {renderAttackers(dispute)}

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
