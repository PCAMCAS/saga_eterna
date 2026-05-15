import Link from "next/link";
import {
  ActionButton,
  SectionTabs,
  StatTile,
} from "./kingdom-ui";
import { createClient } from "@/utils/supabase/server";
import { leaveKingdom, selectKingdom, signOut } from "./actions";
import { DailyActionsPanel } from "./daily-actions-panel";
import { TroopMovementsPanel } from "./troop-movements-panel";
import { ArmyOverviewPanel } from "./army-overview-panel";
import { CommandCenterPanel } from "./command-center-panel";
import { KingdomSidebarPanel } from "./kingdom-sidebar-panel";
import { OrdersLogPanel } from "./orders-log-panel";
import { DisputesIntelligencePanel } from "./disputes-intelligence-panel";
import { EconomyPanel } from "./economy-panel";
import { PrivateLogsPanel } from "./private-logs-panel";

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
  mercenaries?: number | null;
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
  mercenaries?: number | null;
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
  departure_year: number;
  arrival_year: number;
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

type ScoutReport = {
  id: string;
  territory_id: string;
  territory_owner_kingdom_id: string | null;
  game_day: number;
  year: number;
  observed_soldiers: number;
  created_at: string | null;
};

type TerritoryEconomy = {
  territory_id: string;
  gold: number;
  food: number;
  gold_building_level: number;
  food_building_level: number;
  barracks_level: number;
};

type BuildingOrder = {
  id: string;
  territory_id: string;
  building_type: "GOLD" | "FOOD" | "BARRACKS";
  target_level: number;
  cost_gold: number;
  completes_day: number;
  completes_year: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
};

type PrivateLog = {
  id: string;
  game_day: number;
  year: number;
  type: "SYSTEM" | "ECONOMY" | "MERCENARIES" | "BUILD" | "TRAINING" | "WARNING";
  message: string;
  created_at: string | null;
};

