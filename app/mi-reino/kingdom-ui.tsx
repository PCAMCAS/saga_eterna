import Link from "next/link";
import type { ReactNode } from "react";

export function CommandCard({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "border border-[#251014] bg-black/45 shadow-[0_0_40px_rgba(0,0,0,0.35)]",
        className,
      ].join(" ")}
    >
      {(eyebrow || title || description) && (
        <div className="border-b border-[#251014] p-6">
          {eyebrow && (
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-[#fff8ef]">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b6a9a1]">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "neutral" | "gold" | "food" | "danger" | "blue";
}) {
  const toneClass =
    tone === "gold"
      ? "text-[#f7c873]"
      : tone === "food"
        ? "text-[#bef264]"
        : tone === "danger"
          ? "text-[#fca5a5]"
          : tone === "blue"
            ? "text-[#7dd3fc]"
            : "text-[#fff8ef]";

  return (
    <div className="border border-[#251014] bg-black/55 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d83a3a]">
        {label}
      </p>
      <p className={["mt-4 text-4xl font-black tracking-tight", toneClass].join(" ")}>
        {value}
      </p>
      {detail && <p className="mt-2 text-xs leading-5 text-[#7f7470]">{detail}</p>}
    </div>
  );
}

export function ActionButton({
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
        "block border bg-black/70 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.25em] text-[#fff8ef] transition",
        toneClass,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function SectionTabs() {
  const tabs = [
    ["Resumen", "#resumen"],
    ["Ejército", "#ejercito"],
    ["Economía", "#economia"],
    ["Órdenes", "#ordenes"],
    ["Disputas", "#disputas"],
    ["Inteligencia", "#inteligencia"],
    ["Registro", "#registro"],
  ];

  return (
    <nav className="sticky top-[73px] z-30 border border-[#251014] bg-black/85 backdrop-blur">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        {tabs.map(([label, href], index) => (
          <a
            key={href}
            href={href}
            className={[
              "border-[#251014] px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.25em] transition hover:bg-[#1a0a0c] hover:text-[#fff8ef]",
              index === 0
                ? "border-b-2 border-b-[#d83a3a] text-[#ff4b4b]"
                : "text-[#b6a9a1]",
            ].join(" ")}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger" | "gold";
}) {
  const toneClass =
    tone === "good"
      ? "border-[#3f6212] text-[#bef264]"
      : tone === "warn"
        ? "border-[#854d0e] text-[#fde68a]"
        : tone === "danger"
          ? "border-[#7f1d1d] text-[#fca5a5]"
          : tone === "gold"
            ? "border-[#854d0e] text-[#f7c873]"
            : "border-[#251014] text-[#d7c9bd]";

  return (
    <span
      className={[
        "inline-flex items-center border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
        toneClass,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
