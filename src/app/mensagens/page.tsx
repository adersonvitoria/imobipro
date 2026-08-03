import Link from "next/link";
import { MessageCircle, MessagesSquare } from "lucide-react";
import { db } from "@/lib/db";
import { fmtHora, fmtLongo } from "@/lib/dates";
import { linkWa } from "@/lib/wa-link";
import { Chip, TituloPagina, Vazio } from "@/components/ui";
import { WaBolha } from "@/components/wa";

export const dynamic = "force-dynamic";

const FILTROS = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "INQUILINO", rotulo: "Inquilinos" },
  { chave: "PROPRIETARIO", rotulo: "Proprietários" },
  { chave: "EQUIPE", rotulo: "Equipe" },
] as const;

const TOM: Record<string, { tom: "info" | "ouro" | "ok"; rotulo: string }> = {
  INQUILINO: { tom: "info", rotulo: "Inquilino" },
  PROPRIETARIO: { tom: "ouro", rotulo: "Proprietário" },
  EQUIPE: { tom: "ok", rotulo: "Equipe" },
};

export default async function Mensagens({
  searchParams,
}: {
  searchParams: Promise<{ para?: string }>;
}) {
  const { para } = await searchParams;
  const filtro = FILTROS.some((f) => f.chave === para) && para !== "todas" ? para : undefined;

  const mensagens = await db.mensagem.findMany({
    where: filtro ? { paraTipo: filtro } : undefined,
    orderBy: { criadaEm: "desc" },
    take: 150,
  });

  // agrupa por dia (fuso SP)
  const fmtSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const grupos = new Map<string, typeof mensagens>();
  for (const m of mensagens) {
    const dia = fmtSP.format(m.criadaEm);
    const lista = grupos.get(dia) ?? [];
    lista.push(m);
    grupos.set(dia, lista);
  }

  return (
    <div>
      <TituloPagina
        sobre="histórico completo"
        titulo={
          <>
            Tudo que saiu <span className="text-brand">sem ninguém digitar</span>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2 animate-fade-up">
        {FILTROS.map((f) => {
          const ativo = (filtro ?? "todas") === f.chave;
          return (
            <Link
              key={f.chave}
              href={f.chave === "todas" ? "/mensagens" : `/mensagens?para=${f.chave}`}
              className={`rounded-full border px-3.5 py-1.5 text-[0.76rem] transition-colors ${
                ativo
                  ? "border-brand/50 bg-brand-faint text-brand"
                  : "border-[var(--hairline)] text-ink-3 hover:text-ink-2"
              }`}
            >
              {f.rotulo}
            </Link>
          );
        })}
      </div>

      {mensagens.length === 0 ? (
        <Vazio titulo="Nenhuma mensagem neste filtro ainda." />
      ) : (
        <div className="space-y-8 animate-fade-up" style={{ animationDelay: "80ms" }}>
          {Array.from(grupos.entries()).map(([dia, lista]) => (
            <section key={dia}>
              <div className="mb-3.5 flex items-center gap-3">
                <h2 className="font-display text-[1.02rem] capitalize">{fmtLongo(dia)}</h2>
                <span className="font-mono text-[0.64rem] text-ink-3">{lista.length} disparos</span>
                <span className="h-px flex-1 bg-[var(--hairline)]" />
              </div>
              <ul className="space-y-4">
                {lista.map((m) => {
                  const t = TOM[m.paraTipo] ?? TOM.INQUILINO;
                  return (
                    <li key={m.id} className="card p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.72rem]">
                        <span className="font-medium text-ink">{m.paraNome}</span>
                        <span className="font-mono text-ink-3">{m.paraZap}</span>
                        <Chip tom={t.tom}>{t.rotulo}</Chip>
                        <span className="text-ink-3">{m.regraNome}</span>
                        <span className="ml-auto flex items-center gap-2.5">
                          <Chip tom={m.status === "ENVIADA" ? "ok" : m.status === "ERRO" ? "aviso" : "neutro"}>
                            {m.status === "ENVIADA" ? "enviada" : m.status === "ERRO" ? "erro" : "simulada"}
                          </Chip>
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
                      <div className="flex justify-end pl-4 sm:pl-14">
                        <WaBolha texto={m.conteudo} hora={m.criadaEm} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 flex items-center gap-2 text-[0.7rem] text-ink-3">
        <MessagesSquare size={12} />
        Em produção, cada mensagem sai pelo WhatsApp oficial da imobiliária (Evolution API / Meta Cloud).
      </p>
    </div>
  );
}
