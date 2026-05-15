import { StatusChip } from "./kingdom-ui";

type Territory = {
  id: string;
  name: string;
  type: "CAPITAL" | "CITY" | "STATION";
  soldiers: number;
  mercenaries?: number | null;
};

type ArmyOverviewPanelProps = {
  territories: Territory[];
};

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

function territoryStatus(territory: Territory) {
  const soldiers = Number(territory.soldiers ?? 0);
  const mercenaries = Number(territory.mercenaries ?? 0);
  const total = soldiers + mercenaries;

  if (territory.type === "CAPITAL" && total > 0) {
    return { label: "Capital", tone: "gold" as const };
  }

  if (total <= 0) {
    return { label: "Vulnerable", tone: "danger" as const };
  }

  if (total < 10) {
    return { label: "Débil", tone: "warn" as const };
  }

  return { label: "Guarnecida", tone: "good" as const };
}

export function ArmyOverviewPanel({ territories }: ArmyOverviewPanelProps) {
  const battleTerritories = territories.filter(
    (territory) => territory.type !== "STATION",
  );

  const totalSoldiers = battleTerritories.reduce(
    (total, territory) => total + Number(territory.soldiers ?? 0),
    0,
  );

  const totalMercenaries = battleTerritories.reduce(
    (total, territory) => total + Number(territory.mercenaries ?? 0),
    0,
  );

  const vulnerable = battleTerritories.filter(
    (territory) =>
      Number(territory.soldiers ?? 0) + Number(territory.mercenaries ?? 0) <= 0,
  );

  return (
    <section id="ejercito" className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] bg-gradient-to-r from-[#120507] to-black p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
              Ejército y guarniciones
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
              Estado militar del reino
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#b6a9a1]">
              Vista compacta de la fuerza defensiva de tus territorios. Refuerza
              ciudades vulnerables antes de que el enemigo alcance tus rutas.
            </p>
          </div>

          <div className="grid min-w-[320px] grid-cols-3 gap-3">
            <div className="border border-[#251014] bg-black/55 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
                Soldados
              </p>
              <p className="mt-2 text-3xl font-black text-[#fff8ef]">
                {formatNumber(totalSoldiers)}
              </p>
            </div>

            <div className="border border-[#251014] bg-black/55 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
                Merc.
              </p>
              <p className="mt-2 text-3xl font-black text-[#f7c873]">
                {formatNumber(totalMercenaries)}
              </p>
            </div>

            <div className="border border-[#251014] bg-black/55 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
                Total
              </p>
              <p className="mt-2 text-3xl font-black text-[#bef264]">
                {formatNumber(totalSoldiers + totalMercenaries)}
              </p>
            </div>
          </div>
        </div>

        {vulnerable.length > 0 && (
          <div className="mt-5 border border-[#7f1d1d] bg-[#190506]/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#fca5a5]">
              Alerta de guarnición
            </p>
            <p className="mt-2 text-sm leading-6 text-[#fca5a5]">
              {vulnerable.length === 1
                ? `${vulnerable[0].name} no tiene tropas.`
                : `${vulnerable.length} territorios no tienen tropas: ${vulnerable
                    .map((territory) => territory.name)
                    .join(", ")}.`}
            </p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto p-6">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#251014] text-[10px] font-black uppercase tracking-[0.28em] text-[#d83a3a]">
              <th className="py-3 pr-4">Territorio</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Soldados</th>
              <th className="px-4 py-3 text-right">Mercenarios</th>
              <th className="px-4 py-3 text-right">Fuerza</th>
              <th className="py-3 pl-4 text-right">Estado</th>
            </tr>
          </thead>

          <tbody>
            {battleTerritories.map((territory) => {
              const soldiers = Number(territory.soldiers ?? 0);
              const mercenaries = Number(territory.mercenaries ?? 0);
              const status = territoryStatus(territory);

              return (
                <tr
                  key={territory.id}
                  className="border-b border-[#16090c] text-sm text-[#d7c9bd]"
                >
                  <td className="py-4 pr-4">
                    <div>
                      <p className="font-black uppercase text-[#fff8ef]">
                        {territory.name}
                      </p>
                      {territory.type === "CAPITAL" && (
                        <p className="mt-1 text-xs text-[#f7c873]">
                          Centro político y militar
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {territory.type === "CAPITAL" ? "Capital" : "Ciudad"}
                  </td>
                  <td className="px-4 py-4 text-right font-black text-[#fff8ef]">
                    {formatNumber(soldiers)}
                  </td>
                  <td className="px-4 py-4 text-right font-black text-[#f7c873]">
                    {formatNumber(mercenaries)}
                  </td>
                  <td className="px-4 py-4 text-right font-black text-[#bef264]">
                    {formatNumber(soldiers + mercenaries)}
                  </td>
                  <td className="py-4 pl-4 text-right">
                    <StatusChip tone={status.tone}>{status.label}</StatusChip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
