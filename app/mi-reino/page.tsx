import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { selectKingdom } from "./actions";

type Kingdom = {
  id: string;
  name: string;
  description: string | null;
  color: string;
};

type Profile = {
  id: string;
  username: string | null;
  kingdom_id: string | null;
};

export default async function MiReinoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let kingdoms: Kingdom[] = [];

  if (user) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, username, kingdom_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { data: createdProfile } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username: user.email,
        })
        .select("id, username, kingdom_id")
        .single();

      profile = createdProfile as Profile | null;
    } else {
      profile = existingProfile as Profile;
    }

    const { data: kingdomData } = await supabase
      .from("kingdoms")
      .select("*")
      .order("name");

    kingdoms = (kingdomData ?? []) as Kingdom[];
  }

  const selectedKingdom = kingdoms.find(
    (kingdom) => kingdom.id === profile?.kingdom_id,
  );

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
            <Link href="/registro-global" className="transition hover:text-[#e12b2b]">
              Registro
            </Link>
            <Link href="/facciones" className="transition hover:text-[#e12b2b]">
              Facciones
            </Link>
            <Link href="/mi-reino" className="text-[#e12b2b]">
              Mi Reino
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-8 py-12">
        <div className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-8">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Panel del jugador
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none text-[#fff8ef]">
              Mi Reino
            </h1>
            <p className="mt-5 max-w-2xl leading-7 text-[#b6a9a1]">
              Consulta tu cuenta, elige tu reino y prepara tus futuras acciones
              diarias.
            </p>
          </div>

          <div className="p-8">
            {!user ? (
              <div className="border border-[#251014] bg-black/45 p-6">
                <h2 className="text-2xl font-black text-[#fff8ef]">
                  No has iniciado sesión
                </h2>
                <p className="mt-4 leading-7 text-[#b6a9a1]">
                  Necesitas entrar o registrarte para seleccionar un reino y
                  participar en la campaña.
                </p>

                <Link
                  href="/login"
                  className="mt-6 inline-flex border border-[#c3222b] bg-black/70 px-6 py-4 text-sm font-black uppercase tracking-[0.3em] text-[#fff8ef] transition hover:bg-[#b91c1c]"
                >
                  Entrar
                </Link>
              </div>
            ) : selectedKingdom ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="border border-[#251014] bg-black/45 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                    Reino jurado
                  </p>

                  <div className="mt-5 flex items-center gap-4">
                    <span
                      className="h-5 w-5 rounded-full shadow-[0_0_22px_currentColor]"
                      style={{
                        backgroundColor: selectedKingdom.color,
                        color: selectedKingdom.color,
                      }}
                    />
                    <h2 className="text-3xl font-black text-[#fff8ef]">
                      {selectedKingdom.name}
                    </h2>
                  </div>

                  <p className="mt-5 leading-7 text-[#b6a9a1]">
                    {selectedKingdom.description ?? "Sin descripción."}
                  </p>

                  <div className="mt-6 border border-[#3a0c12] bg-[#090304] p-4">
                    <p className="text-sm leading-6 text-[#d7c9bd]">
                      Has jurado lealtad a este reino. Esta elección es
                      irreversible para esta cuenta.
                    </p>
                  </div>
                </div>

                <aside className="border border-[#251014] bg-black/45 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                    Cuenta
                  </p>
                  <p className="mt-4 text-lg font-black text-[#fff8ef]">
                    {user.email}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-[#b6a9a1]">
                    Próximamente desde aquí podrás reforzar territorios, atacar
                    enemigos e investigar tropas.
                  </p>
                </aside>
              </div>
            ) : (
              <div>
                <div className="border border-[#251014] bg-black/45 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d83a3a]">
                    Sesión activa
                  </p>

                  <h2 className="mt-4 text-2xl font-black text-[#fff8ef]">
                    {user.email}
                  </h2>

                  <p className="mt-4 leading-7 text-[#b6a9a1]">
                    Aún no has elegido reino. Escoge con cuidado: esta decisión
                    no podrá cambiarse después.
                  </p>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  {kingdoms.map((kingdom) => (
                    <form
                      key={kingdom.id}
                      action={selectKingdom}
                      className="border border-[#251014] bg-black/45 p-6 transition hover:border-[#c3222b]"
                    >
                      <input
                        type="hidden"
                        name="kingdomId"
                        value={kingdom.id}
                      />

                      <div className="flex items-center gap-4">
                        <span
                          className="h-5 w-5 rounded-full shadow-[0_0_22px_currentColor]"
                          style={{
                            backgroundColor: kingdom.color,
                            color: kingdom.color,
                          }}
                        />
                        <h3 className="text-2xl font-black text-[#fff8ef]">
                          {kingdom.name}
                        </h3>
                      </div>

                      <p className="mt-5 min-h-20 leading-7 text-[#b6a9a1]">
                        {kingdom.description ?? "Sin descripción."}
                      </p>

                      <button
                        type="submit"
                        className="mt-6 w-full border border-[#c3222b] bg-black/70 px-5 py-4 text-sm font-black uppercase tracking-[0.28em] text-[#fff8ef] transition hover:bg-[#b91c1c]"
                      >
                        Jurar lealtad
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
