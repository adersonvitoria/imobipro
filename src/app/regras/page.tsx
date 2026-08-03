import { CalendarClock, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { TituloPagina } from "@/components/ui";
import RegraCard from "@/components/regra-card";

export const dynamic = "force-dynamic";

export default async function Regras() {
  const regras = await db.regra.findMany({ orderBy: { ordem: "asc" } });
  const diarias = regras.filter((r) => r.grupo === "DIARIO");
  const instantaneas = regras.filter((r) => r.grupo === "INSTANTANEO");

  return (
    <div>
      <TituloPagina
        sobre="régua de comunicação"
        titulo={
          <>
            Disparos no <span className="text-brand">piloto automático</span>
          </>
        }
      />

      <p className="-mt-4 mb-8 max-w-2xl text-[0.9rem] text-ink-2 animate-fade-up">
        Cada regra é um funcionário incansável: liga, desliga e edita o texto como quiser.
        A mensagem sai <span className="text-ink">sempre no momento certo</span> — hoje, amanhã e todo dia.
      </p>

      <section className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="mb-3.5 flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-brand/30 bg-brand-faint text-brand">
            <CalendarClock size={13} />
          </span>
          <h2 className="font-display text-[1.2rem]">Diárias — rodam sozinhas todo dia</h2>
        </div>
        <div className="space-y-3.5">
          {diarias.map((r) => (
            <RegraCard key={r.id} regra={r} />
          ))}
        </div>
      </section>

      <section className="mt-9 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="mb-3.5 flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-brand/30 bg-brand-faint text-brand">
            <Zap size={13} />
          </span>
          <h2 className="font-display text-[1.2rem]">Instantâneas — na mudança de etapa</h2>
        </div>
        <div className="space-y-3.5">
          {instantaneas.map((r) => (
            <RegraCard key={r.id} regra={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
