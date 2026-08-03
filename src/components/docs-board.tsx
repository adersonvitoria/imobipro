"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock3, FileText, Send, Undo2 } from "lucide-react";
import { cobrarDocumentos, marcarDocumento } from "@/app/actions";
import { Chip } from "@/components/ui";

export type DocItem = {
  id: string;
  pessoa: string;
  tipoPessoa: string;
  rotulo: string;
  status: string;
  arquivo: string | null;
  contratoId: string | null;
  codigo: string;
  imovel: string;
};

const STATUS_UI: Record<string, { icon: typeof CheckCircle2; classe: string; rotulo: string }> = {
  PENDENTE: { icon: AlertTriangle, classe: "text-warn", rotulo: "pendente" },
  RECEBIDO: { icon: Clock3, classe: "text-info", rotulo: "recebido" },
  APROVADO: { icon: CheckCircle2, classe: "text-ok", rotulo: "aprovado" },
};

export default function DocsBoard({ itens }: { itens: DocItem[] }) {
  const [docs, setDocs] = useState(itens);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  const grupos = useMemo(() => {
    const m = new Map<string, DocItem[]>();
    for (const d of docs) {
      const chave = d.contratoId ?? "avulso";
      const lista = m.get(chave) ?? [];
      lista.push(d);
      m.set(chave, lista);
    }
    // contratos com pendência primeiro
    return Array.from(m.values()).sort(
      (a, b) =>
        b.filter((d) => d.status === "PENDENTE").length - a.filter((d) => d.status === "PENDENTE").length
    );
  }, [docs]);

  function mudarStatus(doc: DocItem, novo: "PENDENTE" | "RECEBIDO" | "APROVADO") {
    if (ocupado) return;
    setOcupado(doc.id);
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: novo } : d)));
    start(async () => {
      try {
        const r = await marcarDocumento(doc.id, novo);
        if (novo === "RECEBIDO") {
          toast.success(`📎 ${doc.rotulo} recebido`, {
            description: r.confirmada
              ? `${doc.pessoa} recebeu a confirmação no WhatsApp — com a lista do que ainda falta.`
              : "Documento anexado à pasta digital.",
          });
        } else if (novo === "APROVADO") {
          toast.success(`✅ ${doc.rotulo} aprovado`);
        } else {
          toast.info("Documento marcado como pendente de novo.");
        }
        router.refresh();
      } catch {
        toast.error("Não foi possível atualizar — tente de novo.");
        setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: doc.status } : d)));
      } finally {
        setOcupado(null);
      }
    });
  }

  function cobrar(pessoa: string) {
    if (ocupado) return;
    setOcupado(pessoa);
    start(async () => {
      try {
        const r = await cobrarDocumentos(pessoa);
        if (r.ok && r.criadas > 0) {
          toast.success(`📲 Cobrança enviada para ${pessoa}`, {
            description: "Lista completa do que falta, direto no WhatsApp — sem caçar ninguém no grupo.",
          });
        } else {
          toast.info("Cobrança de hoje já foi enviada (o sistema nunca duplica).");
        }
        router.refresh();
      } finally {
        setOcupado(null);
      }
    });
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {grupos.map((lista) => {
        const completos = lista.filter((d) => d.status !== "PENDENTE").length;
        const pct = Math.round((completos / lista.length) * 100);
        const pessoas = Array.from(new Set(lista.map((d) => d.pessoa)));

        return (
          <section key={lista[0].contratoId ?? "avulso"} className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[0.64rem] text-ink-3">{lista[0].codigo}</span>
              <span className={`font-mono text-[0.68rem] ${pct === 100 ? "text-ok" : "text-brand"}`}>
                {completos}/{lista.length} docs
              </span>
            </div>
            <div className="mt-1 text-[0.88rem] font-medium leading-snug">{lista[0].imovel}</div>

            {/* barra de progresso */}
            <div className="mt-2.5 h-1.5 rounded-full bg-[var(--soft-2)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct === 100 ? "bg-ok/70" : "bg-gradient-to-r from-[#ff77bd] to-[#ed1e8f]"}`}
                style={{ width: `${Math.max(6, pct)}%` }}
              />
            </div>

            <div className="mt-4 space-y-4">
              {pessoas.map((pessoa) => {
                const docsPessoa = lista.filter((d) => d.pessoa === pessoa);
                const pendentesPessoa = docsPessoa.filter((d) => d.status === "PENDENTE").length;
                return (
                  <div key={pessoa}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[0.78rem] font-medium">{pessoa}</span>
                      <Chip tom={docsPessoa[0].tipoPessoa === "PROPRIETARIO" ? "ouro" : "info"}>
                        {docsPessoa[0].tipoPessoa === "PROPRIETARIO" ? "Proprietário" : "Inquilino"}
                      </Chip>
                      {pendentesPessoa > 0 && (
                        <button
                          className="ml-auto flex items-center gap-1 text-[0.66rem] text-brand hover:brightness-110 disabled:opacity-50"
                          onClick={() => cobrar(pessoa)}
                          disabled={ocupado === pessoa}
                          title="Cobrar documentos pendentes agora"
                        >
                          <Send size={10} />
                          {ocupado === pessoa ? "enviando…" : "cobrar agora"}
                        </button>
                      )}
                    </div>
                    <ul className="space-y-1.5 border-l border-[var(--hairline)] pl-3 ml-1">
                      {docsPessoa.map((d) => {
                        const ui = STATUS_UI[d.status] ?? STATUS_UI.PENDENTE;
                        return (
                          <li key={d.id} className="flex items-center gap-2">
                            <ui.icon size={13} className={`shrink-0 ${ui.classe}`} />
                            <div className="min-w-0 flex-1">
                              <span className="text-[0.75rem] text-ink-2">{d.rotulo}</span>
                              {d.arquivo && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 font-mono text-[0.6rem] text-ink-3">
                                  <FileText size={9} />
                                  {d.arquivo}
                                </span>
                              )}
                            </div>
                            <span className="flex shrink-0 items-center gap-1">
                              {d.status === "PENDENTE" && (
                                <button
                                  className="rounded-md border border-[var(--hairline)] px-1.5 py-0.5 text-[0.6rem] text-ink-2 hover:border-brand/50 hover:text-brand transition-colors"
                                  onClick={() => mudarStatus(d, "RECEBIDO")}
                                  disabled={ocupado === d.id}
                                >
                                  recebi
                                </button>
                              )}
                              {d.status === "RECEBIDO" && (
                                <button
                                  className="rounded-md border border-ok/40 px-1.5 py-0.5 text-[0.6rem] text-ok hover:bg-ok/10 transition-colors"
                                  onClick={() => mudarStatus(d, "APROVADO")}
                                  disabled={ocupado === d.id}
                                >
                                  aprovar
                                </button>
                              )}
                              {d.status === "APROVADO" && (
                                <button
                                  className="text-ink-3 hover:text-warn transition-colors"
                                  onClick={() => mudarStatus(d, "PENDENTE")}
                                  disabled={ocupado === d.id}
                                  title="Reabrir pendência"
                                >
                                  <Undo2 size={11} />
                                </button>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
