"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setMessage(
          "Registro creado. Revisa tu email si Supabase solicita confirmación.",
        );
      }
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        window.location.href = "/mi-reino";
      }
    }

    setLoading(false);
  }

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
            <Link href="/facciones" className="transition hover:text-[#e12b2b]">
              Facciones
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-81px)] max-w-5xl items-center justify-center px-8 py-12">
        <div className="w-full max-w-xl border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#82141d] via-[#4e0d14] to-[#110406] p-8">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#ffdada]">
              Acceso de jugador
            </p>
            <h1 className="mt-5 text-4xl font-black uppercase text-white">
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-8">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-3 w-full border border-[#3a0c12] bg-black/60 px-4 py-3 text-[#fff8ef] outline-none transition focus:border-[#e12b2b]"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.3em] text-[#d83a3a]">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-3 w-full border border-[#3a0c12] bg-black/60 px-4 py-3 text-[#fff8ef] outline-none transition focus:border-[#e12b2b]"
              />
            </div>

            {errorMessage && (
              <div className="border border-[#7f1d1d] bg-black/50 p-4 text-sm text-[#fca5a5]">
                {errorMessage}
              </div>
            )}

            {message && (
              <div className="border border-[#3a0c12] bg-black/50 p-4 text-sm text-[#d7c9bd]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full border border-[#c3222b] bg-black/70 px-6 py-4 text-sm font-black uppercase tracking-[0.3em] text-[#fff8ef] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Procesando..."
                : mode === "login"
                  ? "Entrar"
                  : "Registrarme"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setMessage(null);
                setErrorMessage(null);
              }}
              className="w-full text-sm text-[#b6a9a1] transition hover:text-[#fff8ef]"
            >
              {mode === "login"
                ? "¿No tienes cuenta? Crear cuenta"
                : "¿Ya tienes cuenta? Entrar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
