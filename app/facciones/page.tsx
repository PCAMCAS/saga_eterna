import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type Kingdom = {
  id: string;
  name: string;
  description: string | null;
  color: string;
};

export default async function FaccionesPage() {
  const supabase = await createClient();

  const { data: kingdoms } = await supabase
    .from("kingdoms")
    .select("*")
    .order("name");

  const kingdomList = (kingdoms ?? []) as Kingdom[];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050203] text-[#f3eee8]">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_18%_82%,rgba(244,214,170,0.10),transparent_17%),radial-gradient(circle_at_48%_18%,rgba(125,18,31,0.36),transparent_34%),radial-gradient(circle_at_82%_70%,rgba(60,7,14,0.44),transparent_26%),linear-gradient(135deg,#040102_0%,#160509_45%,#050203_100%)]" />

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
            <Link href="/registro-global" className="transition hover:text-[#e12b2b]">
              Registro
            </Link>
            <Link href="/facciones" className="text-[#e12b2b]">
              Facciones
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-8 py-12">
        <div className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-8">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Poderes del mundo
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none text-[#fff8ef]">
              Facciones
            </h1>
            <p className="mt-5 max-w-2xl leading-7 text-[#b6a9a1]">
              Resumen de los reinos activos en la campaña.
            </p>
          </div>

          <div className="grid gap-5 p-8 md:grid-cols-2">
            {kingdomList.map((kingdom) => (
              <article
                key={kingdom.id}
                className="border border-[#251014] bg-black/45 p-6"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="h-4 w-4 rounded-full shadow-[0_0_18px_currentColor]"
                    style={{
                      backgroundColor: kingdom.color,
                      color: kingdom.color,
                    }}
                  />
                  <h2 className="text-2xl font-black text-[#fff8ef]">
                    {kingdom.name}
                  </h2>
                </div>

                <p className="mt-4 leading-7 text-[#b6a9a1]">
                  {kingdom.description ?? "Sin descripción."}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
