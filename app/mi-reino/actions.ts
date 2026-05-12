"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}
