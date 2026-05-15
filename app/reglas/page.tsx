import Link from "next/link";

const sections = [
  {
    title: "Calendario del mundo",
    items: [
      "La campaña comienza en el año 725 d.C.",
      "No existen meses: solo día del año y año.",
      "El día inicial corresponde al día real del año actual.",
      "Cada avance de día mueve la campaña un día hacia delante.",
    ],
  },
  {
    title: "Inicio de campaña",
    items: [
      "Cada reino comienza con sus territorios originales.",
      "Las capitales empiezan con 10 soldados.",
      "Las ciudades empiezan con 0 soldados.",
      "Los nodos de viaje no pertenecen a ningún reino y no tienen soldados.",
    ],
  },
  {
    title: "Economía diaria",
    items: [
      "Las capitales producen 100 oro al día.",
      "El oro se almacena en el territorio que lo produce.",
      "Las ciudades solo producen oro si tienen un edificio económico.",
      "La comida se produce en capitales mediante edificios de producción de comida.",
      "Los edificios se ordenan durante el día y se completan al inicio del siguiente día.",
    ],
  },
  {
    title: "Edificios",
    items: [
      "El edificio de oro aumenta la producción diaria de oro del territorio.",
      "En capitales, los edificios pueden subir hasta nivel 10.",
      "En ciudades, el edificio de oro puede subir hasta nivel 3.",
      "El edificio de comida solo puede construirse en capitales.",
      "El cuartel solo puede construirse en capitales.",
      "Las ciudades solo pueden construir edificios de oro.",
      "Si un territorio es conquistado, sus edificios quedan destruidos y se resetean a nivel 0.",
    ],
  },
  {
    title: "Soldados regulares",
    items: [
      "Los soldados regulares se entrenan en capitales con cuartel.",
      "Cada soldado regular cuesta 5 oro al entrenarse.",
      "El entrenamiento se completa al inicio del siguiente día.",
      "Los cuarteles de mayor nivel permiten entrenar más soldados por día.",
      "A partir de cuartel nivel 7, entrenar soldados es más barato.",
      "Cada soldado regular consume 1 comida al día.",
      "Si no hay comida suficiente, los soldados sin suministros se pierden.",
    ],
  },
  {
    title: "Mercenarios",
    items: [
      "Los mercenarios se compran en capitales.",
      "Cada mercenario cuesta 10 oro y aparece inmediatamente.",
      "Si la capital está en disputa, cada mercenario cuesta 20 oro.",
      "Cada mercenario cuesta 1 oro de mantenimiento diario.",
      "Si no se puede pagar el mantenimiento, los mercenarios impagados abandonan el ejército.",
    ],
  },
  {
    title: "Refuerzos manuales",
    items: [
      "Puedes enviar tropas desde un territorio propio hacia otro territorio propio conectado.",
      "Puedes mover soldados regulares, mercenarios o ambos a la vez.",
      "Las tropas salen inmediatamente del origen.",
      "El destino no recibe las tropas hasta que se complete el viaje.",
      "También puedes reforzar un asedio si tu reino participa como atacante.",
    ],
  },
  {
    title: "Ataques",
    items: [
      "Puedes atacar territorios enemigos conectados desde un territorio propio.",
      "Puedes enviar soldados regulares, mercenarios o ambos.",
      "Las tropas atacantes salen inmediatamente del origen.",
      "La batalla se resuelve cuando el ejército llega.",
      "La fuerza total de un ejército es soldados regulares + mercenarios.",
      "Si varios ejércitos atacan el mismo territorio, se compara la fuerza total de todos los bandos.",
      "El bando con más fuerza gana. En caso de empate en primer puesto, el defensor resiste.",
      "Si un territorio es conquistado, queda con 0 soldados y 0 mercenarios.",
    ],
  },
  {
    title: "Disputas presenciales",
    items: [
      "Si un ataque entre jugadores ganaría el territorio, puede abrirse una disputa.",
      "Un territorio en disputa representa un asedio pendiente de batalla presencial.",
      "Mientras la disputa esté abierta, los participantes pueden seguir enviando refuerzos.",
      "Puede haber varios atacantes implicados en una misma disputa.",
      "Solo el administrador puede resolver una disputa y elegir el ganador.",
    ],
  },
  {
    title: "Información e investigación",
    items: [
      "Solo ves los soldados exactos de tu propia facción.",
      "Los soldados enemigos permanecen ocultos.",
      "Puedes investigar un territorio una vez por día.",
      "La investigación guarda un informe privado con las tropas observadas en ese momento.",
      "Los informes pueden quedar desactualizados si el enemigo mueve tropas después.",
    ],
  },
  {
    title: "Administrador",
    items: [
      "El administrador avanza los días de campaña.",
      "El administrador resuelve disputas presenciales.",
      "El administrador no sustituye las decisiones de los jugadores: solo arbitra el estado del mundo.",
    ],
  },
];

export default function ReglasPage() {
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
            <Link href="/facciones" className="transition hover:text-[#e12b2b]">
              Facciones
            </Link>
            <Link href="/mi-reino" className="transition hover:text-[#e12b2b]">
              Mi Reino
            </Link>
            <Link href="/reglas" className="text-[#e12b2b]">
              Reglas
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-8 py-12">
        <div className="border border-[#3a0c12] bg-[#080607]/92 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#3a0c12] bg-gradient-to-br from-[#130608] to-[#080607] p-8">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#d83a3a]">
              Manual de campaña
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none text-[#fff8ef]">
              Reglas
            </h1>
            <p className="mt-5 max-w-3xl leading-7 text-[#b6a9a1]">
              Guía rápida para dirigir ejércitos, investigar enemigos, mover
              tropas, resolver ataques y disputar territorios mediante batallas
              presenciales.
            </p>
          </div>

          <div className="grid gap-6 p-8 lg:grid-cols-2">
            {sections.map((section) => (
              <article
                key={section.title}
                className="border border-[#251014] bg-black/45 p-6"
              >
                <h2 className="text-2xl font-black uppercase text-[#fff8ef]">
                  {section.title}
                </h2>

                <ul className="mt-5 space-y-3">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="border-l-2 border-[#d83a3a] pl-4 text-sm leading-6 text-[#d7c9bd]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
