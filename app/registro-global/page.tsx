import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type GlobalLog = {
  id: string;
  game_day: number;
  year: number;
  message: string;
  type: string;
  created_at: string;
};

const logTypeLabels: Record<string, string> = {
  CONQUEST: "Conquista",
  DEFENSE: "Defensa",
  SCOUT: "Exploración",
  REINFORCEMENT: "Refuerzo",
  SYSTEM: "Sistema",
};

export default async function RegistroGlobalPage() {
  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from("global_logs")
    .select("*")
    .order("game_day", { ascending: false })
    .order("created_at", { ascending: false });

  const logList = (logs ?? []) as GlobalLog[];

  const logsByDay = logList.reduce<Record<string, GlobalLog[]>>((acc, log) => {
    const key = `${log.game_day}-${log.year}`;
    acc[key] ??= [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050203] text-[#f3eee8]">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_18%_82%,rgba(244,214,170,0.10),transparent_17%),radial-gradient(circle_at_48%_18%,rgba(125,18,31,0.36),transparent_34%),radial-gradient(circle_at_82%_70%,rgba(60,7,14,0.44),transparent_26%),linear-gradient(135deg,#040102_0%,#160509_45%,#050203_100%)]" />
      <div className="fixed inset-0 opacity-[0.10] bg-[radial-gradient(circle_at_20%_30%,rgba(255,245,225,0.24)_0_1px,transparent_1px),radial-gradient(circle_at_70%_60%,rgba(255,245,225,0.16)_0_1px,transparent_1px)] bg-[size:52px_52px,38px_38px]" />

      <header className="relative z-10 border-b border-[#3a0c12] bg-black/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <Link
            href="/"
            className="text-xl font-black uppercase tracking-[0.22em] text-[#fff8ef]"
          >
            Saga <span className="text-[#8f2228]">·</span> Eterna
          </Link>

          <nav className="flex gap-8 text-xs font-black uppercase tracking-[0.38em] text-[#d7c9bd]">
            <Link href="/mundo" className="transition hover:text-[#e12b2b]">
              Mundo
            </Link>
            <Link href="/registro-global" className="text-[#e12b2b]">
              Registro
            </Link>
            <Link href="/facciones" className="transition hover:text-[#e12b2b]">
              Facciones
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-8 py-12">
        <div className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-8">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Archivo histórico
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none text-[#fff8ef]">
              Registro global
            </h1>
            <p className="mt-5 max-w-2xl leading-7 text-[#b6a9a1]">
              Aquí queda registrada la crónica completa del mundo: conquistas,
              defensas, exploraciones, refuerzos y sucesos de sistema.
            </p>
          </div>

          <div className="p-8">
            {error ? (
              <div className="border border-[#7f1d1d] bg-black/50 p-5">
                <p className="font-black uppercase tracking-[0.2em] text-[#ef4444]">
                  Error al cargar el registro
                </p>
                <pre className="mt-4 whitespace-pre-wrap text-sm text-[#d7c9bd]">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </div>
            ) : logList.length === 0 ? (
              <p className="text-[#b6a9a1]">
                Todavía no hay sucesos registrados.
              </p>
            ) : (
              <div className="space-y-8">
                {Object.entries(logsByDay).map(([key, dayLogs]) => {
                  const firstLog = dayLogs[0];

                  return (
                    <section key={key}>
                      <div className="mb-4 flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-[#c3222b] to-transparent" />
                        <h2 className="text-sm font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                          Día {firstLog.game_day} del {firstLog.year} d.C.
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-l from-[#c3222b] to-transparent" />
                      </div>

                      <div className="space-y-3">
                        {dayLogs.map((log) => (
                          <article
                            key={log.id}
                            className="border border-[#251014] bg-black/45 p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <p className="text-sm leading-7 text-[#f3eee8]">
                                {log.message}
                              </p>

                              <span className="border border-[#3a0c12] bg-[#120608] px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                                {logTypeLabels[log.type] ?? log.type}
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
