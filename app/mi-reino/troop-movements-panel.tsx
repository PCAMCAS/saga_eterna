type Territory = {
  id: string;
  name: string;
};

type TroopMovement = {
  id: string;
  movement_type: "REINFORCE" | "ATTACK";
  status: "IN_TRANSIT" | "RESOLVED" | "CANCELLED";
  source_territory_id: string;
  target_territory_id: string;
  soldiers: number;
  route_hours: number;
  departure_day: number;
  arrival_day: number;
};

type TroopMovementsPanelProps = {
  movements: TroopMovement[];
  territories: Territory[];
  currentDay: number;
};

function formatSoldiers(value: number) {
  return value.toLocaleString("es-ES");
}

function movementLabel(type: string) {
  if (type === "REINFORCE") return "Refuerzo";
  if (type === "ATTACK") return "Ataque";
  return type;
}

export function TroopMovementsPanel({
  movements,
  territories,
  currentDay,
}: TroopMovementsPanelProps) {
  const territoryById = new Map(
    territories.map((territory) => [territory.id, territory]),
  );

  const inTransit = movements.filter(
    (movement) => movement.status === "IN_TRANSIT",
  );

  return (
    <section className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
          Tropas en marcha
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
          Órdenes en tránsito
        </h2>
      </div>

      <div className="space-y-3 p-6">
        {inTransit.length === 0 ? (
          <p className="text-sm leading-6 text-[#b6a9a1]">
            No hay tropas desplazándose actualmente.
          </p>
        ) : (
          inTransit.map((movement) => {
            const source = territoryById.get(movement.source_territory_id);
            const target = territoryById.get(movement.target_territory_id);
            const daysLeft = Math.max(0, movement.arrival_day - currentDay);

            const progress =
              movement.arrival_day <= movement.departure_day
                ? 100
                : Math.min(
                    100,
                    Math.max(
                      0,
                      ((currentDay - movement.departure_day) /
                        (movement.arrival_day - movement.departure_day)) *
                        100,
                    ),
                  );

            return (
              <article
                key={movement.id}
                className="border border-[#251014] bg-black/45 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="border border-[#854d0e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#fde68a]">
                      {movementLabel(movement.movement_type)}
                    </span>

                    <h3 className="mt-4 text-xl font-black text-[#fff8ef]">
                      {source?.name ?? "Origen desconocido"} →{" "}
                      {target?.name ?? "Destino desconocido"}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
                      {formatSoldiers(Number(movement.soldiers ?? 0))} soldados
                      en marcha.
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                      Llegada
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#fff8ef]">
                      Día {movement.arrival_day}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-[#b6a9a1]">
                      {daysLeft === 0
                        ? "Pendiente de resolución"
                        : `${daysLeft} día${daysLeft === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden bg-[#1b0b0e]">
                  <div
                    className="h-full bg-[#d83a3a]"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-[#7f7470]">
                  Salida: día {movement.departure_day} · Ruta:{" "}
                  {movement.route_hours}h
                </p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
