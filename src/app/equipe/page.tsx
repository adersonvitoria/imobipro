import { MessageCircle, Smartphone } from "lucide-react";
import { db } from "@/lib/db";
import { fmtLongo, primeiroNome, spToday } from "@/lib/dates";
import { render } from "@/lib/templates";
import { linkWa } from "@/lib/wa-link";
import { Avatar, Chip, TituloPagina, Vazio } from "@/components/ui";
import { WaBolha } from "@/components/wa";
import TarefaToggle from "@/components/tarefa-toggle";

export const dynamic = "force-dynamic";

const PAPEL: Record<string, string> = {
  CORRETOR: "Corretor",
  ADMINISTRATIVO: "Administrativo",
  FINANCEIRO: "Financeiro",
  VISTORIA: "Vistorias & manutenção",
  GESTAO: "Gestão",
};

export default async function Equipe() {
  const hoje = spToday();
  const [membros, tarefas, regraAgenda, cfg] = await Promise.all([
    db.membro.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.tarefa.findMany({ where: { data: hoje }, orderBy: { hora: "asc" } }),
    db.regra.findUnique({ where: { tipo: "AGENDA_EQUIPE" } }),
    db.config.findFirst(),
  ]);

  const porMembro = new Map<string, typeof tarefas>();
  for (const t of tarefas) {
    const lista = porMembro.get(t.responsavelId) ?? [];
    lista.push(t);
    porMembro.set(t.responsavelId, lista);
  }

  return (
    <div>
      <TituloPagina
        sobre="quem faz o quê — sem ninguém cobrar"
        titulo={
          <>
            A equipe <span className="text-brand">já acordou sabendo</span>
          </>
        }
      />

      <p className="-mt-4 mb-7 max-w-2xl text-[0.9rem] text-ink-2 animate-fade-up">
        Todo dia às <span className="font-mono text-brand">07:30</span> cada pessoa recebe no
        WhatsApp a própria agenda. Chega de “quem é que entrega as chaves hoje?”.
      </p>

      <div className="grid md:grid-cols-2 gap-3.5">
        {membros.map((m, i) => {
          const lista = porMembro.get(m.id) ?? [];
          const pendentes = lista.filter((t) => !t.concluida);
          const digest =
            regraAgenda &&
            render(regraAgenda.template, {
              nome: primeiroNome(m.nome),
              data: fmtLongo(hoje),
              lista:
                pendentes.length > 0
                  ? pendentes.map((t) => `• ${t.hora ? `${t.hora} — ` : ""}${t.titulo}`).join("\n")
                  : "• Dia livre de tarefas programadas 🙌",
              imobiliaria: cfg?.imobiliaria ?? "VeraBrokers",
            });

          return (
            <section
              key={m.id}
              className="card p-5 animate-fade-up"
              style={{ animationDelay: `${60 + i * 40}ms` }}
            >
              <div className="flex items-center gap-3">
                <Avatar nome={m.nome} cor={m.cor} tamanho={40} />
                <div>
                  <div className="text-[0.95rem] font-medium">{m.nome}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Chip tom="neutro">{PAPEL[m.papel] ?? m.papel}</Chip>
                    <span className="font-mono text-[0.66rem] text-ink-3">{m.whatsapp}</span>
                  </div>
                </div>
                <a
                  href={linkWa(m.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-ink-3 hover:text-brand transition-colors"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle size={15} />
                </a>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[0.66rem] uppercase tracking-[0.14em] text-ink-3">
                  <span>Hoje</span>
                  <span className="font-mono normal-case tracking-normal">
                    {lista.filter((t) => t.concluida).length}/{lista.length} concluídas
                  </span>
                </div>
                {lista.length === 0 ? (
                  <Vazio titulo="Sem tarefas hoje." />
                ) : (
                  <div className="-mx-2">
                    {lista.map((t) => (
                      <TarefaToggle
                        key={t.id}
                        id={t.id}
                        titulo={t.titulo}
                        hora={t.hora}
                        concluida={t.concluida}
                      />
                    ))}
                  </div>
                )}
              </div>

              {digest && (
                <details className="mt-3.5 group">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-[0.7rem] text-ink-3 hover:text-brand transition-colors list-none">
                    <Smartphone size={11} />
                    ver a mensagem que {primeiroNome(m.nome)} recebe às 07:30
                  </summary>
                  <div className="mt-3 flex justify-end pl-8">
                    <WaBolha texto={digest} hora="07:30" />
                  </div>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
