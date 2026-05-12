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
  soldiers: number;
  owner_kingdom_id: string | null;
};

type Route = {
  id: string;
  from_territory_id: string;
  to_territory_id: string;
  travel_hours: number;
  route_type: "LAND" | "SEA";
};

export default async function MapaPage() {
  const supabase = await createClient();

  const [{ data: kingdoms }, { data: territories }, { data: routes }] =
    await Promise.all([
      supabase.from("kingdoms").select("*").order("name"),
      supabase.from("territories").select("*").order("name"),
      supabase.from("routes").select("*"),
    ]);

  return (
    <MapaInteractivo
      kingdoms={(kingdoms ?? []) as Kingdom[]}
      territories={(territories ?? []) as Territory[]}
      routes={(routes ?? []) as Route[]}
    />
  );
}
