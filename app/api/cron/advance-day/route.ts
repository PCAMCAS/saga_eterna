import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function getMadridParts() {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function madridDateIso() {
  const madrid = getMadridParts();
  return `${madrid.year}-${madrid.month}-${madrid.day}`;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorizedBySecret =
    Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  const isAuthorizedByVercelCron =
    request.headers.get("x-vercel-cron") === "1";

  if (!isAuthorizedBySecret && !isAuthorizedByVercelCron) {
    return NextResponse.json(
      {
        ok: false,
        message: "No autorizado.",
      },
      { status: 401 },
    );
  }

  const madrid = getMadridParts();
  const todayIso = madridDateIso();

  const isDailyAdvanceWindow = madrid.hour === "00" || madrid.hour === "01";

  if (!isDailyAdvanceWindow) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: `No es ventana de avance diario. Hora Europe/Madrid: ${madrid.hour}:${madrid.minute}.`,
      madridDate: todayIso,
    });
  }

  const supabase = await createClient();

  const { data: gameState, error: stateError } = await supabase
    .from("game_state")
    .select("last_advanced_real_date")
    .limit(1)
    .maybeSingle();

  if (stateError) {
    return NextResponse.json(
      {
        ok: false,
        message: stateError.message,
      },
      { status: 500 },
    );
  }

  if (gameState?.last_advanced_real_date === todayIso) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "La campaña ya fue avanzada hoy.",
      madridDate: todayIso,
    });
  }

  const { data, error } = await supabase.rpc("advance_game_day");

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    advanced: true,
    madridDate: todayIso,
    result: data,
  });
}
