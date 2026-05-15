import { PlayerDisputesPanel } from "./player-disputes-panel";
import { ScoutReportsPanel } from "./scout-reports-panel";

type Kingdom = {
  id: string;
  name: string;
  color: string;
};

type Territory = {
  id: string;
  name: string;
  type: "CAPITAL" | "CITY" | "STATION";
  soldiers: number;
  mercenaries?: number | null;
  owner_kingdom_id: string | null;
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

type ScoutReport = {
  id: string;
  territory_id: string;
  territory_owner_kingdom_id: string | null;
  game_day: number;
  year: number;
  observed_soldiers: number;
  created_at: string | null;
};

type DisputesIntelligencePanelProps = {
  selectedKingdomId: string;
  territories: Territory[];
  kingdoms: Kingdom[];
  disputes: TerritoryDispute[];
  attackers: TerritoryDisputeAttacker[];
  scoutReports: ScoutReport[];
};

function StatBox({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "red" | "gold" | "blue";
}) {
  const toneClass =
    tone === "red"
      ? "text-[#fca5a5]"
      : tone === "gold"
        ? "text-[#f7c873]"
        : tone === "blue"
          ? "text-[#7dd3fc]"
          : "text-[#fff8ef]";

  return (
    <div className="border border-[#251014] bg-black/55 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7f7470]">
        {label}
      </p>
      <p className={["mt-2 text-3xl font-black", toneClass].join(" ")}>
        {value}
      </p>
    </div>
  );
}

export function DisputesIntelligencePanel({
  selectedKingdomId,
  territories,
  kingdoms,
  disputes,
  attackers,
  scoutReports,
}: DisputesIntelligencePanelProps) {
  const ownAttacks = disputes.filter((dispute) =>
    attackers.some(
      (attacker) =>
        attacker.dispute_id === dispute.id &&
        attacker.kingdom_id === selectedKingdomId,
    ),
  );

  const ownDefenses = disputes.filter(
    (dispute) => dispute.defender_kingdom_id === selectedKingdomId,
  );

  const relevantDisputes = disputes.filter(
    (dispute) =>
      dispute.defender_kingdom_id === selectedKingdomId ||
      attackers.some(
        (attacker) =>
          attacker.dispute_id === dispute.id &&
          attacker.kingdom_id === selectedKingdomId,
      ),
  );

  return (
    <section id="disputas" className="border border-[#251014] bg-black/45">
      <div className="border-b border-[#251014] bg-gradient-to-r from-[#120507] to-black p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d83a3a]">
              Disputas e inteligencia
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase text-[#fff8ef]">
              Frente, asedios e informes
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#b6a9a1]">
              Controla las batallas pendientes y los últimos informes de
              exploración sin perderte entre bloques separados.
            </p>
          </div>

          <div className="grid min-w-[360px] grid-cols-3 gap-3">
            <StatBox
              label="Disputas"
              value={relevantDisputes.length}
              tone="red"
            />
            <StatBox label="Asedios" value={ownAttacks.length} tone="gold" />
            <StatBox label="Defensas" value={ownDefenses.length} tone="blue" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-[#251014] bg-black/35">
          <div className="border-b border-[#251014] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
              Batallas pendientes
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-[#fff8ef]">
              Disputas activas
            </h3>
          </div>

          <div className="p-5">
            <PlayerDisputesPanel
              disputes={relevantDisputes}
              attackers={attackers}
              territories={territories}
              kingdoms={kingdoms}
              selectedKingdomId={selectedKingdomId}
            />
          </div>
        </div>

        <div className="border border-[#251014] bg-black/35">
          <div className="border-b border-[#251014] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d83a3a]">
              Inteligencia militar
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-[#fff8ef]">
              Informes de exploración
            </h3>
          </div>

          <div className="p-5">
            <ScoutReportsPanel
              reports={scoutReports}
              territories={territories}
              kingdoms={kingdoms}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
