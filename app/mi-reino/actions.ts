"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type ActionState = {
  ok: boolean;
  message: string;
};

export async function selectKingdom(formData: FormData) {
  const kingdomId = String(formData.get("kingdomId") ?? "");

  if (!kingdomId) {
    throw new Error("No se ha seleccionado ningún reino.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Debes iniciar sesión para elegir reino.");
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, kingdom_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (existingProfile?.kingdom_id) {
    throw new Error("Ya has elegido un reino. No puedes cambiarlo.");
  }

  if (!existingProfile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      username: user.email,
      kingdom_id: kingdomId,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  } else {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        kingdom_id: kingdomId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .is("kingdom_id", null);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  revalidatePath("/mi-reino");
}

export async function scoutTerritory(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const targetTerritoryId = String(formData.get("targetTerritoryId") ?? "");

  if (!targetTerritoryId) {
    return {
      ok: false,
      message: "Debes seleccionar un territorio para investigar.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "Debes iniciar sesión para investigar tropas.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, kingdom_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.kingdom_id) {
    return {
      ok: false,
      message: "Debes elegir un reino antes de realizar acciones.",
    };
  }

  const { data: gameState, error: gameStateError } = await supabase
    .from("game_state")
    .select("current_day, current_year")
    .limit(1)
    .single();

  if (gameStateError || !gameState) {
    return {
      ok: false,
      message: "No se pudo leer el estado actual del juego.",
    };
  }

  const currentDay = Number(gameState.current_day);
  const currentYear = Number(gameState.current_year);

  const { data: existingAction, error: existingActionError } = await supabase
    .from("player_actions")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "SCOUT")
    .eq("game_day", currentDay)
    .maybeSingle();

  if (existingActionError) {
    return {
      ok: false,
      message: existingActionError.message,
    };
  }

  if (existingAction) {
    return {
      ok: false,
      message: "Ya has investigado un territorio durante este día de juego.",
    };
  }

  const { data: targetTerritory, error: targetError } = await supabase
    .from("territories")
    .select("id, name, type, soldiers")
    .eq("id", targetTerritoryId)
    .single();

  if (targetError || !targetTerritory) {
    return {
      ok: false,
      message: "No se encontró el territorio seleccionado.",
    };
  }

  if (targetTerritory.type === "STATION") {
    return {
      ok: false,
      message: "No puedes investigar un nodo de viaje.",
    };
  }

  const { error: actionError } = await supabase.from("player_actions").insert({
    user_id: user.id,
    kingdom_id: profile.kingdom_id,
    type: "SCOUT",
    game_day: currentDay,
    target_territory_id: targetTerritory.id,
  });

  if (actionError) {
    return {
      ok: false,
      message: actionError.message,
    };
  }

  const soldiers = Number(targetTerritory.soldiers ?? 0);
  const formattedSoldiers = soldiers.toLocaleString("es-ES");

  const { error: logError } = await supabase.from("global_logs").insert({
    game_day: currentDay,
    year: currentYear,
    message: `Los exploradores han hallado ${formattedSoldiers} soldados en ${targetTerritory.name}.`,
    type: "SCOUT",
    territory_id: targetTerritory.id,
    actor_kingdom_id: profile.kingdom_id,
  });

  if (logError) {
    return {
      ok: false,
      message: logError.message,
    };
  }

  revalidatePath("/mi-reino");
  revalidatePath("/registro-global");
  revalidatePath("/mundo");
  revalidatePath("/mapa");

  return {
    ok: true,
    message: `Investigación completada: ${targetTerritory.name} tiene ${formattedSoldiers} soldados.`,
  };
}

export async function reinforceTerritory(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fromTerritoryId = String(formData.get("fromTerritoryId") ?? "");
  const targetTerritoryId = String(formData.get("targetTerritoryId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);

  if (!fromTerritoryId || !targetTerritoryId) {
    return {
      ok: false,
      message: "Debes seleccionar origen y destino del refuerzo.",
    };
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      ok: false,
      message: "La cantidad de soldados debe ser un número entero mayor que 0.",
    };
  }

  if (fromTerritoryId === targetTerritoryId) {
    return {
      ok: false,
      message: "El origen y el destino no pueden ser el mismo territorio.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "Debes iniciar sesión para reforzar territorios.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, kingdom_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.kingdom_id) {
    return {
      ok: false,
      message: "Debes elegir un reino antes de realizar acciones.",
    };
  }

  const { data: gameState, error: gameStateError } = await supabase
    .from("game_state")
    .select("current_day, current_year")
    .limit(1)
    .single();

  if (gameStateError || !gameState) {
    return {
      ok: false,
      message: "No se pudo leer el estado actual del juego.",
    };
  }

  const currentDay = Number(gameState.current_day);
  const currentYear = Number(gameState.current_year);

  const [{ data: fromTerritory }, { data: targetTerritory }] =
    await Promise.all([
      supabase
        .from("territories")
        .select("id, name, type, soldiers, owner_kingdom_id")
        .eq("id", fromTerritoryId)
        .single(),
      supabase
        .from("territories")
        .select("id, name, type, soldiers, owner_kingdom_id")
        .eq("id", targetTerritoryId)
        .single(),
    ]);

  if (!fromTerritory || !targetTerritory) {
    return {
      ok: false,
      message: "No se pudieron leer los territorios seleccionados.",
    };
  }

  if (
    fromTerritory.type === "STATION" ||
    targetTerritory.type === "STATION"
  ) {
    return {
      ok: false,
      message: "No puedes reforzar usando nodos de viaje.",
    };
  }

  if (
    fromTerritory.owner_kingdom_id !== profile.kingdom_id ||
    targetTerritory.owner_kingdom_id !== profile.kingdom_id
  ) {
    return {
      ok: false,
      message: "Solo puedes reforzar entre territorios de tu propio reino.",
    };
  }

  const availableSoldiers = Number(fromTerritory.soldiers ?? 0);

  if (amount > availableSoldiers) {
    return {
      ok: false,
      message: `No hay suficientes soldados en ${fromTerritory.name}. Disponibles: ${availableSoldiers.toLocaleString("es-ES")}.`,
    };
  }

  const { data: directRoutes, error: directRouteError } = await supabase
    .from("routes")
    .select("id, travel_hours")
    .or(
      `and(from_territory_id.eq.${fromTerritoryId},to_territory_id.eq.${targetTerritoryId}),and(from_territory_id.eq.${targetTerritoryId},to_territory_id.eq.${fromTerritoryId})`,
    )
    .limit(1);

  if (directRouteError) {
    return {
      ok: false,
      message: directRouteError.message,
    };
  }

  const directRoute = directRoutes?.[0] ?? null;

  if (!directRoute) {
    return {
      ok: false,
      message: "Por ahora solo puedes reforzar territorios aliados conectados directamente por una ruta.",
    };
  }

  const newFromSoldiers = availableSoldiers - amount;
  const newTargetSoldiers = Number(targetTerritory.soldiers ?? 0) + amount;

  const { error: updateFromError } = await supabase
    .from("territories")
    .update({
      soldiers: newFromSoldiers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fromTerritory.id);

  if (updateFromError) {
    return {
      ok: false,
      message: updateFromError.message,
    };
  }

  const { error: updateTargetError } = await supabase
    .from("territories")
    .update({
      soldiers: newTargetSoldiers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetTerritory.id);

  if (updateTargetError) {
    return {
      ok: false,
      message: updateTargetError.message,
    };
  }

  const { error: actionError } = await supabase.from("player_actions").insert({
    user_id: user.id,
    kingdom_id: profile.kingdom_id,
    type: "REINFORCE",
    game_day: currentDay,
    source_territory_id: fromTerritory.id,
    target_territory_id: targetTerritory.id,
    soldiers: amount,
  });

  if (actionError) {
    return {
      ok: false,
      message: actionError.message,
    };
  }

  revalidatePath("/mi-reino");
  revalidatePath("/mundo");
  revalidatePath("/mapa");

  return {
    ok: true,
    message: `Refuerzo enviado: ${amount.toLocaleString("es-ES")} soldados desde ${fromTerritory.name} hacia ${targetTerritory.name}.`,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}
