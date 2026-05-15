type TerritoryLite = {
  name: string;
};

type PlayerActionLite = {
  id: string;
  type: string;
  game_day: number;
  source_territory_id: string | null;
  target_territory_id: string | null;
  soldiers: number | null;
};

type PublicLogLite = {
  id: string;
  type: string;
  game_day: number;
  message: string;
};

type OrdersLogPanelProps = {
  playerActions: PlayerActionLite[];
  ownPublicLogs: PublicLogLite[];
  territoryById: Map<string, TerritoryLite>;
  currentDay: number;
  todayReinforcements: unknown[];
  todayAttacks: unknown[];
  todayScouts: unknown[];
  conqueredToday: unknown[];
  todayMovedSoldiers: number;
};

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

function actionLabel(type: string) {
  if (type === "SCOUT") return "Exploración";
  if (type === "REINFORCE") return "Refuerzo";
  if (type === "ATTACK") return "Ataque";
  if (type === "RAID") return "Asalto";
  if (type === "BUILD") return "Construcción";
  if (type === "BUY_MERCENARIES") return "Mercenarios";
  if (type === "TRAIN_SOLDIERS") return "Entrenamiento";
  return type;
}

function actionTone(type: string) {
  if (type === "ATTACK") return "border-[#7f1d1d] text-[#fca5a5]";
  if (type === "RAID") return "border-[#854d0e] text-[#fde68a]";
  if (type === "REINFORCE") return "border-[#3f6212] text-[#bef264]";
  if (type === "SCOUT") return "border-[#0f3f4f] text-[#7dd3fc]";
  if (type === "BUILD") return "border-[#854d0e] text-[#f7c873]";
  return "border-[#251014] text-[#d7c9bd]";
}

function ActivityItem({
  label,
  day,
  title,
  detail,
  type,
}: {
  label: string;
  day: number;
  title: string;
  detail?: string;
  type: string;
}) {
  return (
    <article className="border border-[#251014] bg-black/45 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={[
            "border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
            actionTone(type),
          ].join(" ")}
        >
          {label}
        </span>

        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
          Día {day}
        </span>
      </div>

      <p className="mt-3 text-sm font-black text-[#fff8ef]">{title}</p>

      {detail && (
        <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">{detail}</p>
      )}
    </article>
  );
}

function BalanceTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "red" | "gold" | "blue";
}) {
  const toneClass =
    tone === "red"
      ? "text-[#fca5a5]"
      : tone === "gold"
        ? "text-[#f7c873]"
        : tone === "blue"
          ? "text-[#7dd3fc]"
          : "text-[#fff8ef]";

  return (
    <article className="border border-[#251014] bg-black/45 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
        {label}
      </p>
      <p className={["mt-3 text-3xl font-black", toneClass].join(" ")}>
        {value}
      </p>
    </article>
  );
}

export function OrdersLogPanel({
  playerActions,
  ownPublicLogs,
  territoryById,
  currentDay,
  todayReinforcements,
  todayAttacks,
  todayScouts,
  conqueredToday,
  todayMovedSoldiers,
}: OrdersLogPanelProps) {
  return (
    <section id="registro" className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] bg-gradient-to-r from-[#120507] to-black p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
          Actividad del Reino
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
          Órdenes, registro y balance
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[#b6a9a1]">
          Resumen operativo de las últimas órdenes privadas, eventos públicos y
          actividad del día actual.
        </p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_1fr]">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[#fde68a]">
              Órdenes recientes
            </h3>
            <span className="border border-[#251014] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
              Privadas
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {playerActions.length === 0 ? (
              <p className="border border-[#251014] bg-black/35 p-4 text-sm leading-6 text-[#b6a9a1]">
                Aún no has emitido órdenes.
              </p>
            ) : (
              playerActions.slice(0, 6).map((action) => {
                const source = action.source_territory_id
                  ? territoryById.get(action.source_territory_id)
                  : null;

                const target = action.target_territory_id
                  ? territoryById.get(action.target_territory_id)
                  : null;

                return (
                  <ActivityItem
                    key={action.id}
                    type={action.type}
                    label={actionLabel(action.type)}
                    day={action.game_day}
                    title={`${source?.name ?? "Origen desconocido"} → ${
                      target?.name ?? "Objetivo desconocido"
                    }`}
                    detail={
                      action.type === "SCOUT"
                        ? "Investigación realizada."
                        : Number(action.soldiers ?? 0) > 0
                          ? `Fuerza movilizada: ${formatNumber(
                              Number(action.soldiers ?? 0),
                            )}`
                          : undefined
                    }
                  />
                );
              })
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[#fca5a5]">
              Registro público propio
            </h3>
            <span className="border border-[#251014] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
              Eventos
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {ownPublicLogs.length === 0 ? (
              <p className="border border-[#251014] bg-black/35 p-4 text-sm leading-6 text-[#b6a9a1]">
                Tu reino todavía no ha generado eventos públicos.
              </p>
            ) : (
              ownPublicLogs.slice(0, 6).map((log) => (
                <ActivityItem
                  key={log.id}
                  type={log.type}
                  label={actionLabel(log.type)}
                  day={log.game_day}
                  title={log.message}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[#251014] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
              Balance del día
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-[#fff8ef]">
              Día {currentDay}
            </h3>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <BalanceTile label="Refuerzos" value={todayReinforcements.length} />
          <BalanceTile label="Ataques" value={todayAttacks.length} tone="red" />
          <BalanceTile label="Exploraciones" value={`${todayScouts.length}/1`} tone="blue" />
          <BalanceTile label="Conquistas" value={conqueredToday.length} tone="gold" />
          <BalanceTile
            label="Movilizados"
            value={formatNumber(todayMovedSoldiers)}
          />
        </div>
      </div>
    </section>
  );
}
