import Link from "next/link";
import type { ReactNode } from "react";

type KingdomSidebarPanelProps = {
  userEmail: string | null | undefined;
  isAdmin: boolean;
  currentDay: number;
  currentYear: number;
  vulnerableTerritories: string[];
  openDisputes: number;
  troopMovements: number;
  councilLines: string[];
  leaveKingdom: () => Promise<void>;
  signOut: () => Promise<void>;
};

function SidebarCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] bg-black/50 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#d83a3a]">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-xl font-black uppercase text-[#fff8ef]">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SidebarLink({
  href,
  children,
  tone = "red",
}: {
  href: string;
  children: ReactNode;
  tone?: "red" | "gold" | "muted";
}) {
  const toneClass =
    tone === "gold"
      ? "border-[#854d0e] hover:border-[#f59e0b] hover:text-[#fef3c7]"
      : tone === "muted"
        ? "border-[#251014] hover:border-[#7f7470]"
        : "border-[#c3222b] hover:bg-[#991b1b]";

  return (
    <Link
      href={href}
      className={[
        "block border bg-black/70 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.22em] text-[#fff8ef] transition",
        toneClass,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function KingdomSidebarPanel({
  userEmail,
  isAdmin,
  currentDay,
  currentYear,
  vulnerableTerritories,
  openDisputes,
  troopMovements,
  councilLines,
  leaveKingdom,
  signOut,
}: KingdomSidebarPanelProps) {
  return (
    <aside className="space-y-5">
      <SidebarCard eyebrow="Consejo" title="Informe del reino">
        <div className="space-y-3">
          {councilLines.slice(0, 3).map((line) => (
            <p
              key={line}
              className="border-l-2 border-[#d83a3a] bg-black/35 px-4 py-3 text-sm leading-6 text-[#d7c9bd]"
            >
              Mi señor, {line}
            </p>
          ))}
        </div>
      </SidebarCard>

      <SidebarCard eyebrow="Alertas" title="Prioridades">
        <div className="space-y-3">
          {openDisputes > 0 && (
            <div className="border border-[#7f1d1d] bg-[#190506]/60 p-4">
              <p className="text-sm font-black text-[#fca5a5]">
                {openDisputes} disputa{openDisputes === 1 ? "" : "s"} activa
                {openDisputes === 1 ? "" : "s"}.
              </p>
              <p className="mt-2 text-xs leading-5 text-[#b6a9a1]">
                Requiere atención estratégica.
              </p>
            </div>
          )}

          {vulnerableTerritories.length > 0 ? (
            <div className="border border-[#854d0e] bg-[#180d04]/60 p-4">
              <p className="text-sm font-black text-[#fde68a]">
                Ciudades vulnerables
              </p>
              <p className="mt-2 text-xs leading-5 text-[#b6a9a1]">
                {vulnerableTerritories.join(", ")}
              </p>
            </div>
          ) : (
            <div className="border border-[#3f6212] bg-black/45 p-4">
              <p className="text-sm font-black text-[#bef264]">
                Sin alertas críticas.
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7f7470]">
                El reino se mantiene estable.
              </p>
            </div>
          )}

          <div className="border border-[#251014] bg-black/45 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7f7470]">
              Órdenes en tránsito
            </p>
            <p className="mt-2 text-3xl font-black text-[#fff8ef]">
              {troopMovements.toLocaleString("es-ES")}
            </p>
          </div>
        </div>
      </SidebarCard>

      <SidebarCard eyebrow="Accesos" title="Rutas rápidas">
        <div className="grid gap-3">
          <SidebarLink href="/mapa">Mapa estratégico</SidebarLink>
          <SidebarLink href="/registro-global" tone="gold">
            Registro global
          </SidebarLink>
          <SidebarLink href="/reglas" tone="muted">
            Reglas
          </SidebarLink>
          {isAdmin && <SidebarLink href="/admin">Panel admin</SidebarLink>}
        </div>
      </SidebarCard>

      <SidebarCard eyebrow="Cuenta" title="Sesión">
        <div className="space-y-4">
          <div className="border border-[#251014] bg-black/45 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
              Jugador
            </p>
            <p className="mt-2 break-words text-sm font-black text-[#fff8ef]">
              {userEmail ?? "Sin email"}
            </p>
          </div>

          <div className="border border-[#251014] bg-black/45 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d83a3a]">
              Fecha
            </p>
            <p className="mt-2 text-lg font-black text-[#fff8ef]">
              Día {currentDay} del {currentYear} d.C.
            </p>
          </div>

          <form action={leaveKingdom}>
            <button
              type="submit"
              className="w-full border border-[#854d0e] bg-black/70 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#fff8ef] transition hover:border-[#f59e0b] hover:text-[#fef3c7]"
            >
              Salir de facción
            </button>
          </form>

          <form action={signOut}>
            <button
              type="submit"
              className="w-full border border-[#251014] bg-black/70 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#fff8ef] transition hover:border-[#7f7470]"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </SidebarCard>
    </aside>
  );
}
