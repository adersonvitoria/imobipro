"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { salvarTemplate, toggleRegra } from "@/app/actions";
import { render, PLACEHOLDERS } from "@/lib/templates";
import { Chip } from "@/components/ui";
import { WaBolha } from "@/components/wa";

const SAMPLE: Record<string, string> = {
  nome: "Camila",
  proprietario: "Sr. Nelson",
  imovel: "Apto 302 · Ed. Solar das Acácias",
  data: "03/08",
  hora: "09:00",
  responsavel: "Marilice Souza",
  loja: "Rua Osvaldo Aranha, 1305 · Centro",
  horario_loja: "seg a sex, 9h às 18h",
  valor: "R$ 1.650",
  vencimento: "05/08",
  corretor: "Gustavo Farias",
  lista: "• 09:00 — Entrega de chaves — Camila Ferreira\n• 14:00 — Vistoria de entrada — Felipe Xavier",
  imobiliaria: "VeraBrokers",
  repasse: "dia 5",
  resumo:
    "🔑 Entregas de chave hoje (2):\n   • 10:30 — Henrique (Apto 501) c/ Marilice\n   • 15:00 — Débora (Casa · Pq. dos Anjos) c/ Diego\n💰 Carteira ativa: R$ 5.930/mês (4 contratos)\n📥 A receber: R$ 9.880 em aberto\n📤 A pagar: R$ 6.497\n🧾 NFS-e: 4 emitidas no mês\n✅ Nenhum alerta — operação redonda",
};

const DESTINO: Record<string, { tom: "info" | "ouro" | "ok"; rotulo: string }> = {
  INQUILINO: { tom: "info", rotulo: "→ inquilino" },
  PROPRIETARIO: { tom: "ouro", rotulo: "→ proprietário" },
  EQUIPE: { tom: "ok", rotulo: "→ equipe" },
};

export default function RegraCard({
  regra,
}: {
  regra: {
    id: string;
    tipo: string;
    nome: string;
    descricao: string;
    destino: string;
    hora: string | null;
    ativo: boolean;
    template: string;
  };
}) {
  const [ativo, setAtivo] = useState(regra.ativo);
  const [template, setTemplate] = useState(regra.template);
  const [editando, setEditando] = useState(false);
  const [pendente, start] = useTransition();
  const router = useRouter();
  const sujo = template !== regra.template;
  const destino = DESTINO[regra.destino] ?? DESTINO.INQUILINO;

  return (
    <div className={`card p-5 transition-opacity ${ativo ? "" : "opacity-55"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[0.92rem] font-medium">{regra.nome}</h3>
            <Chip tom={destino.tom}>{destino.rotulo}</Chip>
            {regra.hora && (
              <span className="font-mono text-[0.66rem] text-ink-3">todo dia às {regra.hora}</span>
            )}
          </div>
          <p className="mt-1 text-[0.74rem] leading-relaxed text-ink-3">{regra.descricao}</p>
        </div>

        {/* interruptor */}
        <button
          role="switch"
          aria-checked={ativo}
          onClick={() => {
            const novo = !ativo;
            setAtivo(novo);
            start(async () => {
              await toggleRegra(regra.id, novo);
              toast.success(novo ? `“${regra.nome}” ligada ⚡` : `“${regra.nome}” pausada`);
              router.refresh();
            });
          }}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
            ativo ? "bg-brand/80 border-brand" : "bg-[var(--soft-2)] border-[var(--hairline)]"
          }`}
        >
          <span
            className={`absolute top-1/2 -translate-y-1/2 h-4.5 w-4.5 rounded-full transition-all ${
              ativo ? "left-[22px] bg-[#ffffff]" : "left-[3px] bg-ink-3"
            }`}
            style={{ width: 18, height: 18 }}
          />
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[0.64rem] uppercase tracking-[0.14em] text-ink-3">Mensagem</span>
            {sujo && (
              <button
                className="flex items-center gap-1 text-[0.68rem] text-brand hover:brightness-110"
                disabled={pendente}
                onClick={() =>
                  start(async () => {
                    await salvarTemplate(regra.id, template);
                    toast.success("Template salvo — vale a partir do próximo disparo.");
                    setEditando(false);
                    router.refresh();
                  })
                }
              >
                <Save size={11} />
                {pendente ? "salvando…" : "salvar"}
              </button>
            )}
          </div>
          <textarea
            className="field !text-[0.78rem] leading-relaxed min-h-[130px] resize-y"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            onFocus={() => setEditando(true)}
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(PLACEHOLDERS[regra.tipo] ?? []).map((p) => (
              <button
                key={p}
                className="rounded-md border border-[var(--hairline)] px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-3 hover:border-brand/40 hover:text-brand transition-colors"
                onClick={() => setTemplate((t) => `${t} {{${p}}}`)}
                title="Adicionar variável"
              >
                {"{{"}
                {p}
                {"}}"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[0.64rem] uppercase tracking-[0.14em] text-ink-3">
            Como chega no WhatsApp
          </div>
          <div className="flex justify-end rounded-xl bg-[#0b141a] p-3.5 border border-[var(--hairline)]">
            <WaBolha texto={render(template, SAMPLE)} hora={regra.hora ?? "agora"} />
          </div>
        </div>
      </div>
    </div>
  );
}
