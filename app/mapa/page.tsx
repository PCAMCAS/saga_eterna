import { createClient } from "@/utils/supabase/server";
import { MapaInteractivo } from "./mapa-interactivo";

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
  soldiers: number | null;
  mercenaries?: number | null;
  owner_kingdom_id: string | null;
  is_disputed: boolean;
};

type Route = {
  id: string;
  from_territory_id: string;
  to_territory_id: string;
  travel_hours: number;
  route_type: "LAND" | "SEA";
};

type Profile = {
  id: string;
  username: string | null;
  kingdom_id: string | null;
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

type ScoutReport = {
  id: string;
  territory_id: string;
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

export default async function MapaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let scoutUsed = false;
  let currentDay = 1;
  let currentYear = 725;
  let scoutReports: ScoutReport[] = [];
  let territoryEconomy: TerritoryEconomy[] = [];
  let buildingOrders: BuildingOrder[] = [];

  const [
    { data: kingdoms },
    { data: territories },
    { data: routes },
    { data: gameState },
    { data: disputes },
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
      .from("territory_disputes")
      .select(
        "id, territory_id, attacker_kingdom_id, defender_kingdom_id, attacker_soldiers, defender_soldiers_at_open, opened_day",
      )
      .eq("status", "OPEN"),
  ]);

  if (gameState) {
    currentDay = Number(gameState.current_day);
    currentYear = Number(gameState.current_year);
  }

  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username, kingdom_id")
      .eq("id", user.id)
      .maybeSingle();

    profile = profileData as Profile | null;

    const { data: todayScoutAction } = await supabase
      .from("player_actions")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "SCOUT")
      .eq("game_day", currentDay)
      .maybeSingle();

    scoutUsed = Boolean(todayScoutAction);

    const [
      { data: scoutReportData },
      { data: territoryEconomyData },
      { data: buildingOrderData },
    ] = await Promise.all([
      supabase
        .from("scout_reports")
        .select("id, territory_id, game_day, year, observed_soldiers, created_at")
        .order("created_at", { ascending: false }),
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
    ]);

    scoutReports = (scoutReportData ?? []) as ScoutReport[];
    territoryEconomy = (territoryEconomyData ?? []) as TerritoryEconomy[];
    buildingOrders = (buildingOrderData ?? []) as BuildingOrder[];
  }

  const rawTerritories = (territories ?? []) as Territory[];

  const visibleTerritories = rawTerritories.map((territory) => {
    const canSeeSoldiers =
      Boolean(profile?.kingdom_id) &&
      territory.owner_kingdom_id === profile?.kingdom_id;

    return {
      ...territory,
      soldiers: canSeeSoldiers ? territory.soldiers : null,
    };
  });

  return (
    <MapaInteractivo
      kingdoms={(kingdoms ?? []) as Kingdom[]}
      territories={visibleTerritories}
      routes={(routes ?? []) as Route[]}
      userEmail={user?.email ?? null}
      selectedKingdomId={profile?.kingdom_id ?? null}
      scoutUsed={scoutUsed}
      currentDay={currentDay}
      currentYear={currentYear}
      disputes={(disputes ?? []) as TerritoryDispute[]}
      scoutReports={scoutReports}
      territoryEconomy={territoryEconomy}
      buildingOrders={buildingOrders}
    />
  );
}
