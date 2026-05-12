import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type Kingdom = {
  id: string;
  name: string;
  leader: string | null;
  description: string | null;
  color: string;
};

type Territory = {
  id: string;
  name: string;
  type: "CAPITAL" | "CITY" | "STATION";
  x: number;
  y: number;
  soldiers: number;
  owner_kingdom_id: string;
};

export default async function MapaPage() {
  const supabase = await createClient();

  const [{ data: kingdoms }, { data: territories }] = await Promise.all([
    supabase.from("kingdoms").select("*").order("name"),
    supabase.from("territories").select("*").order("name"),
  ]);

  const kingdomList = (kingdoms ?? []) as Kingdom[];
  const territoryList = (territories ?? []) as Territory[];

  const kingdomById = new Map(
    kingdomList.map((kingdom) => [kingdom.id, kingdom]),
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-[#f3eee8]">
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-[#3a0c12] bg-black/80 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-lg font-black uppercase tracking-[0.22em] text-[#fff8ef]"
          >
            Saga <span className="text-[#8f2228]">·</span> Eterna
          </Link>

          <nav className="flex items-center gap-6 text-xs font-black uppercase tracking-[0.32em] text-[#d7c9bd]">
            <Link href="/mundo" className="transition hover:text-[#e12b2b]">
              Volver al mundo
            </Link>
            <Link href="/registro-global" className="transition hover:text-[#e12b2b]">
              Registro
            </Link>
            <Link href="/mi-reino" className="transition hover:text-[#e12b2b]">
              Mi Reino
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative h-screen w-screen pt-[73px]">
        <div className="relative h-full w-full overflow-auto bg-[#050203]">
          <div className="relative mx-auto min-w-[1500px] max-w-[1900px]">
            <img
              src="/maps/saga-eterna-map.png"
              alt="Mapa de Saga Eterna"
              className="block w-full select-none"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />

            {territoryList.map((territory) => {
              const owner = kingdomById.get(territory.owner_kingdom_id);
              const isCapital = territory.type === "CAPITAL";

              return (
                <div
                  key={territory.id}
                  className="group absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${territory.x}%`,
                    top: `${territory.y}%`,
                  }}
                >
                  <div className="relative flex flex-col items-center">
                    <span
                      className={[
                        "block rounded-full border border-black shadow-[0_0_18px_currentColor]",
                        isCapital ? "h-5 w-5" : "h-4 w-4",
                      ].join(" ")}
                      style={{
                        backgroundColor: owner?.color ?? "#d7d7d7",
                        color: owner?.color ?? "#d7d7d7",
                      }}
                    />

                    <span
                      className={[
                        "mt-1 whitespace-nowrap bg-black/80 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#fff8ef] shadow-lg",
                        isCapital
                          ? "border border-[#d83a3a]"
                          : "border border-black/70",
                      ].join(" ")}
                    >
                      {territory.name}
                    </span>

                    <div className="pointer-events-none absolute left-1/2 top-10 z-40 hidden w-64 -translate-x-1/2 border border-[#3a0c12] bg-[#050203]/95 p-4 text-left shadow-2xl group-hover:block">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                        {isCapital ? "Capital" : "Ciudad"}
                      </p>

                      <h3 className="mt-2 text-xl font-black text-[#fff8ef]">
                        {territory.name}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-[#b6a9a1]">
                        Dueño:{" "}
                        <span className="font-black text-[#fff8ef]">
                          {owner?.name ?? "Desconocido"}
                        </span>
                      </p>

                      <p className="text-sm leading-6 text-[#b6a9a1]">
                        Líder:{" "}
                        <span className="font-black text-[#fff8ef]">
                          {owner?.leader ?? "Desconocido"}
                        </span>
                      </p>

                      <p className="text-sm leading-6 text-[#b6a9a1]">
                        Soldados:{" "}
                        <span className="font-black text-[#fff8ef]">
                          {territory.soldiers.toLocaleString("es-ES")}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </section>
    </main>
  );
}
