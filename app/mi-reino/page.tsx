import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { selectKingdom, signOut } from "./actions";

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
  owner_kingdom_id: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  kingdom_id: string | null;
};

type Route = {
  id: string;
  from_territory_id: string;
  to_territory_id: string;
  travel_hours: number;
  route_type: "LAND" | "SEA";
};

export default async function MiReinoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let kingdoms: Kingdom[] = [];
  let ownedTerritories: Territory[] = [];
  let adjacentTerritories: {
    origin: Territory;
    target: Territory;
    route: Route;
    owner: Kingdom | null;
  }[] = [];

  if (user) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, username, kingdom_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { data: createdProfile } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username: user.email,
        })
        .select("id, username, kingdom_id")
        .single();

      profile = createdProfile as Profile | null;
    } else {
      profile = existingProfile as Profile;
    }

    const [
      { data: kingdomData },
      { data: territoryData },
      { data: routeData },
    ] = await Promise.all([
      supabase.from("kingdoms").select("*").order("name"),
      supabase.from("territories").select("*").order("name"),
      supabase.from("routes").select("*"),
    ]);

    kingdoms = (kingdomData ?? []) as Kingdom[];

    const allTerritories = (territoryData ?? []) as Territory[];
    const allRoutes = (routeData ?? []) as Route[];

    if (profile?.kingdom_id) {
      ownedTerritories = allTerritories
        .filter((territory) => territory.owner_kingdom_id === profile?.kingdom_id)
        .sort((a, b) => {
          if (a.type === "CAPITAL" && b.type !== "CAPITAL") return -1;
          if (a.type !== "CAPITAL" && b.type === "CAPITAL") return 1;
          return a.name.localeCompare(b.name);
        });

      const ownedById = new Map(
        ownedTerritories.map((territory) => [territory.id, territory]),
      );

      const territoryById = new Map(
        allTerritories.map((territory) => [territory.id, territory]),
      );

      const kingdomById = new Map(
        kingdoms.map((kingdom) => [kingdom.id, kingdom]),
      );

      adjacentTerritories = allRoutes
        .flatMap((route) => {
          const origin = ownedById.get(route.from_territory_id);
          const target = territoryById.get(route.to_territory_id);

          if (!origin || !target || target.type === "STATION") {
            return [];
          }

          const owner = target.owner_kingdom_id
            ? kingdomById.get(target.owner_kingdom_id) ?? null
            : null;

          return [
            {
              origin,
              target,
              route,
              owner,
            },
          ];
        })
        .sort((a, b) => {
          const ownerCompare = (a.owner?.name ?? "").localeCompare(
            b.owner?.name ?? "",
          );

          if (ownerCompare !== 0) return ownerCompare;

          return a.target.name.localeCompare(b.target.name);
        });
    }
  }

  const selectedKingdom = kingdoms.find(
    (kingdom) => kingdom.id === profile?.kingdom_id,
  );

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
            <Link href="/mapa" className="transition hover:text-[#e12b2b]">
              Mapa
            </Link>
            <Link href="/registro-global" className="transition hover:text-[#e12b2b]">
              Registro
            </Link>
            <Link href="/facciones" className="transition hover:text-[#e12b2b]">
              Facciones
            </Link>
            <Link href="/mi-reino" className="text-[#e12b2b]">
              Mi Reino
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-8 py-12">
        <div className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-8">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Panel del jugador
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none text-[#fff8ef]">
              Mi Reino
            </h1>
            <p className="mt-5 max-w-2xl leading-7 text-[#b6a9a1]">
              Consulta tus dominios, territorios conectados y futuras acciones
              diarias.
            </p>
          </div>

          <div className="p-8">
            {!user ? (
              <div className="border border-[#251014] bg-black/45 p-6">
                <h2 className="text-2xl font-black text-[#fff8ef]">
                  No has iniciado sesión
                </h2>
                <p className="mt-4 leading-7 text-[#b6a9a1]">
                  Necesitas entrar o registrarte para seleccionar un reino y
                  participar en la campaña.
                </p>

                <Link
                  href="/login"
                  className="mt-6 inline-flex border border-[#c3222b] bg-black/70 px-6 py-4 text-sm font-black uppercase tracking-[0.3em] text-[#fff8ef] transition hover:bg-[#b91c1c]"
                >
                  Entrar
                </Link>
              </div>
            ) : selectedKingdom ? (
              <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
                <div className="space-y-8">
                  <div className="border border-[#251014] bg-black/45 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                      Reino jurado
                    </p>

                    <div className="mt-5 flex items-center gap-4">
                      <span
                        className="h-5 w-5 rounded-full shadow-[0_0_22px_currentColor]"
                        style={{
                          backgroundColor: selectedKingdom.color,
                          color: selectedKingdom.color,
                        }}
                      />
                      <div>
                        <h2 className="text-3xl font-black text-[#fff8ef]">
                          {selectedKingdom.name}
                        </h2>
                        <p className="mt-1 text-sm font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                          {selectedKingdom.leader ?? "Sin líder"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 leading-7 text-[#b6a9a1]">
                      {selectedKingdom.description ?? "Sin descripción."}
                    </p>

                    <div className="mt-6 border border-[#3a0c12] bg-[#090304] p-4">
                      <p className="text-sm leading-6 text-[#d7c9bd]">
                        Has jurado lealtad a este reino. Esta elección es
                        irreversible para esta cuenta.
                      </p>
                    </div>
                  </div>

                  <div className="border border-[#251014] bg-black/45">
                    <div className="border-b border-[#251014] p-6">
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                        Tus dominios
                      </p>
                      <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
                        Territorios
                      </h2>
                    </div>

                    <div className="grid gap-4 p-6 md:grid-cols-2">
                      {ownedTerritories.map((territory) => (
                        <article
                          key={territory.id}
                          className="border border-[#251014] bg-black/45 p-5"
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                            {territory.type === "CAPITAL" ? "Capital" : "Ciudad"}
                          </p>

                          <h3 className="mt-3 text-2xl font-black text-[#fff8ef]">
                            {territory.name}
                          </h3>

                          <p className="mt-4 text-sm leading-6 text-[#b6a9a1]">
                            Soldados disponibles:{" "}
                            <span className="font-black text-[#fff8ef]">
                              {territory.soldiers.toLocaleString("es-ES")}
                            </span>
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="border border-[#251014] bg-black/45">
                    <div className="border-b border-[#251014] p-6">
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                        Fronteras y caminos
                      </p>
                      <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
                        Conexiones cercanas
                      </h2>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto p-6">
                      {adjacentTerritories.length === 0 ? (
                        <p className="text-sm leading-6 text-[#b6a9a1]">
                          No hay territorios conectados visibles desde tus
                          dominios.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {adjacentTerritories.map(({ origin, target, route, owner }) => {
                            const isOwn =
                              target.owner_kingdom_id === selectedKingdom.id;

                            return (
                              <article
                                key={`${origin.id}-${target.id}`}
                                className="border border-[#251014] bg-black/45 p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div>
                                    <p className="text-xs leading-6 text-[#b6a9a1]">
                                      Desde{" "}
                                      <span className="font-black text-[#fff8ef]">
                                        {origin.name}
                                      </span>
                                    </p>

                                    <h3 className="text-xl font-black text-[#fff8ef]">
                                      {target.name}
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-[#b6a9a1]">
                                      Dueño:{" "}
                                      <span className="font-black text-[#fff8ef]">
                                        {owner?.name ?? "Sin dueño"}
                                      </span>
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <span
                                      className={[
                                        "inline-flex border px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em]",
                                        isOwn
                                          ? "border-[#3f6212] text-[#bef264]"
                                          : "border-[#7f1d1d] text-[#fca5a5]",
                                      ].join(" ")}
                                    >
                                      {isOwn ? "Aliado" : "Frontera"}
                                    </span>

                                    <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-[#d83a3a]">
                                      {route.travel_hours}h ·{" "}
                                      {route.route_type === "SEA"
                                        ? "Marítima"
                                        : "Terrestre"}
                                    </p>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <aside className="space-y-6">
                  <div className="border border-[#251014] bg-black/45 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                      Cuenta
                    </p>
                    <p className="mt-4 text-lg font-black text-[#fff8ef]">
                      {user.email}
                    </p>

                    <form action={signOut}>
                      <button
                        type="submit"
                        className="mt-6 w-full border border-[#3a0c12] bg-black/70 px-5 py-3 text-xs font-black uppercase tracking-[0.28em] text-[#fff8ef] transition hover:border-[#c3222b] hover:bg-[#b91c1c]"
                      >
                        Cerrar sesión
                      </button>
                    </form>
                  </div>

                  <div className="border border-[#251014] bg-black/45">
                    <div className="border-b border-[#251014] p-6">
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                        Acciones diarias
                      </p>
                      <h2 className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
                        Próximamente
                      </h2>
                    </div>

                    <div className="space-y-4 p-6">
                      <article className="border border-[#251014] bg-black/45 p-4">
                        <h3 className="font-black text-[#fff8ef]">
                          Reforzar territorio
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
                          Mover soldados entre territorios aliados respetando
                          24 horas por tramo.
                        </p>
                      </article>

                      <article className="border border-[#251014] bg-black/45 p-4">
                        <h3 className="font-black text-[#fff8ef]">
                          Mover tropas al enemigo
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
                          Enviar soldados hacia territorios enemigos conectados.
                        </p>
                      </article>

                      <article className="border border-[#251014] bg-black/45 p-4">
                        <h3 className="font-black text-[#fff8ef]">
                          Investigar tropas
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#b6a9a1]">
                          Revelar tropas de un territorio al registro global.
                        </p>
                      </article>
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              <div>
                <div className="border border-[#251014] bg-black/45 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                    Sesión activa
                  </p>

                  <h2 className="mt-4 text-2xl font-black text-[#fff8ef]">
                    {user.email}
                  </h2>

                  <p className="mt-4 leading-7 text-[#b6a9a1]">
                    Aún no has elegido reino. Escoge con cuidado: esta decisión
                    no podrá cambiarse después.
                  </p>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  {kingdoms.map((kingdom) => (
                    <form
                      key={kingdom.id}
                      action={selectKingdom}
                      className="border border-[#251014] bg-black/45 p-6 transition hover:border-[#c3222b]"
                    >
                      <input
                        type="hidden"
                        name="kingdomId"
                        value={kingdom.id}
                      />

                      <div className="flex items-center gap-4">
                        <span
                          className="h-5 w-5 rounded-full shadow-[0_0_22px_currentColor]"
                          style={{
                            backgroundColor: kingdom.color,
                            color: kingdom.color,
                          }}
                        />
                        <div>
                          <h3 className="text-2xl font-black text-[#fff8ef]">
                            {kingdom.name}
                          </h3>
                          <p className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                            {kingdom.leader ?? "Sin líder"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-5 min-h-20 leading-7 text-[#b6a9a1]">
                        {kingdom.description ?? "Sin descripción."}
                      </p>

                      <button
                        type="submit"
                        className="mt-6 w-full border border-[#c3222b] bg-black/70 px-5 py-4 text-sm font-black uppercase tracking-[0.28em] text-[#fff8ef] transition hover:bg-[#b91c1c]"
                      >
                        Jurar lealtad
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
