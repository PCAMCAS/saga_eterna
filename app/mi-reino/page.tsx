import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { selectKingdom, signOut } from "./actions";
import { DailyActionsPanel } from "./daily-actions-panel";
import { TroopMovementsPanel } from "./troop-movements-panel";
import { AdvanceDayPanel } from "./advance-day-panel";
import { AdminDisputesPanel } from "./admin-disputes-panel";
import { PlayerDisputesPanel } from "./player-disputes-panel";

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

type PlayerAction = {
  id: string;
  type: "SCOUT" | "REINFORCE" | "ATTACK";
  game_day: number;
  soldiers: number | null;
  source_territory_id: string | null;
  target_territory_id: string | null;
  created_at: string | null;
};

type GlobalLog = {
  id: string;
  game_day: number;
  year: number;
  message: string;
  type: string;
  territory_id: string | null;
  actor_kingdom_id: string | null;
  created_at: string | null;
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
  is_automatic: boolean;
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

function formatSoldiers(value: number) {
  return value.toLocaleString("es-ES");
}

function actionLabel(type: string) {
  if (type === "SCOUT") return "Exploración";
  if (type === "REINFORCE") return "Refuerzo";
  if (type === "ATTACK") return "Ataque";
  return type;
}

function actionBadge(type: string) {
  if (type === "SCOUT") return "border-[#52525b] text-[#d4d4d8]";
  if (type === "REINFORCE") return "border-[#854d0e] text-[#fde68a]";
  if (type === "ATTACK") return "border-[#7f1d1d] text-[#fca5a5]";
  if (type === "CONQUEST") return "border-[#3f6212] text-[#bef264]";
  return "border-[#3a0c12] text-[#d7c9bd]";
}

export default async function MiReinoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let kingdoms: Kingdom[] = [];
  let ownedTerritories: Territory[] = [];
  let allTerritories: Territory[] = [];
  let allRoutes: Route[] = [];
  let playerActions: PlayerAction[] = [];
  let publicLogs: GlobalLog[] = [];
  let troopMovements: TroopMovement[] = [];
  let territoryDisputes: TerritoryDispute[] = [];
  let territoryDisputeAttackers: TerritoryDisputeAttacker[] = [];

  let adjacentTerritories: {
    origin: Territory;
    target: Territory;
    route: Route;
    owner: Kingdom | null;
  }[] = [];

  let routeReports: {
    origin: Territory;
    target: Territory;
    owner: Kingdom | null;
    route: Route;
    relation: "ALLY" | "ENEMY" | "NEUTRAL" | "NODE";
  }[] = [];

  let scoutTargets: {
    id: string;
    name: string;
    ownerName: string;
  }[] = [];

  let scoutUsed = false;
  let currentDay = 1;
  let currentYear = 792;

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
      { data: gameStateData },
      { data: actionData },
      { data: logData },
      { data: movementData },
      { data: disputeData },
      { data: disputeAttackerData },
    ] = await Promise.all([
      supabase.from("kingdoms").select("*").order("name"),
      supabase.from("territories").select("*").order("name"),
      supabase.from("routes").select("*"),
      supabase
        .from("game_state")
        .select("current_day, current_year")
        .limit(1)
        .single(),
      supabase
        .from("player_actions")
        .select(
          "id, type, game_day, soldiers, source_territory_id, target_territory_id, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("global_logs")
        .select(
          "id, game_day, year, message, type, territory_id, actor_kingdom_id, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("troop_movements")
        .select(
          "id, movement_type, status, source_territory_id, target_territory_id, soldiers, route_hours, departure_day, arrival_day, is_automatic",
        )
        .eq("status", "IN_TRANSIT")
        .eq("kingdom_id", profile?.kingdom_id ?? "00000000-0000-0000-0000-000000000000")
        .order("arrival_day", { ascending: true }),
      supabase
        .from("territory_disputes")
        .select(
          "id, territory_id, attacker_kingdom_id, defender_kingdom_id, attacker_soldiers, defender_soldiers_at_open, opened_day",
        )
        .eq("status", "OPEN")
        .order("opened_day", { ascending: true }),
      supabase
        .from("territory_dispute_attackers")
        .select("id, dispute_id, kingdom_id, soldiers")
        .order("created_at", { ascending: true }),
    ]);

    kingdoms = (kingdomData ?? []) as Kingdom[];
    allTerritories = (territoryData ?? []) as Territory[];
    allRoutes = (routeData ?? []) as Route[];
    playerActions = (actionData ?? []) as PlayerAction[];
    publicLogs = (logData ?? []) as GlobalLog[];
    troopMovements = (movementData ?? []) as TroopMovement[];
    territoryDisputes = (disputeData ?? []) as TerritoryDispute[];
    territoryDisputeAttackers = (disputeAttackerData ?? []) as TerritoryDisputeAttacker[];

    if (gameStateData) {
      currentDay = Number(gameStateData.current_day);
      currentYear = Number(gameStateData.current_year);
    }

    const kingdomByIdForActions = new Map(
      kingdoms.map((kingdom) => [kingdom.id, kingdom]),
    );

    scoutTargets = allTerritories
      .filter((territory) => territory.type !== "STATION")
      .map((territory) => {
        const owner = territory.owner_kingdom_id
          ? kingdomByIdForActions.get(territory.owner_kingdom_id)
          : null;

        return {
          id: territory.id,
          name: territory.name,
          ownerName: owner?.name ?? "Sin dueño",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const todayScoutAction = playerActions.find(
      (action) => action.type === "SCOUT" && action.game_day === currentDay,
    );

    scoutUsed = Boolean(todayScoutAction);

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

      routeReports = allRoutes
        .flatMap((route) => {
          const origin = ownedById.get(route.from_territory_id);
          const target = territoryById.get(route.to_territory_id);

          if (!origin || !target) {
            return [];
          }

          const owner = target.owner_kingdom_id
            ? kingdomById.get(target.owner_kingdom_id) ?? null
            : null;

          let relation: "ALLY" | "ENEMY" | "NEUTRAL" | "NODE" = "NEUTRAL";

          if (target.type === "STATION") {
            relation = "NODE";
          } else if (target.owner_kingdom_id === profile?.kingdom_id) {
            relation = "ALLY";
          } else if (target.owner_kingdom_id) {
            relation = "ENEMY";
          }

          return [
            {
              origin,
              target,
              owner,
              route,
              relation,
            },
          ];
        })
        .sort((a, b) => {
          const relationOrder = {
            ENEMY: 0,
            ALLY: 1,
            NODE: 2,
            NEUTRAL: 3,
          };

          const relationCompare =
            relationOrder[a.relation] - relationOrder[b.relation];

          if (relationCompare !== 0) return relationCompare;

          return a.target.name.localeCompare(b.target.name);
        });
    }
  }

  const selectedKingdom = kingdoms.find(
    (kingdom) => kingdom.id === profile?.kingdom_id,
  );

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = Boolean(
    user?.email && adminEmails.includes(user.email.toLowerCase()),
  );

  const territoryById = new Map(
    allTerritories.map((territory) => [territory.id, territory]),
  );

  const kingdomById = new Map(kingdoms.map((kingdom) => [kingdom.id, kingdom]));

  const totalSoldiers = ownedTerritories.reduce(
    (total, territory) => total + Number(territory.soldiers ?? 0),
    0,
  );

  const vulnerableTerritories = ownedTerritories.filter(
    (territory) => Number(territory.soldiers ?? 0) <= 0,
  );

  const enemyFrontiers = adjacentTerritories.filter(
    (item) =>
      item.target.owner_kingdom_id &&
      item.target.owner_kingdom_id !== selectedKingdom?.id,
  );

  const alliedConnections = routeReports.filter(
    (item) => item.relation === "ALLY",
  );

  const enemyConnections = routeReports.filter(
    (item) => item.relation === "ENEMY",
  );

  const nodeConnections = routeReports.filter(
    (item) => item.relation === "NODE",
  );

  const todayActions = playerActions.filter(
    (action) => action.game_day === currentDay,
  );

  const todayReinforcements = todayActions.filter(
    (action) => action.type === "REINFORCE",
  );

  const todayAttacks = todayActions.filter((action) => action.type === "ATTACK");

  const todayScouts = todayActions.filter((action) => action.type === "SCOUT");

  const todayMovedSoldiers = todayActions
    .filter((action) => action.type === "REINFORCE" || action.type === "ATTACK")
    .reduce((total, action) => total + Number(action.soldiers ?? 0), 0);

  const ownPublicLogs = selectedKingdom
    ? publicLogs.filter((log) => log.actor_kingdom_id === selectedKingdom.id)
    : [];

  const conqueredToday = ownPublicLogs.filter(
    (log) => log.type === "CONQUEST" && log.game_day === currentDay,
  );

  const ownOpenDisputes = selectedKingdom
    ? territoryDisputes.filter(
        (dispute) =>
          dispute.attacker_kingdom_id === selectedKingdom.id ||
          dispute.defender_kingdom_id === selectedKingdom.id,
      )
    : [];

  const ownSieges = selectedKingdom
    ? territoryDisputes.filter(
        (dispute) => dispute.attacker_kingdom_id === selectedKingdom.id,
      )
    : [];

  const ownDefenses = selectedKingdom
    ? territoryDisputes.filter(
        (dispute) => dispute.defender_kingdom_id === selectedKingdom.id,
      )
    : [];

  const councilLines: string[] = [];

  if (selectedKingdom) {
    const strongestTerritory = [...ownedTerritories].sort(
      (a, b) => Number(b.soldiers ?? 0) - Number(a.soldiers ?? 0),
    )[0];

    if (strongestTerritory) {
      councilLines.push(
        `${strongestTerritory.name} mantiene la mayor guarnición del reino con ${formatSoldiers(
          Number(strongestTerritory.soldiers ?? 0),
        )} soldados.`,
      );
    }

    if (vulnerableTerritories.length > 0) {
      councilLines.push(
        `Permanecen sin guarnición: ${vulnerableTerritories
          .slice(0, 4)
          .map((territory) => territory.name)
          .join(", ")}${vulnerableTerritories.length > 4 ? "..." : "."}`,
      );
    } else if (ownedTerritories.length > 0) {
      councilLines.push("Todas las ciudades del reino conservan guarnición.");
    }

    if (ownOpenDisputes.length > 0) {
      councilLines.push(
        `Hay ${ownOpenDisputes.length} disputa${ownOpenDisputes.length === 1 ? "" : "s"} abierta${ownOpenDisputes.length === 1 ? "" : "s"} que requieren resolución presencial.`,
      );
    }

    if (enemyFrontiers.length > 0) {
      const enemyNames = Array.from(
        new Set(enemyFrontiers.map((item) => item.target.name)),
      );

      councilLines.push(
        `Las fronteras observan presencia enemiga cerca de ${enemyNames
          .slice(0, 4)
          .join(", ")}${enemyNames.length > 4 ? "..." : "."}`,
      );
    } else {
      councilLines.push("No hay fronteras enemigas directas visibles desde tus dominios.");
    }

    if (todayMovedSoldiers > 0) {
      councilLines.push(
        `Durante el día ${currentDay}, se han movilizado ${formatSoldiers(
          todayMovedSoldiers,
        )} soldados en órdenes propias.`,
      );
    }
  }

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
              Cuartel de mando, órdenes privadas, fronteras, rutas militares y
              estado de tus guarniciones.
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
                  </div>

                  <section className="grid gap-5 md:grid-cols-4">
                    <article className="border border-[#251014] bg-black/45 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                        Territorios
                      </p>
                      <p className="mt-3 text-4xl font-black text-[#fff8ef]">
                        {ownedTerritories.length}
                      </p>
                    </article>

                    <article className="border border-[#251014] bg-black/45 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                        Soldados
                      </p>
                      <p className="mt-3 text-4xl font-black text-[#fff8ef]">
                        {formatSoldiers(totalSoldiers)}
                      </p>
                    </article>

                    <article className="border border-[#251014] bg-black/45 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                        Sin guarnición
                      </p>
                      <p className="mt-3 text-4xl font-black text-[#fff8ef]">
                        {vulnerableTerritories.length}
                      </p>
                    </article>

                    <article className="border border-[#251014] bg-black/45 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                        Fronteras enemigas
                      </p>
                      <p className="mt-3 text-4xl font-black text-[#fff8ef]">
                        {enemyFrontiers.length}
                      </p>
                    </article>

                    <article className="border border-[#7f1d1d] bg-black/45 p-5 md:col-span-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#fca5a5]">
                        Disputas activas
                      </p>
                      <div className="mt-3 flex flex-wrap gap-6">
                        <p className="text-4xl font-black text-[#fff8ef]">
                          {ownOpenDisputes.length}
                        </p>
                        <p className="self-end text-sm leading-6 text-[#b6a9a1]">
                          Asedios propios:{" "}
                          <span className="font-black text-[#fff8ef]">
                            {ownSieges.length}
                          </span>{" "}
                          · Defensas pendientes:{" "}
                          <span className="font-black text-[#fff8ef]">
                            {ownDefenses.length}
                          </span>
                        </p>
                      </div>
                    </article>
                  </section>

                  <section className="border border-[#251014] bg-black/45">
                    <div className="border-b border-[#251014] p-6">
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                        Informe del Consejo
                      </p>
                      <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
                        Situación militar
                      </h2>
                    </div>

                    <div className="space-y-4 p-6">
                      {councilLines.map((line) => (
                        <p
                          key={line}
                          className="border-l-2 border-[#d83a3a] bg-black/35 px-4 py-3 leading-7 text-[#d7c9bd]"
                        >
                          Mi señor, {line}
                        </p>
                      ))}
                    </div>
                  </section>

                  <section className="border border-[#251014] bg-black/45">
                    <div className="border-b border-[#251014] p-6">
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                        Guarniciones
                      </p>
                      <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
                        Estado del ejército
                      </h2>
                    </div>

                    <div className="overflow-x-auto p-6">
                      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#251014] text-xs uppercase tracking-[0.25em] text-[#d83a3a]">
                            <th className="py-3 pr-4">Territorio</th>
                            <th className="py-3 pr-4">Tipo</th>
                            <th className="py-3 pr-4">Soldados</th>
                            <th className="py-3 pr-4">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ownedTerritories.map((territory) => {
                            const soldiers = Number(territory.soldiers ?? 0);

                            return (
                              <tr
                                key={territory.id}
                                className="border-b border-[#151010] text-[#d7c9bd]"
                              >
                                <td className="py-4 pr-4 font-black text-[#fff8ef]">
                                  {territory.name}
                                </td>
                                <td className="py-4 pr-4">
                                  {territory.type === "CAPITAL"
                                    ? "Capital"
                                    : "Ciudad"}
                                </td>
                                <td className="py-4 pr-4 font-black text-[#fff8ef]">
                                  {formatSoldiers(soldiers)}
                                </td>
                                <td className="py-4 pr-4">
                                  {soldiers <= 0 ? (
                                    <span className="border border-[#7f1d1d] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#fca5a5]">
                                      Vulnerable
                                    </span>
                                  ) : soldiers >= 100 ? (
                                    <span className="border border-[#3f6212] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#bef264]">
                                      Bastión
                                    </span>
                                  ) : (
                                    <span className="border border-[#854d0e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#fde68a]">
                                      Guarnecida
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <TroopMovementsPanel
                    movements={troopMovements}
                    territories={allTerritories}
                    currentDay={currentDay}
                  />

                  <PlayerDisputesPanel
                    disputes={territoryDisputes.filter(
                      (dispute) =>
                        dispute.attacker_kingdom_id === selectedKingdom.id ||
                        dispute.defender_kingdom_id === selectedKingdom.id ||
                        territoryDisputeAttackers.some(
                          (attacker) =>
                            attacker.dispute_id === dispute.id &&
                            attacker.kingdom_id === selectedKingdom.id,
                        ),
                    )}
                    attackers={territoryDisputeAttackers}
                    territories={allTerritories}
                    kingdoms={kingdoms}
                    selectedKingdomId={selectedKingdom.id}
                  />

                  <section className="grid gap-8 lg:grid-cols-2">
                    <div className="border border-[#251014] bg-black/45">
                      <div className="border-b border-[#251014] p-6">
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                          Alertas
                        </p>
                        <h2 className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
                          Ciudades vulnerables
                        </h2>
                      </div>

                      <div className="space-y-3 p-6">
                        {vulnerableTerritories.length === 0 ? (
                          <p className="text-sm leading-6 text-[#b6a9a1]">
                            Ninguna ciudad aliada está sin guarnición.
                          </p>
                        ) : (
                          vulnerableTerritories.map((territory) => (
                            <article
                              key={territory.id}
                              className="border border-[#7f1d1d] bg-black/45 p-4"
                            >
                              <h3 className="font-black text-[#fff8ef]">
                                {territory.name}
                              </h3>
                              <p className="mt-2 text-sm leading-6 text-[#fca5a5]">
                                Sin soldados. Requiere refuerzo urgente.
                              </p>
                            </article>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="border border-[#251014] bg-black/45">
                      <div className="border-b border-[#251014] p-6">
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                          Fronteras
                        </p>
                        <h2 className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
                          Enemigos alcanzables
                        </h2>
                      </div>

                      <div className="max-h-[360px] space-y-3 overflow-y-auto p-6">
                        {enemyFrontiers.length === 0 ? (
                          <p className="text-sm leading-6 text-[#b6a9a1]">
                            No hay ciudades enemigas conectadas directamente.
                          </p>
                        ) : (
                          enemyFrontiers.map(({ origin, target, route, owner }) => (
                            <article
                              key={`${origin.id}-${target.id}`}
                              className="border border-[#251014] bg-black/45 p-4"
                            >
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
                              <p className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-[#d83a3a]">
                                {route.travel_hours}h ·{" "}
                                {route.route_type === "SEA"
                                  ? "Marítima"
                                  : "Terrestre"}
                              </p>
                            </article>
                          ))
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="border border-[#251014] bg-black/45">
                    <div className="border-b border-[#251014] p-6">
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                        Rutas militares
                      </p>
                      <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
                        Caminos disponibles
                      </h2>
                    </div>

                    <div className="grid gap-5 p-6 lg:grid-cols-3">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[#bef264]">
                          Aliadas
                        </h3>
                        <div className="mt-4 space-y-3">
                          {alliedConnections.length === 0 ? (
                            <p className="text-sm leading-6 text-[#b6a9a1]">
                              No hay rutas aliadas directas.
                            </p>
                          ) : (
                            alliedConnections.slice(0, 8).map((item) => (
                              <p
                                key={`${item.origin.id}-${item.target.id}`}
                                className="border border-[#251014] bg-black/45 p-3 text-sm text-[#d7c9bd]"
                              >
                                <span className="font-black text-[#fff8ef]">
                                  {item.origin.name}
                                </span>{" "}
                                → {item.target.name}
                              </p>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[#fca5a5]">
                          Enemigas
                        </h3>
                        <div className="mt-4 space-y-3">
                          {enemyConnections.length === 0 ? (
                            <p className="text-sm leading-6 text-[#b6a9a1]">
                              No hay rutas enemigas directas.
                            </p>
                          ) : (
                            enemyConnections.slice(0, 8).map((item) => (
                              <p
                                key={`${item.origin.id}-${item.target.id}`}
                                className="border border-[#251014] bg-black/45 p-3 text-sm text-[#d7c9bd]"
                              >
                                <span className="font-black text-[#fff8ef]">
                                  {item.origin.name}
                                </span>{" "}
                                → {item.target.name}
                              </p>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[#7dd3fc]">
                          Viaje
                        </h3>
                        <div className="mt-4 space-y-3">
                          {nodeConnections.length === 0 ? (
                            <p className="text-sm leading-6 text-[#b6a9a1]">
                              No hay nodos de viaje directos.
                            </p>
                          ) : (
                            nodeConnections.slice(0, 8).map((item) => (
                              <p
                                key={`${item.origin.id}-${item.target.id}`}
                                className="border border-[#251014] bg-black/45 p-3 text-sm text-[#d7c9bd]"
                              >
                                <span className="font-black text-[#fff8ef]">
                                  {item.origin.name}
                                </span>{" "}
                                → {item.target.name}
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="border border-[#251014] bg-black/45">
                    <div className="border-b border-[#251014] p-6">
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                        Cuartel de mando
                      </p>
                      <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
                        Órdenes recientes
                      </h2>
                    </div>

                    <div className="grid gap-6 p-6 lg:grid-cols-2">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[#fde68a]">
                          Órdenes privadas
                        </h3>

                        <div className="mt-4 space-y-3">
                          {playerActions.length === 0 ? (
                            <p className="text-sm leading-6 text-[#b6a9a1]">
                              Aún no has emitido órdenes.
                            </p>
                          ) : (
                            playerActions.slice(0, 10).map((action) => {
                              const source = action.source_territory_id
                                ? territoryById.get(action.source_territory_id)
                                : null;

                              const target = action.target_territory_id
                                ? territoryById.get(action.target_territory_id)
                                : null;

                              return (
                                <article
                                  key={action.id}
                                  className="border border-[#251014] bg-black/45 p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span
                                      className={[
                                        "border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                                        actionBadge(action.type),
                                      ].join(" ")}
                                    >
                                      {actionLabel(action.type)}
                                    </span>

                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                                      Día {action.game_day}
                                    </span>
                                  </div>

                                  <p className="mt-3 text-sm leading-6 text-[#d7c9bd]">
                                    {source?.name ?? "Origen desconocido"}
                                    {" → "}
                                    {target?.name ?? "Objetivo desconocido"}
                                  </p>

                                  {(action.type === "REINFORCE" ||
                                    action.type === "ATTACK") && (
                                    <p className="mt-1 text-sm leading-6 text-[#b6a9a1]">
                                      Soldados movilizados:{" "}
                                      <span className="font-black text-[#fff8ef]">
                                        {formatSoldiers(Number(action.soldiers ?? 0))}
                                      </span>
                                    </p>
                                  )}

                                  {action.type === "SCOUT" && (
                                    <p className="mt-1 text-sm leading-6 text-[#b6a9a1]">
                                      Investigación realizada.
                                    </p>
                                  )}
                                </article>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[#fca5a5]">
                          Acciones públicas propias
                        </h3>

                        <div className="mt-4 space-y-3">
                          {ownPublicLogs.length === 0 ? (
                            <p className="text-sm leading-6 text-[#b6a9a1]">
                              Tu reino todavía no ha generado eventos públicos.
                            </p>
                          ) : (
                            ownPublicLogs.slice(0, 10).map((log) => (
                              <article
                                key={log.id}
                                className="border border-[#251014] bg-black/45 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span
                                    className={[
                                      "border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                                      actionBadge(log.type),
                                    ].join(" ")}
                                  >
                                    {log.type}
                                  </span>

                                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                                    Día {log.game_day}
                                  </span>
                                </div>

                                <p className="mt-3 text-sm leading-6 text-[#d7c9bd]">
                                  {log.message}
                                </p>
                              </article>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="border border-[#251014] bg-black/45">
                    <div className="border-b border-[#251014] p-6">
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                        Balance del día
                      </p>
                      <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
                        Día {currentDay}
                      </h2>
                    </div>

                    <div className="grid gap-5 p-6 md:grid-cols-5">
                      <article className="border border-[#251014] bg-black/45 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                          Refuerzos
                        </p>
                        <p className="mt-3 text-3xl font-black text-[#fff8ef]">
                          {todayReinforcements.length}
                        </p>
                      </article>

                      <article className="border border-[#251014] bg-black/45 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                          Ataques
                        </p>
                        <p className="mt-3 text-3xl font-black text-[#fff8ef]">
                          {todayAttacks.length}
                        </p>
                      </article>

                      <article className="border border-[#251014] bg-black/45 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                          Exploraciones
                        </p>
                        <p className="mt-3 text-3xl font-black text-[#fff8ef]">
                          {todayScouts.length}/1
                        </p>
                      </article>

                      <article className="border border-[#251014] bg-black/45 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                          Conquistas
                        </p>
                        <p className="mt-3 text-3xl font-black text-[#fff8ef]">
                          {conqueredToday.length}
                        </p>
                      </article>

                      <article className="border border-[#251014] bg-black/45 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
                          Movilizados
                        </p>
                        <p className="mt-3 text-3xl font-black text-[#fff8ef]">
                          {formatSoldiers(todayMovedSoldiers)}
                        </p>
                      </article>
                    </div>
                  </section>
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

                  <DailyActionsPanel
                    territories={scoutTargets}
                    scoutUsed={scoutUsed}
                    currentDay={currentDay}
                    currentYear={currentYear}
                  />

                  {isAdmin && (
                    <>
                      <AdvanceDayPanel
                        currentDay={currentDay}
                        currentYear={currentYear}
                      />

                      <AdminDisputesPanel
                        disputes={territoryDisputes}
                        attackers={territoryDisputeAttackers}
                        territories={allTerritories}
                        kingdoms={kingdoms}
                      />
                    </>
                  )}
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
