type PrivateLog = {
  id: string;
  game_day: number;
  year: number;
  type: "SYSTEM" | "ECONOMY" | "MERCENARIES" | "BUILD" | "TRAINING" | "WARNING";
  message: string;
  created_at: string | null;
};

type PrivateLogsPanelProps = {
  logs: PrivateLog[];
};

function typeLabel(type: PrivateLog["type"]) {
  if (type === "MERCENARIES") return "Mercenarios";
  if (type === "ECONOMY") return "Economía";
  if (type === "BUILD") return "Construcción";
  if (type === "TRAINING") return "Entrenamiento";
  if (type === "WARNING") return "Advertencia";
  return "Sistema";
}

export function PrivateLogsPanel({ logs }: PrivateLogsPanelProps) {
  return (
    <section className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
          Registro privado
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
          Informes internos
        </h2>
        <p className="mt-4 text-sm leading-6 text-[#b6a9a1]">
          Mensajes privados de tu facción: mantenimiento, deserciones,
          construcción y economía.
        </p>
      </div>

      <div className="space-y-3 p-6">
        {logs.length === 0 ? (
          <p className="text-sm leading-6 text-[#b6a9a1]">
            No hay informes privados todavía.
          </p>
        ) : (
          logs.slice(0, 12).map((log) => (
            <article
              key={log.id}
              className="border border-[#251014] bg-black/45 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                    {typeLabel(log.type)} · Día {log.game_day} · {log.year} d.C.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#d7c9bd]">
                    {log.message}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
