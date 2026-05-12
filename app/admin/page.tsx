import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AdvanceDayPanel } from "../mi-reino/advance-day-panel";
import { AdminDisputesPanel } from "../mi-reino/admin-disputes-panel";

type Kingdom = {
  id: string;
  name: string;
};

type Territory = {
  id: string;
  name: string;
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

type GameState = {
  current_day: number;
  current_year: number;
  current_tick: number | null;
};

function isAdminEmail(email: string | null | undefined) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email && adminEmails.includes(email.toLowerCase()));
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = isAdminEmail(user?.email);

  if (!user || !isAdmin) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050203] text-[#f3eee8]">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_18%_82%,rgba(244,214,170,0.10),transparent_17%),radial-gradient(circle_at_48%_18%,rgba(125,18,31,0.36),transparent_34%),radial-gradient(circle_at_82%_70%,rgba(60,7,14,0.44),transparent_26%),linear-gradient(135deg,#040102_0%,#160509_45%,#050203_100%)]" />

        <section className="relative z-10 mx-auto flex min-h-screen max-w-3xl items-center px-8 py-12">
          <div className="w-full border border-[#3a0c12] bg-[#080607]/92 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Acceso restringido
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase text-[#fff8ef]">
              Administración
            </h1>
            <p className="mt-5 leading-7 text-[#b6a9a1]">
              No tienes permiso para acceder al panel de administración.
            </p>

            <Link
              href="/mi-reino"
              className="mt-6 inline-flex border border-[#c3222b] bg-black/70 px-6 py-4 text-sm font-black uppercase tracking-[0.3em] text-[#fff8ef] transition hover:bg-[#b91c1c]"
            >
              Volver a mi reino
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [
    { data: gameStateData },
    { data: disputesData },
    { data: disputeAttackersData },
    { data: territoriesData },
    { data: kingdomsData },
    { count: inTransitCount },
    { count: openDisputesCount },
  ] = await Promise.all([
    supabase
      .from("game_state")
      .select("current_day, current_year, current_tick")
      .limit(1)
      .maybeSingle(),
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
    supabase.from("territories").select("id, name").order("name"),
    supabase.from("kingdoms").select("id, name").order("name"),
    supabase
      .from("troop_movements")
      .select("id", { count: "exact", head: true })
      .eq("status", "IN_TRANSIT"),
    supabase
      .from("territory_disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "OPEN"),
  ]);

  const gameState = gameStateData as GameState | null;
  const currentDay = Number(gameState?.current_day ?? 1);
  const currentYear = Number(gameState?.current_year ?? 725);
  const currentTick = Number(gameState?.current_tick ?? currentDay);

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
            <Link href="/mi-reino" className="transition hover:text-[#e12b2b]">
              Mi Reino
            </Link>
            <Link href="/admin" className="text-[#e12b2b]">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-8 py-12">
        <div className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-8">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Panel de administración
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none text-[#fff8ef]">
              Administración
            </h1>
            <p className="mt-5 max-w-2xl leading-7 text-[#b6a9a1]">
              Control del tiempo de campaña, disputas territoriales y estado del
              mundo.
            </p>
          </div>

          <div className="grid gap-8 p-8 xl:grid-cols-[1fr_420px]">
            <div className="space-y-8">
              <section className="grid gap-5 md:grid-cols-4">
                <article className="border border-[#251014] bg-black/45 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                    Año
                  </p>
                  <p className="mt-3 text-4xl font-black text-[#fff8ef]">
                    {currentYear}
                  </p>
                </article>

                <article className="border border-[#251014] bg-black/45 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                    Día
                  </p>
                  <p className="mt-3 text-4xl font-black text-[#fff8ef]">
                    {currentDay}
                  </p>
                </article>

                <article className="border border-[#251014] bg-black/45 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                    Tick
                  </p>
                  <p className="mt-3 text-4xl font-black text-[#fff8ef]">
                    {currentTick}
                  </p>
                </article>

                <article className="border border-[#251014] bg-black/45 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                    En tránsito
                  </p>
                  <p className="mt-3 text-4xl font-black text-[#fff8ef]">
                    {inTransitCount ?? 0}
                  </p>
                </article>
              </section>

              <AdminDisputesPanel
                disputes={(disputesData ?? []) as TerritoryDispute[]}
                attackers={(disputeAttackersData ?? []) as TerritoryDisputeAttacker[]}
                territories={(territoriesData ?? []) as Territory[]}
                kingdoms={(kingdomsData ?? []) as Kingdom[]}
              />
            </div>

            <aside className="space-y-8">
              <AdvanceDayPanel
                currentDay={currentDay}
                currentYear={currentYear}
              />

              <section className="border border-[#251014] bg-black/45 p-6">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                  Estado rápido
                </p>

                <div className="mt-5 space-y-3 text-sm leading-6 text-[#b6a9a1]">
                  <p>
                    Disputas abiertas:{" "}
                    <span className="font-black text-[#fff8ef]">
                      {openDisputesCount ?? 0}
                    </span>
                  </p>
                  <p>
                    Movimientos en tránsito:{" "}
                    <span className="font-black text-[#fff8ef]">
                      {inTransitCount ?? 0}
                    </span>
                  </p>
                  <p>
                    Administrador:{" "}
                    <span className="font-black text-[#fff8ef]">
                      {user.email}
                    </span>
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
