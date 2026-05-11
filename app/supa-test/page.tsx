import { createClient } from "@/utils/supabase/server";

export default async function SupaTestPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kingdoms")
    .select("*")
    .limit(5);

  return (
    <main className="min-h-screen bg-[#0b0704] p-8 text-[#f4ead8]">
      <h1 className="text-4xl font-bold text-[#fff7e6]">
        Prueba de conexión Supabase
      </h1>

      <div className="mt-6 rounded-2xl border border-[#3a2816] bg-[#17100a] p-6">
        {error ? (
          <div>
            <p className="font-semibold text-red-400">Error de conexión o tabla inexistente:</p>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-[#d6c7ad]">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-green-400">
              Conexión correcta. Datos recibidos:
            </p>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-[#d6c7ad]">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
