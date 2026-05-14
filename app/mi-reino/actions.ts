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
    redirect("/mi-reino");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, kingdom_id")
    .eq("id", user.id)
    .maybeSingle();

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = Boolean(
    user.email && adminEmails.includes(user.email.toLowerCase()),
  );

  if (profile?.kingdom_id && !isAdmin) {
    redirect("/mi-reino");
  }

  const { data: occupiedProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("kingdom_id", kingdomId)
    .neq("id", user.id)
    .maybeSingle();

  if (occupiedProfile) {
    redirect("/mi-reino?error=reino-ocupado");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      kingdom_id: kingdomId,
    })
    .eq("id", user.id)
    .is("kingdom_id", null);

  if (error) {
    redirect("/mi-reino?error=reino-ocupado");
  }

  revalidatePath("/mi-reino");
  revalidatePath("/facciones");
  revalidatePath("/mundo");
  revalidatePath("/mapa");

  redirect("/mi-reino");
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
    .select("id, name, type, soldiers, owner_kingdom_id")
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

  const { error: reportError } = await supabase.from("scout_reports").insert({
    user_id: user.id,
    kingdom_id: profile.kingdom_id,
    territory_id: targetTerritory.id,
    game_day: currentDay,
    year: currentYear,
    observed_soldiers: soldiers,
    territory_owner_kingdom_id: targetTerritory.owner_kingdom_id,
  });

  if (reportError) {
    return {
      ok: false,
      message: reportError.message,
    };
  }

  const { error: logError } = await supabase.from("global_logs").insert({
    game_day: currentDay,
    year: currentYear,
    message: `Exploradores han sido enviados a ${targetTerritory.name}.`,
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

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reinforce_territory_atomic", {
    p_from_territory_id: fromTerritoryId,
    p_target_territory_id: targetTerritoryId,
    p_amount: amount,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result = data as {
    ok?: boolean;
    message?: string;
  } | null;

  revalidatePath("/mi-reino");
  revalidatePath("/mundo");
  revalidatePath("/mapa");

  return {
    ok: Boolean(result?.ok),
    message: result?.message ?? "No se pudo completar el refuerzo.",
  };
}

export async function attackTerritory(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fromTerritoryId = String(formData.get("fromTerritoryId") ?? "");
  const targetTerritoryId = String(formData.get("targetTerritoryId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);

  if (!fromTerritoryId || !targetTerritoryId) {
    return {
      ok: false,
      message: "Debes seleccionar origen y objetivo del ataque.",
    };
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      ok: false,
      message: "La cantidad de soldados debe ser un número entero mayor que 0.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("attack_territory_atomic", {
    p_from_territory_id: fromTerritoryId,
    p_target_territory_id: targetTerritoryId,
    p_amount: amount,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result = data as {
    ok?: boolean;
    message?: string;
  } | null;

  revalidatePath("/mi-reino");
  revalidatePath("/registro-global");
  revalidatePath("/mundo");
  revalidatePath("/mapa");

  return {
    ok: Boolean(result?.ok),
    message: result?.message ?? "No se pudo completar el ataque.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}

export async function advanceGameDay(
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      ok: false,
      message: "Debes iniciar sesión para avanzar el día.",
    };
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return {
      ok: false,
      message: "No tienes permiso para avanzar el día.",
    };
  }

  const { data, error } = await supabase.rpc("advance_game_day");

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result = data as {
    ok?: boolean;
    message?: string;
  } | null;

  revalidatePath("/mi-reino");
  revalidatePath("/mundo");
  revalidatePath("/mapa");
  revalidatePath("/registro-global");

  return {
    ok: Boolean(result?.ok),
    message: result?.message ?? "No se pudo avanzar el día.",
  };
}

export async function resolveTerritoryDispute(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const disputeId = String(formData.get("disputeId") ?? "");
  const winnerKingdomId = String(formData.get("winnerKingdomId") ?? "");

  if (!disputeId || !winnerKingdomId) {
    return {
      ok: false,
      message: "Debes seleccionar disputa y ganador.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      ok: false,
      message: "Debes iniciar sesión.",
    };
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return {
      ok: false,
      message: "No tienes permiso para resolver disputas.",
    };
  }

  const { data, error } = await supabase.rpc("resolve_territory_dispute", {
    p_dispute_id: disputeId,
    p_winner_kingdom_id: winnerKingdomId,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result = data as {
    ok?: boolean;
    message?: string;
  } | null;

  revalidatePath("/mi-reino");
  revalidatePath("/mapa");
  revalidatePath("/mundo");
  revalidatePath("/registro-global");

  return {
    ok: Boolean(result?.ok),
    message: result?.message ?? "No se pudo resolver la disputa.",
  };
}

export async function leaveKingdom() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    redirect("/login");
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email.toLowerCase())) {
    redirect("/mi-reino");
  }

  await supabase
    .from("profiles")
    .update({
      kingdom_id: null,
    })
    .eq("id", user.id);

  revalidatePath("/mi-reino");
  revalidatePath("/facciones");
  revalidatePath("/mundo");
  revalidatePath("/mapa");

  redirect("/mi-reino");
}

export async function orderBuildingUpgrade(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const territoryId = String(formData.get("territoryId") ?? "");
  const buildingType = String(formData.get("buildingType") ?? "");

  if (!territoryId || !buildingType) {
    return {
      ok: false,
      message: "Debes seleccionar territorio y edificio.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("order_building_upgrade", {
    p_territory_id: territoryId,
    p_building_type: buildingType,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result = data as {
    ok?: boolean;
    message?: string;
  } | null;

  revalidatePath("/mi-reino");
  revalidatePath("/admin");

  return {
    ok: Boolean(result?.ok),
    message: result?.message ?? "No se pudo ordenar la construcción.",
  };
}

export async function orderBuildingUpgradeFromForm(formData: FormData) {
  await orderBuildingUpgrade(
    {
      ok: false,
      message: "",
    },
    formData,
  );
}

export async function buyMercenaries(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const capitalId = String(formData.get("capitalId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);

  if (!capitalId || !Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      message: "Debes indicar una capital y una cantidad válida.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("buy_mercenaries", {
    p_capital_id: capitalId,
    p_amount: Math.floor(amount),
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result = data as {
    ok?: boolean;
    message?: string;
  } | null;

  revalidatePath("/mi-reino");
  revalidatePath("/mapa");
  revalidatePath("/admin");

  return {
    ok: Boolean(result?.ok),
    message: result?.message ?? "No se pudo contratar mercenarios.",
  };
}
