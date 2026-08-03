import {
  CalendarClock,
  ClipboardCheck,
  FileSignature,
  KeyRound,
  MessageCircle,
  Radio,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { db } from "@/lib/db";
import { addDays, fmtCurto, fmtHora, fmtLongo, primeiroNome, saudacao, spStartOfToday, spToday } from "@/lib/dates";
import { modoEnvio } from "@/lib/whatsapp";
import { linkWa } from "@/lib/wa-link";
import { Avatar, Chip, Kpi, TituloPagina, Vazio } from "@/components/ui";
import { WaBolha } from "@/components/wa";
import ChartDisparos from "@/components/chart";
import RunButton from "@/components/run-button";
import ResetButton from "@/components/reset-button";

export const dynamic = "force-dynamic";

function minutosLegivel(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${String(m).padStart(2, "0")}` : `${h}h`;
}

const TOM_PARA: Record<string, { tom: "info" | "ouro" | "ok"; rotulo: string }> = {
  INQUILINO: { tom: "info", rotulo: "Inquilino" },
  PROPRIETARIO: { tom: "ouro", rotulo: "Proprietário" },
  EQUIPE: { tom: "ok", rotulo: "Equipe" },
};

export default async function Hoje() {
  const hoje = spToday();
  const amanha = addDays(hoje, 1);
  const inicioHoje = spStartOfToday();
  const inicio14 = new Date(`${addDays(hoje, -13)}T00:00:00-03:00`);

  const [msgsHoje, feed, entregas, tarefasHoje, naEsteira, ativos, hist] = await Promise.all([
    db.mensagem.count({ where: { criadaEm: { gte: inicioHoje } } }),
    db.mensagem.findMany({
      where: { criadaEm: { gte: inicioHoje } },
      orderBy: { criadaEm: "desc" },
      take: 40,
    }),
    db.contrato.findMany({
      where: { etapa: "CHAVES_PRONTAS", entregaData: { in: [hoje, amanha] } },
      include: { respEntrega: true },
      orderBy: [{ entregaData: "asc" }, { entregaHora: "asc" }],
    }),
    db.tarefa.findMany({
      where: { data: hoje },
      include: { responsavel: true },
      orderBy: { hora: "asc" },
    }),
    db.contrato.count({
      where: { etapa: { in: ["FICHA_APROVADA", "ASSINATURA", "CONTRATO_ASSINADO", "VISTORIA", "CHAVES_PRONTAS"] } },
    }),
    db.contrato.count({ where: { etapa: "ATIVO" } }),
    db.mensagem.findMany({ where: { criadaEm: { gte: inicio14 } }, select: { criadaEm: true } }),
  ]);

  // série do gráfico — 14 dias no fuso de SP
  const fmtSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const porDia = new Map<string, number>();
  for (const m of hist) {
    const d = fmtSP.format(m.criadaEm);
    porDia.set(d, (porDia.get(d) ?? 0) + 1);
  }
  const serie = Array.from({ length: 14 }, (_, i) => {
    const dia = addDays(hoje, i - 13);
    return { dia, rotulo: fmtCurto(dia), total: porDia.get(dia) ?? 0 };
  });

  const entregasHoje = entregas.filter((e) => e.entregaData === hoje);
  const entregasAmanha = entregas.filter((e) => e.entregaData === amanha);

  const porMembro = new Map<string, typeof tarefasHoje>();
  for (const t of tarefasHoje) {
    const lista = porMembro.get(t.responsavelId) ?? [];
    lista.push(t);
    porMembro.set(t.responsavelId, lista);
  }

  const simulado = modoEnvio() === "SIMULADO";

  return (
    <div className="flex flex-col lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
      <TituloPagina
        compacto
        sobre={fmtLongo(hoje)}
        titulo={
          <>
            {saudacao()}, <span className="text-brand">VeraBrokers</span>.
          </>
        }
      >
        {simulado && <Chip tom="neutro">modo demonstração</Chip>}
        <ResetButton />
        <RunButton />
      </TituloPagina>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <Kpi rotulo="Disparos hoje" valor={msgsHoje} detalhe="mensagens automáticas" icon={Radio} destaque />
        <Kpi
          rotulo="Entregas de chave"
          valor={
            <>
              {entregasHoje.length}
              <span className="text-[1.05rem] text-ink-3"> hoje · {entregasAmanha.length} amanhã</span>
            </>
          }
          detalhe="cada inquilino já sabe hora e local"
          icon={KeyRound}
        />
        <Kpi rotulo="Na esteira" valor={naEsteira} detalhe={`${ativos} contratos ativos`} icon={FileSignature} />
        <Kpi
          rotulo="Tempo devolvido"
          valor={minutosLegivel(msgsHoje * 4)}
          detalhe="≈ 4 min por mensagem manual"
          icon={Timer}
        />
      </div>

      {/* Grade principal — preenche o restante da tela no desktop */}
      <div className="mt-3 grid flex-1 min-h-0 gap-3 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)_minmax(0,14.5rem)]">
        {/* Feed de disparos */}
        <section
          className="card flex min-h-0 flex-col p-4 animate-fade-up lg:col-span-6"
          style={{ animationDelay: "120ms" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-[1.05rem]">
              <Zap size={14} className="text-brand" />
              Disparos de hoje
            </h2>
            <span className="font-mono text-[0.66rem] text-ink-3">{msgsHoje} mensagens</span>
          </div>

          {feed.length === 0 ? (
            <Vazio
              titulo="Nenhum disparo ainda hoje."
              dica="Clique em “Rodar disparos de hoje” e veja a mágica acontecer."
            />
          ) : (
            <ul className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-2 max-h-[480px] lg:max-h-none">
              {feed.map((m) => {
                const tipo = TOM_PARA[m.paraTipo] ?? TOM_PARA.INQUILINO;
                return (
                  <li key={m.id}>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[0.72rem]">
                      <span className="font-medium text-ink">{m.paraNome}</span>
                      <Chip tom={tipo.tom}>{tipo.rotulo}</Chip>
                      <span className="text-ink-3">{m.regraNome}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <span className="font-mono text-ink-3">{fmtHora(m.criadaEm)}</span>
                        <a
                          href={linkWa(m.paraZap, m.conteudo)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink-3 hover:text-brand transition-colors"
                          title="Abrir no WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </a>
                      </span>
                    </div>
                    <div className="flex justify-end pl-6 sm:pl-14">
                      <WaBolha texto={m.conteudo} hora={m.criadaEm} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Entregas de chaves */}
        <section
          className="card flex min-h-0 flex-col p-4 animate-fade-up lg:col-span-3"
          style={{ animationDelay: "160ms" }}
        >
          <h2 className="mb-3 flex items-center gap-2 font-display text-[1.05rem]">
            <KeyRound size={14} className="text-brand" />
            Entregas de chaves
          </h2>
          {entregas.length === 0 ? (
            <Vazio titulo="Sem entregas programadas." />
          ) : (
            <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 max-h-[420px] lg:max-h-none">
              {entregas.map((e) => (
                <li key={e.id} className="rounded-xl border border-[var(--hairline)] bg-[var(--soft)] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[0.78rem] text-brand">{e.entregaHora}</span>
                    <Chip tom={e.entregaData === hoje ? "ouro" : "neutro"}>
                      {e.entregaData === hoje ? "hoje" : "amanhã"}
                    </Chip>
                    <span className="ml-auto font-mono text-[0.6rem] text-ink-3">{e.codigo}</span>
                  </div>
                  <div className="mt-1 text-[0.84rem] font-medium">{e.inquilino}</div>
                  <div className="text-[0.7rem] text-ink-3">{e.imovel}</div>
                  {e.respEntrega && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[0.68rem] text-ink-2">
                      <Avatar nome={e.respEntrega.nome} cor={e.respEntrega.cor} tamanho={17} />
                      entrega com {primeiroNome(e.respEntrega.nome)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Agenda da equipe */}
        <section
          className="card flex min-h-0 flex-col p-4 animate-fade-up lg:col-span-3"
          style={{ animationDelay: "200ms" }}
        >
          <h2 className="mb-3 flex items-center gap-2 font-display text-[1.05rem]">
            <Users size={14} className="text-brand" />
            Agenda da equipe
          </h2>
          {porMembro.size === 0 ? (
            <Vazio titulo="Sem tarefas para hoje." />
          ) : (
            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 max-h-[420px] lg:max-h-none">
              {Array.from(porMembro.values()).map((lista) => {
                const membro = lista[0].responsavel;
                const feitas = lista.filter((t) => t.concluida).length;
                return (
                  <li key={membro.id}>
                    <div className="mb-1 flex items-center gap-2">
                      <Avatar nome={membro.nome} cor={membro.cor} tamanho={20} />
                      <span className="text-[0.78rem] font-medium">{primeiroNome(membro.nome)}</span>
                      <span className="ml-auto font-mono text-[0.6rem] text-ink-3">
                        {feitas}/{lista.length}
                      </span>
                    </div>
                    <ul className="ml-2.5 space-y-0.5 border-l border-[var(--hairline)] pl-3">
                      {lista.slice(0, 3).map((t) => (
                        <li
                          key={t.id}
                          className={`text-[0.7rem] leading-snug ${
                            t.concluida ? "text-ink-3 line-through" : "text-ink-2"
                          }`}
                        >
                          {t.hora && <span className="font-mono text-ink-3">{t.hora} · </span>}
                          {t.titulo}
                        </li>
                      ))}
                      {lista.length > 3 && (
                        <li className="text-[0.64rem] text-ink-3">+ {lista.length - 3} tarefas</li>
                      )}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Gráfico */}
        <section
          className="card flex min-h-0 flex-col p-4 animate-fade-up lg:col-span-8"
          style={{ animationDelay: "240ms" }}
        >
          <h2 className="mb-1.5 flex items-center gap-2 font-display text-[1.05rem]">
            <CalendarClock size={14} className="text-brand" />
            Disparos automáticos — últimos 14 dias
          </h2>
          <div className="min-h-0 flex-1">
            <ChartDisparos dados={serie} />
          </div>
        </section>

        {/* Como funciona */}
        <section
          className="card min-h-0 overflow-y-auto p-4 animate-fade-up lg:col-span-4"
          style={{ animationDelay: "280ms" }}
        >
          <h2 className="mb-2.5 font-display text-[1.05rem]">Como funciona</h2>
          <ol className="space-y-2">
            {[
              { icon: FileSignature, titulo: "O contrato anda no quadro — cada etapa dispara a mensagem certa" },
              { icon: Zap, titulo: "Todo dia às 8h o robô roda — entregas, boletos, repasses e alertas" },
              { icon: ClipboardCheck, titulo: "A equipe recebe a agenda — ninguém precisa lembrar ninguém" },
            ].map((s, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-brand/30 bg-brand-faint text-brand">
                  <s.icon size={13} />
                </span>
                <div className="text-[0.73rem] leading-snug text-ink-2">{s.titulo}</div>
              </li>
            ))}
          </ol>
          <div className="mt-3 rounded-xl border border-brand/25 bg-brand-faint px-3 py-2.5">
            <div className="mb-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-brand/80">
              Projeção de faturamento com a plataforma
            </div>
            <div className="space-y-1 text-[0.7rem]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-3">🔴 Pior cenário</span>
                <span className="font-mono font-medium text-ink">+R$ 12 mil/mês</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-3">🟡 Cenário médio</span>
                <span className="font-mono font-medium text-ink">+R$ 30 mil/mês</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-3">🟢 Melhor cenário</span>
                <span className="font-mono font-semibold text-brand">+R$ 50 mil/mês</span>
              </div>
            </div>
            <p className="mt-1.5 text-[0.62rem] leading-snug text-ink-3">
              Base: R$ 100 mil/mês locados pela equipe · pós-venda ~30% + burocracia ~20% do tempo.
              Detalhes no <span className="text-brand">Analista</span>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