type SoldierTrainingOrder = {
  id: string;
  territory_id: string;
  soldiers: number;
  cost_gold: number;
  completes_day: number;
  completes_year: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
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

export default async function MiReinoPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const pageError = resolvedSearchParams?.error ?? null;
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
  let scoutReports: ScoutReport[] = [];
  let territoryEconomy: TerritoryEconomy[] = [];
  let buildingOrders: BuildingOrder[] = [];
  let privateLogs: PrivateLog[] = [];
  let soldierTrainingOrders: SoldierTrainingOrder[] = [];
  let occupiedKingdomIds = new Set<string>();

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
  let currentYear = 725;

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
      { data: occupiedProfilesData },
      { data: territoryData },
      { data: routeData },
      { data: gameStateData },
      { data: actionData },
      { data: logData },
      { data: movementData },
      { data: disputeData },
      { data: disputeAttackerData },
      { data: scoutReportData },
      { data: territoryEconomyData },
      { data: buildingOrderData },
      { data: privateLogData },
      { data: soldierTrainingOrderData },
    ] = await Promise.all([
      supabase.from("kingdoms").select("*").order("name"),
      supabase.from("profiles").select("kingdom_id").not("kingdom_id", "is", null),
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
          "id, movement_type, status, source_territory_id, target_territory_id, soldiers, route_hours, departure_day, arrival_day, departure_year, arrival_year, is_automatic",
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
      supabase
        .from("scout_reports")
        .select(
          "id, territory_id, territory_owner_kingdom_id, game_day, year, observed_soldiers, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("territory_economy")
        .select(
          "territory_id, gold, food, gold_building_level, food_building_level, barracks_level",
        ),
      supabase
        .from("building_orders")
        .select(
          "id, territory_id, building_type, target_level, cost_gold, completes_day, completes_year, status",
        )
        .eq("status", "PENDING")
        .order("completes_tick", { ascending: true }),
      supabase
        .from("kingdom_private_logs")
        .select("id, game_day, year, type, message, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("soldier_training_orders")
        .select("id, territory_id, soldiers, cost_gold, completes_day, completes_year, status")
        .eq("status", "PENDING")
        .order("completes_tick", { ascending: true }),
    ]);

    kingdoms = (kingdomData ?? []) as Kingdom[];
    occupiedKingdomIds = new Set(
      (occupiedProfilesData ?? [])
        .map((profile) => profile.kingdom_id as string | null)
        .filter(Boolean) as string[],
    );
    allTerritories = (territoryData ?? []) as Territory[];
    allRoutes = (routeData ?? []) as Route[];
    playerActions = (actionData ?? []) as PlayerAction[];
    publicLogs = (logData ?? []) as GlobalLog[];
    troopMovements = (movementData ?? []) as TroopMovement[];
    territoryDisputes = (disputeData ?? []) as TerritoryDispute[];
    territoryDisputeAttackers = (disputeAttackerData ?? []) as TerritoryDisputeAttacker[];
    scoutReports = (scoutReportData ?? []) as ScoutReport[];
    territoryEconomy = (territoryEconomyData ?? []) as TerritoryEconomy[];
    buildingOrders = (buildingOrderData ?? []) as BuildingOrder[];
    privateLogs = (privateLogData ?? []) as PrivateLog[];
    soldierTrainingOrders = (soldierTrainingOrderData ?? []) as SoldierTrainingOrder[];

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

  const goldIncomeByLevelForDashboard = [
    0, 25, 50, 100, 150, 225, 325, 450, 600, 800, 1000,
  ];

  const foodIncomeByLevelForDashboard = [
    0, 25, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000,
  ];

  const totalDailyGold = ownedTerritories.reduce((total, territory) => {
    const entry = territoryEconomy.find(
      (economyEntry) => economyEntry.territory_id === territory.id,
    );

    if (!entry) return total;

    const buildingIncome =
      goldIncomeByLevelForDashboard[Number(entry.gold_building_level ?? 0)] ?? 0;

    return (
      total +
      (territory.type === "CAPITAL" ? 100 + buildingIncome : buildingIncome)
    );
  }, 0);

  const totalDailyFood = ownedTerritories.reduce((total, territory) => {
    const entry = territoryEconomy.find(
      (economyEntry) => economyEntry.territory_id === territory.id,
    );

    if (!entry || territory.type !== "CAPITAL") return total;

    return (
      total +
      (foodIncomeByLevelForDashboard[Number(entry.food_building_level ?? 0)] ?? 0)
    );
  }, 0);

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
            <Link href="/reglas" className="transition hover:text-[#e12b2b]">
              Reglas
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
              <div className="space-y-8">
                <section
                  id="resumen"
                  className="border border-[#3a0c12] bg-gradient-to-br from-black via-[#090304] to-[#1a0508] shadow-[0_0_80px_rgba(0,0,0,0.45)]"
                >
                  <div className="grid gap-6 p-8 xl:grid-cols-[1.5fr_1fr_auto]">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#d83a3a]">
                        Mi Reino
                      </p>
                      <h1 className="mt-4 text-5xl font-black uppercase tracking-tight text-[#fff8ef]">
                        {selectedKingdom.name}
                      </h1>
                      {selectedKingdom.leader && (
                        <p className="mt-2 text-sm font-black uppercase tracking-[0.32em] text-[#ff4b4b]">
                          Líder: {selectedKingdom.leader}
                        </p>
                      )}
                      <p className="mt-5 max-w-2xl text-sm leading-7 text-[#b6a9a1]">
                        Centro de mando del reino: economía, ejército, órdenes,
                        disputas, registros privados y situación estratégica.
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <div className="border border-[#251014] bg-black/55 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                          Cuenta
                        </p>
                        <p className="mt-3 text-lg font-black text-[#fff8ef]">
                          {user.email}
                        </p>
                      </div>

                      <div className="border border-[#251014] bg-black/55 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                          Fecha actual
                        </p>
                        <p className="mt-3 text-2xl font-black uppercase text-[#fff8ef]">
                          Día {currentDay} del {currentYear} d.C.
                        </p>
                      </div>
                    </div>

                    <div className="grid content-start gap-3 xl:min-w-[260px]">
                      {isAdmin && <ActionButton href="/admin">Panel admin</ActionButton>}
                      <form action={leaveKingdom}>
                        <button
                          type="submit"
                          className="w-full border border-[#854d0e] bg-black/70 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition hover:border-[#f59e0b] hover:text-[#fef3c7]"
                        >
                          Salir de facción
                        </button>
                      </form>
                      <form action={signOut}>
                        <button
                          type="submit"
                          className="w-full border border-[#251014] bg-black/70 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition hover:border-[#7f7470]"
                        >
                          Cerrar sesión
                        </button>
                      </form>
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
                  <StatTile
                    label="Territorios"
                    value={ownedTerritories.length}
                    detail="Controlados"
                  />
                  <StatTile
                    label="Soldados regulares"
                    value={ownedTerritories.reduce(
                      (total, territory) =>
                        total + Number(territory.soldiers ?? 0),
                      0,
                    )}
                    detail="Disponibles"
                  />
                  <StatTile
                    label="Mercenarios"
                    value={ownedTerritories.reduce(
                      (total, territory) =>
                        total + Number(territory.mercenaries ?? 0),
                      0,
                    )}
                    detail="Contratados"
                    tone="gold"
                  />
                  <StatTile
                    label="Oro total"
                    value={territoryEconomy.reduce(
                      (total, entry) => total + Number(entry.gold ?? 0),
                      0,
                    )}
                    detail="Almacenado"
                    tone="gold"
                  />
                  <StatTile
                    label="Comida total"
                    value={territoryEconomy.reduce(
                      (total, entry) => total + Number(entry.food ?? 0),
                      0,
                    )}
                    detail="Almacenada"
                    tone="food"
                  />
                  <StatTile
                    label="Disputas"
                    value={ownOpenDisputes.length}
                    detail="Activas"
                    tone="danger"
                  />
                  <StatTile
                    label="En tránsito"
                    value={troopMovements.length}
                    detail="Órdenes / tropas"
                    tone="blue"
                  />
                </section>

                <CommandCenterPanel
                  vulnerableTerritories={ownedTerritories
                    .filter(
                      (territory) =>
                        territory.type !== "STATION" &&
                        Number(territory.soldiers ?? 0) +
                          Number(territory.mercenaries ?? 0) <=
                          0,
                    )
                    .map((territory) => territory.name)}
                  openDisputes={ownOpenDisputes.length}
                  troopMovements={troopMovements.length}
                  totalGold={territoryEconomy.reduce(
                    (total, entry) => total + Number(entry.gold ?? 0),
                    0,
                  )}
                  totalFood={territoryEconomy.reduce(
                    (total, entry) => total + Number(entry.food ?? 0),
                    0,
                  )}
                  dailyGold={totalDailyGold}
                  dailyFood={totalDailyFood}
                />

                <SectionTabs />

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



                  <ArmyOverviewPanel territories={ownedTerritories} />

                  <TroopMovementsPanel
                    movements={troopMovements}
                    territories={allTerritories}
                    currentDay={currentDay}
                  />

                  <DisputesIntelligencePanel
                    selectedKingdomId={selectedKingdom.id}
                    territories={allTerritories}
                    kingdoms={kingdoms}
                    disputes={territoryDisputes}
                    attackers={territoryDisputeAttackers}
                    scoutReports={scoutReports}
                  />

                  <EconomyPanel
                    territories={ownedTerritories}
                    economy={territoryEconomy}
                    buildingOrders={buildingOrders}
                    soldierTrainingOrders={soldierTrainingOrders}
                  />

                  <PrivateLogsPanel logs={privateLogs} />

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

                  <OrdersLogPanel
                    playerActions={playerActions}
                    ownPublicLogs={ownPublicLogs}
                    territoryById={territoryById}
                    currentDay={currentDay}
                    todayReinforcements={todayReinforcements}
                    todayAttacks={todayAttacks}
                    todayScouts={todayScouts}
                    conqueredToday={conqueredToday}
                    todayMovedSoldiers={todayMovedSoldiers}
                  />
                </div>

                <aside className="space-y-6">
                  <KingdomSidebarPanel
                    userEmail={user.email}
                    isAdmin={isAdmin}
                    currentDay={currentDay}
                    currentYear={currentYear}
                    vulnerableTerritories={ownedTerritories
                      .filter(
                        (territory) =>
                          territory.type !== "STATION" &&
                          Number(territory.soldiers ?? 0) +
                            Number(territory.mercenaries ?? 0) <=
                            0,
                      )
                      .map((territory) => territory.name)}
                    openDisputes={ownOpenDisputes.length}
                    troopMovements={troopMovements.length}
                    councilLines={councilLines}
                    leaveKingdom={leaveKingdom}
                    signOut={signOut}
                  />

                  <DailyActionsPanel
                    territories={scoutTargets}
                    scoutUsed={scoutUsed}
                    currentDay={currentDay}
                    currentYear={currentYear}
                  />
                </aside>
              </div>
              {/* Cierre dashboard Mi Reino */}
              </div>
            ) : (
              <div>
                {pageError === "reino-ocupado" && (
                  <div className="mb-6 border border-[#7f1d1d] bg-black/45 p-5 text-sm leading-6 text-[#fca5a5]">
                    Ese reino ya ha sido reclamado por otro jugador. Escoge una facción libre.
                  </div>
                )}

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
                  {kingdoms.map((kingdom) => {
                    const isOccupied = occupiedKingdomIds.has(kingdom.id);

                    return (
                    <form
                      key={kingdom.id}
                      action={selectKingdom}
                      className={[
                        "border bg-black/45 p-6 transition",
                        isOccupied
                          ? "border-[#3a0c12] opacity-55"
                          : "border-[#251014] hover:border-[#c3222b]",
                      ].join(" ")}
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

                      {isOccupied && (
                        <p className="mt-5 border border-[#3a0c12] bg-black/45 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#b6a9a1]">
                          Reino ocupado
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isOccupied}
                        className="mt-6 w-full border border-[#c3222b] bg-black/70 px-5 py-4 text-sm font-black uppercase tracking-[0.28em] text-[#fff8ef] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:border-[#3a0c12] disabled:text-[#7f7470] disabled:hover:bg-black/70"
                      >
                        {isOccupied ? "No disponible" : "Jurar lealtad"}
                      </button>
                    </form>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
