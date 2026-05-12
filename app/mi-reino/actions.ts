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
