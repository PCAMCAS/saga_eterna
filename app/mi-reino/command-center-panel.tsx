type CommandCenterPanelProps = {
  vulnerableTerritories: string[];
  openDisputes: number;
  troopMovements: number;
  totalGold: number;
  totalFood: number;
  dailyGold: number;
  dailyFood: number;
};

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

export function CommandCenterPanel({
  vulnerableTerritories,
  openDisputes,
  troopMovements,
  totalGold,
  totalFood,
  dailyGold,
  dailyFood,
}: CommandCenterPanelProps) {
  const hasAlerts = vulnerableTerritories.length > 0 || openDisputes > 0;

  return (
    <section className="grid gap-5 xl:grid-cols-3">
      <article className="border border-[#251014] bg-black/45">
        <div className="border-b border-[#251014] bg-gradient-to-r from-[#120507] to-black p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#d83a3a]">
            Centro de mando
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
            Alertas prioritarias
          </h2>
        </div>

        <div className="space-y-3 p-5">
          {!hasAlerts ? (
            <div className="border border-[#3f6212] bg-black/45 p-4">
              <p className="text-sm font-black text-[#bef264]">
                El reino se mantiene estable.
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7f7470]">
                No hay disputas ni ciudades completamente desguarnecidas.
              </p>
            </div>
          ) : (
            <>
              {openDisputes > 0 && (
                <div className="border border-[#7f1d1d] bg-[#190506]/60 p-4">
                  <p className="text-sm font-black text-[#fca5a5]">
                    {openDisputes} disputa{openDisputes === 1 ? "" : "s"} activa
                    {openDisputes === 1 ? "" : "s"}.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#b6a9a1]">
                    Requiere resolución presencial o decisión administrativa.
                  </p>
                </div>
              )}

              {vulnerableTerritories.length > 0 && (
                <div className="border border-[#854d0e] bg-[#180d04]/60 p-4">
                  <p className="text-sm font-black text-[#fde68a]">
                    Ciudades vulnerables
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#b6a9a1]">
                    {vulnerableTerritories.join(", ")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </article>

      <article className="border border-[#251014] bg-black/45">
        <div className="border-b border-[#251014] bg-gradient-to-r from-[#120507] to-black p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#d83a3a]">
            Órdenes
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
            En tránsito
          </h2>
        </div>

        <div className="p-5">
          <p className="text-6xl font-black text-[#fff8ef]">
            {formatNumber(troopMovements)}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
            movimientos militares, asaltos o transportes de recursos pendientes de resolución.
          </p>

          <a
            href="#ordenes"
            className="mt-5 inline-flex border border-[#c3222b] bg-black/70 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#fff8ef] transition hover:bg-[#991b1b]"
          >
            Ver órdenes
          </a>
        </div>
      </article>

      <article className="border border-[#251014] bg-black/45">
        <div className="border-b border-[#251014] bg-gradient-to-r from-[#120507] to-black p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#d83a3a]">
            Balance
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
            Día económico
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5">
          <div className="border border-[#251014] bg-black/55 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
              Oro
            </p>
            <p className="mt-2 text-3xl font-black text-[#f7c873]">
              {formatNumber(totalGold)}
            </p>
            <p className="mt-1 text-xs text-[#7f7470]">
              +{formatNumber(dailyGold)}/día
            </p>
          </div>

          <div className="border border-[#251014] bg-black/55 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
              Comida
            </p>
            <p className="mt-2 text-3xl font-black text-[#bef264]">
              {formatNumber(totalFood)}
            </p>
            <p className="mt-1 text-xs text-[#7f7470]">
              +{formatNumber(dailyFood)}/día
            </p>
          </div>

          <a
            href="#economia"
            className="col-span-2 mt-2 border border-[#854d0e] bg-black/70 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.22em] text-[#fff8ef] transition hover:border-[#f59e0b] hover:text-[#fef3c7]"
          >
            Gestionar economía
          </a>
        </div>
      </article>
    </section>
  );
}
