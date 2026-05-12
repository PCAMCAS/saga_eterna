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

  const isMidnightMadrid = madrid.hour === "00";

  if (!isMidnightMadrid) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: `No es medianoche peninsular. Hora Europe/Madrid: ${madrid.hour}:${madrid.minute}.`,
    });
  }

  const supabase = await createClient();

  const { data: gameState, error: stateError } = await supabase
    .from("game_state")
    .select("current_day, current_year, updated_at")
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

  const lastUpdatedDate = gameState?.updated_at
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(gameState.updated_at))
    : null;

  const todayMadrid = `${madrid.day}/${madrid.month}/${madrid.year}`;

  if (lastUpdatedDate === todayMadrid) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "La campaña ya fue avanzada hoy.",
      date: todayMadrid,
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
    madridDate: todayMadrid,
    result: data,
  });
}
