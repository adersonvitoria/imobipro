import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  KeyRound,
  ListChecks,
  Radio,
  Receipt,
  Smartphone,
  Wallet,
} from "lucide-react";
import { brl } from "@/lib/dates";
import { coletarSnapshot, respostaResumo } from "@/lib/analista";
import { TituloPagina } from "@/components/ui";
import AnalistaChat from "@/components/analista-chat";

export const dynamic = "force-dynamic";

export default async function Analista() {
  const snap = await coletarSnapshot();
  const inicial = { resposta: respostaResumo(snap), hora: snap.geradoEm };

  const alertas: string[] = [];
  if (snap.financeiro.receberVencidas.length > 0)
    alertas.push(`${snap.financeiro.receberVencidas.length} recebimento(s) em atraso`);
  if (snap.financeiro.pagarHojeQtd > 0)
    alertas.push(`${snap.financeiro.pagarHojeQtd} conta(s) a pagar vencem hoje`);
  if (snap.notasFiscais.pendentes.length > 0)
    alertas.push(`${snap.notasFiscais.pendentes.length} NFS-e pendente(s) de emissão`);
  if (snap.regrasDesligadas.length > 0)
    alertas.push(`Regras desligadas: ${snap.regrasDesligadas.join(", ")}`);
  if (snap.entregasSemResp > 0) alertas.push(`${snap.entregasSemResp} entrega(s) sem responsável`);
  if (snap.tarefas.atrasadas.length > 0)
    alertas.push(`${snap.tarefas.atrasadas.length} tarefa(s) passaram do horário`);

  const pulso = [
    { icon: Wallet, rotulo: "Carteira ativa", valor: `${brl(snap.carteira.valorMes)}/mês` },
    { icon: ArrowDownToLine, rotulo: "A receber (aberto)", valor: brl(snap.financeiro.receberAberto) },
    { icon: ArrowUpFromLine, rotulo: "A pagar (aberto)", valor: brl(snap.financeiro.pagarAberto) },
    { icon: Receipt, rotulo: "NFS-e no mês", valor: `${snap.notasFiscais.emitidasMes} emitidas` },
    { icon: KeyRound, rotulo: "Entregas", valor: `${snap.entregasHoje.length} hoje · ${snap.entregasAmanha.length} amanhã` },
    { icon: ListChecks, rotulo: "Tarefas do dia", valor: `${snap.tarefas.concluidas}/${snap.tarefas.total} feitas` },
    { icon: Radio, rotulo: "Disparos hoje", valor: `${snap.disparos.hoje}` },
  ];

  return (
    <div>
      <TituloPagina
        sobre="inteligência sobre os seus dados"
        titulo={
          <>
            Pergunte <span className="text-brand">como está a operação</span>
          </>
        }
      />

      <p className="-mt-4 mb-7 max-w-2xl text-[0.9rem] text-ink-2 animate-fade-up">
        O Analista lê <span className="text-ink">tudo</span> — contratos, entregas, tarefas,
        contas a pagar e a receber, notas fiscais, boletos e disparos — e responde na hora, com
        números reais. A gestão ainda recebe um{" "}
        <span className="text-ink">boletim diário às 07:45 no WhatsApp</span>.
      </p>

      <div className="grid lg:grid-cols-3 gap-3.5 items-start">
        <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <AnalistaChat inicial={inicial} />
        </div>

        <div className="space-y-3.5">
          <section className="card p-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h2 className="mb-3.5 flex items-center gap-2 font-display text-[1.12rem]">
              <Activity size={15} className="text-brand" />
              Pulso agora
            </h2>
            <ul className="space-y-2.5">
              {pulso.map((p) => (
                <li
                  key={p.rotulo}
                  className="flex items-center gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--soft)] px-3.5 py-2.5"
                >
                  <p.icon size={14} className="text-brand shrink-0" />
                  <span className="text-[0.72rem] text-ink-3">{p.rotulo}</span>
                  <span className="ml-auto font-mono text-[0.78rem] text-ink">{p.valor}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5 animate-fade-up" style={{ animationDelay: "160ms" }}>
            <h2 className="mb-3 flex items-center gap-2 font-display text-[1.12rem]">
              <AlertTriangle size={15} className={alertas.length > 0 ? "text-warn" : "text-ok"} />
              Alertas
            </h2>
            {alertas.length === 0 ? (
              <p className="flex items-center gap-2 text-[0.78rem] text-ok">
                <CheckCircle2 size={13} />
                Nenhum alerta — operação redonda.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {alertas.map((a, i) => (
                  <li key={i} className="text-[0.76rem] leading-relaxed text-warn">
                    • {a}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <h2 className="mb-2.5 flex items-center gap-2 font-display text-[1.12rem]">
              <Smartphone size={15} className="text-brand" />
              Boletim diário
            </h2>
            <p className="text-[0.76rem] leading-relaxed text-ink-3">
              Todo dia às <span className="font-mono text-brand">07:45</span> a gestão recebe este
              mesmo pulso, resumido, direto no WhatsApp — os donos enxergam a operação{" "}
              <span className="text-ink-2">sem precisar centralizar nada</span>. Configurável na{" "}
              <a href="/regras" className="text-brand hover:brightness-110">
                Régua
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
