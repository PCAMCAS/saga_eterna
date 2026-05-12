type Kingdom = {
  id: string;
  name: string;
};

type Territory = {
  id: string;
  name: string;
};

type ScoutReport = {
  id: string;
  territory_id: string;
  territory_owner_kingdom_id: string | null;
  game_day: number;
  year: number;
  observed_soldiers: number;
  created_at: string | null;
};

type ScoutReportsPanelProps = {
  reports: ScoutReport[];
  territories: Territory[];
  kingdoms: Kingdom[];
};

function formatSoldiers(value: number) {
  return value.toLocaleString("es-ES");
}

export function ScoutReportsPanel({
  reports,
  territories,
  kingdoms,
}: ScoutReportsPanelProps) {
  const territoryById = new Map(
    territories.map((territory) => [territory.id, territory]),
  );

  const kingdomById = new Map(kingdoms.map((kingdom) => [kingdom.id, kingdom]));

  return (
    <section className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
          Inteligencia militar
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
          Informes de exploración
        </h2>
        <p className="mt-4 text-sm leading-6 text-[#b6a9a1]">
          Últimos datos conocidos por tus exploradores. Estos números reflejan
          el momento de la exploración, no necesariamente la situación actual.
        </p>
      </div>

      <div className="space-y-3 p-6">
        {reports.length === 0 ? (
          <p className="text-sm leading-6 text-[#b6a9a1]">
            Aún no tienes informes de exploración.
          </p>
        ) : (
          reports.slice(0, 12).map((report) => {
            const territory = territoryById.get(report.territory_id);
            const owner = report.territory_owner_kingdom_id
              ? kingdomById.get(report.territory_owner_kingdom_id)
              : null;

            return (
              <article
                key={report.id}
                className="border border-[#251014] bg-black/45 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                      Día {report.game_day} · {report.year} d.C.
                    </p>

                    <h3 className="mt-2 text-xl font-black text-[#fff8ef]">
                      {territory?.name ?? "Territorio desconocido"}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
                      Dueño observado:{" "}
                      <span className="font-black text-[#fff8ef]">
                        {owner?.name ?? "Sin dueño"}
                      </span>
                    </p>
                  </div>

                  <div className="min-w-32 border border-[#3a0c12] bg-black/45 p-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d83a3a]">
                      Tropas vistas
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#fff8ef]">
                      {formatSoldiers(Number(report.observed_soldiers ?? 0))}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
