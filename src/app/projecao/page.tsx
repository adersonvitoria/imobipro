import { Bot, Clock3, FileStack, Sparkles, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { TituloPagina } from "@/components/ui";

const CENARIOS = [
  {
    emoji: "🔴",
    nome: "Pior cenário",
    aumento: "+R$ 12 mil",
    pct: "+12%",
    depois: 112,
    recorrente12m: "+R$ 14,4 mil/mês",
    conta:
      "Mês fraco: R$ 10 mil por corretor. Recuperando só os ~30% perdidos com pós-venda, cada corretor loca +R$ 3 mil — × 4 corretores. É a conta mínima que o próprio comercial fez no áudio.",
    destaque: false,
  },
  {
    emoji: "🟡",
    nome: "Cenário médio",
    aumento: "+R$ 30 mil",
    pct: "+30%",
    depois: 130,
    recorrente12m: "+R$ 36 mil/mês",
    conta:
      "Sobre a média real de R$ 100 mil/mês da equipe: 30% do tempo devolvido ao comercial vira +R$ 30 mil em novas locações, todos os meses.",
    destaque: false,
  },
  {
    emoji: "🟢",
    nome: "Melhor cenário",
    aumento: "+R$ 50 mil",
    pct: "+50%",
    depois: 150,
    recorrente12m: "+R$ 60 mil/mês",
    conta:
      "Pós-venda automático + fim da burocracia da ficha em 3 vias (~50% de capacidade a mais). O corretor estima ir de R$ 20 mil para R$ 40 mil pessoais: “não tem dúvida”.",
    destaque: true,
  },
];

const BASE = [
  { icon: TrendingUp, rotulo: "Locação nova hoje", valor: "R$ 100 mil/mês" },
  { icon: Users, rotulo: "Corretores", valor: "4 (top 2 fecham ~R$ 30 mil cada)" },
  { icon: Bot, rotulo: "Tempo em pós-venda manual", valor: "~30% do mês" },
  { icon: FileStack, rotulo: "Burocracia (ficha em 3 vias)", valor: "+20% · até 3h/dia" },
];

export default function Projecao() {
  return (
    <div className="mx-auto max-w-5xl">
      <TituloPagina
        sobre="a conta da reunião"
        titulo={
          <>
            Quanto a VeraBrokers pode <span className="text-brand">faturar a mais</span>
          </>
        }
      />

      <p className="-mt-4 mb-7 max-w-3xl text-[0.9rem] text-ink-2 animate-fade-up">
        Projeção construída <span className="text-ink">apenas com os números citados pela própria
        equipe</span>: quanto volta pro caixa quando o robô assume o pós-venda e a ficha vira um
        cadastro único.
      </p>

      {/* Base de cálculo */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        {BASE.map((b) => (
          <div key={b.rotulo} className="card px-4 py-3.5">
            <div className="flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.12em] text-ink-3">
              <b.icon size={13} className="text-brand" />
              {b.rotulo}
            </div>
            <div className="mt-1.5 text-[0.92rem] font-medium leading-snug">{b.valor}</div>
          </div>
        ))}
      </section>

      {/* Cenários */}
      <section className="mt-4 grid gap-3.5 lg:grid-cols-3 animate-fade-up" style={{ animationDelay: "120ms" }}>
        {CENARIOS.map((c) => (
          <div
            key={c.nome}
            className={`card p-6 ${c.destaque ? "border-brand/40 shadow-glow" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[0.78rem] font-medium text-ink-2">
                {c.emoji} {c.nome}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[0.66rem] ${
                  c.destaque ? "border-brand/50 bg-brand-faint text-brand" : "border-[var(--hairline)] text-ink-3"
                }`}
              >
                {c.pct}
              </span>
            </div>
            <div className={`mt-3 font-display text-[2.4rem] leading-none tracking-tight ${c.destaque ? "text-brand" : ""}`}>
              {c.aumento}
            </div>
            <div className="mt-1 text-[0.7rem] text-ink-3">de locação nova, por mês</div>
            <p className="mt-4 text-[0.76rem] leading-relaxed text-ink-2">{c.conta}</p>
            <div className="mt-4 rounded-xl border border-[var(--hairline)] bg-[var(--soft)] px-3 py-2.5">
              <div className="text-[0.6rem] uppercase tracking-[0.12em] text-ink-3">
                Taxa de adm. recorrente nova após 12 meses
              </div>
              <div className={`mt-0.5 font-mono text-[0.9rem] ${c.destaque ? "text-brand" : "text-ink"}`}>
                {c.recorrente12m}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Comparativo visual */}
      <section className="card mt-4 p-6 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <h2 className="mb-4 flex items-center gap-2 font-display text-[1.15rem]">
          <TrendingUp size={15} className="text-brand" />
          Locação mensal: hoje × com a plataforma
        </h2>
        <div className="space-y-3">
          {[{ nome: "Hoje", valor: 100, cor: "var(--soft-2)", texto: "R$ 100 mil" }, ...CENARIOS.map((c) => ({
            nome: c.nome,
            valor: c.depois,
            cor: c.destaque
              ? "linear-gradient(90deg, #ff77bd, #ed1e8f)"
              : "linear-gradient(90deg, rgba(237,30,143,0.55), rgba(237,30,143,0.75))",
            texto: `R$ ${c.depois} mil`,
          }))].map((b) => (
            <div key={b.nome} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-right text-[0.72rem] text-ink-3">{b.nome}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-lg bg-[var(--soft)]">
                <div
                  className="flex h-full items-center justify-end rounded-lg pr-2"
                  style={{ width: `${(b.valor / 160) * 100}%`, background: b.cor }}
                >
                  <span className="font-mono text-[0.66rem] text-white mix-blend-difference">{b.texto}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-[0.68rem] text-ink-3">
          <Clock3 size={11} />
          Estimativas com os números ditos pela equipe (sem considerar churn). Com a plataforma no
          ar, o Analista passa a medir o realizado — pergunte{" "}
          <Link href="/analista" className="text-brand hover:brightness-110">
            “projeção de faturamento” no Analista
          </Link>{" "}
          para ver a memória de cálculo.
        </p>
      </section>

      <p className="mt-6 flex items-center gap-2 text-[0.7rem] text-ink-3 animate-fade-up" style={{ animationDelay: "220ms" }}>
        <Sparkles size={12} className="text-brand" />
        Resumo pra reunião: no pior mês a plataforma se paga sozinha; no cenário do próprio
        corretor, a VeraBrokers loca R$ 150 mil/mês e ainda soma até R$ 60 mil/mês recorrentes em
        taxa de administração ao fim de 1 ano.
      </p>
    </div>
  );
}
