import { ArrowRight, Bot, CheckCircle2, Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { fmtHora, spToday } from "@/lib/dates";
import { spStartOfToday } from "@/lib/dates";
import { Chip, TituloPagina, Vazio } from "@/components/ui";
import RecepcaoChat from "@/components/recepcao-chat";

export const dynamic = "force-dynamic";

export default async function Recepcao() {
  const [chamados, tarefasRecepcao] = await Promise.all([
    db.mensagem.findMany({
      where: { origem: "RECEPCAO", criadaEm: { gte: spStartOfToday() } },
      orderBy: { criadaEm: "desc" },
      take: 6,
    }),
    db.tarefa.findMany({
      where: { data: spToday(), titulo: { startsWith: "Chamado da recepção" } },
      include: { responsavel: true },
      orderBy: { criadoEm: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div>
      <TituloPagina
        sobre="atendimento que não dorme"
        titulo={
          <>
            Recepção <span className="text-brand">IA</span> — cada cliente no setor certo
          </>
        }
      />

      <p className="-mt-4 mb-7 max-w-2xl text-[0.9rem] text-ink-2 animate-fade-up">
        Boleto, manutenção, desocupação, repasse: a recepção entende o pedido,{" "}
        <span className="text-ink">resolve o que dá na hora</span> e abre chamado para a pessoa
        certa — o administrativo só finaliza. Teste você mesmo 👇
      </p>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <RecepcaoChat />
        </div>

        <div className="space-y-3.5">
          <section className="card p-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h2 className="mb-3.5 flex items-center gap-2 font-display text-[1.12rem]">
              <Inbox size={15} className="text-brand" />O que acontece por trás
            </h2>
            {chamados.length === 0 && tarefasRecepcao.length === 0 ? (
              <Vazio
                titulo="Nenhum chamado ainda hoje."
                dica="Converse com a recepção ao lado — o chamado aparece aqui em tempo real."
              />
            ) : (
              <ul className="space-y-2.5">
                {tarefasRecepcao.map((t) => (
                  <li key={t.id} className="rounded-xl border border-[var(--hairline)] bg-[var(--soft)] px-3.5 py-3">
                    <div className="flex items-center gap-2 text-[0.7rem]">
                      <Chip tom="ok">tarefa criada</Chip>
                      <span className="text-ink-3">para {t.responsavel.nome}</span>
                      <span className="ml-auto font-mono text-ink-3">{fmtHora(t.criadoEm)}</span>
                    </div>
                    <div className="mt-1.5 text-[0.78rem] text-ink-2 leading-snug">{t.titulo}</div>
                  </li>
                ))}
                {chamados.map((m) => (
                  <li key={m.id} className="rounded-xl border border-[var(--hairline)] bg-[var(--soft)] px-3.5 py-3">
                    <div className="flex items-center gap-2 text-[0.7rem]">
                      <Chip tom="info">notificação interna</Chip>
                      <span className="text-ink-3">→ {m.paraNome}</span>
                      <span className="ml-auto font-mono text-ink-3">{fmtHora(m.criadaEm)}</span>
                    </div>
                    <div className="mt-1.5 whitespace-pre-wrap text-[0.72rem] text-ink-3 leading-snug line-clamp-3">
                      {m.conteudo}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5 animate-fade-up" style={{ animationDelay: "160ms" }}>
            <h2 className="mb-3.5 flex items-center gap-2 font-display text-[1.12rem]">
              <Bot size={15} className="text-brand" />
              Por que isso muda o jogo
            </h2>
            <ul className="space-y-2.5">
              {[
                "Ninguém mais transita entre setor errado — o cliente cai direto com quem resolve.",
                "O inquilino para de cobrar o corretor: status e chaves chegam sozinhos.",
                "O proprietário — seu cliente mais importante — nunca fica sem retorno.",
                "Cada conversa vira tarefa registrada: nada se perde no “me lembra depois”.",
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[0.8rem] leading-relaxed text-ink-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand/25 bg-brand-faint px-3.5 py-2.5 text-[0.72rem] text-brand">
              <ArrowRight size={13} />
              Na versão final: conectada ao número oficial da VeraBrokers, com IA generativa
              treinada nos processos de vocês.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
