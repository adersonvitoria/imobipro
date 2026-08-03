"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  CalendarDays,
  ClipboardList,
  Home,
  KeyRound,
  LogOut,
  PenLine,
  Plus,
  Send,
  X,
} from "lucide-react";
import { avancarEtapa, criarContrato, iniciarDesocupacao } from "@/app/actions";
import { Avatar, Chip } from "@/components/ui";
import { fmtCurto } from "@/lib/dates";

export type CartaoContrato = {
  id: string;
  codigo: string;
  etapa: string;
  imovel: string;
  bairro: string;
  valor: number;
  inquilino: string;
  proprietario: string;
  entregaData: string | null;
  entregaHora: string | null;
  vistoriaData: string | null;
  vistoriaHora: string | null;
  corretor: { nome: string; cor: string } | null;
  respEntrega: { nome: string } | null;
};

type MembroOpcao = { id: string; nome: string };

const COLUNAS: { etapa: string; titulo: string }[] = [
  { etapa: "FICHA_APROVADA", titulo: "Ficha aprovada" },
  { etapa: "ASSINATURA", titulo: "Assinatura" },
  { etapa: "CONTRATO_ASSINADO", titulo: "Contrato assinado" },
  { etapa: "VISTORIA", titulo: "Vistoria" },
  { etapa: "CHAVES_PRONTAS", titulo: "Chaves prontas" },
  { etapa: "ATIVO", titulo: "Ativos" },
  { etapa: "DESOCUPACAO", titulo: "Desocupação" },
];

const ACAO: Record<string, { rotulo: string; icon: typeof PenLine } | null> = {
  FICHA_APROVADA: { rotulo: "Enviar p/ assinatura", icon: Send },
  ASSINATURA: { rotulo: "Confirmar assinaturas", icon: PenLine },
  CONTRATO_ASSINADO: { rotulo: "Agendar vistoria", icon: ClipboardList },
  VISTORIA: { rotulo: "Chaves prontas", icon: KeyRound },
  CHAVES_PRONTAS: { rotulo: "Confirmar entrega", icon: Home },
  ATIVO: null,
  DESOCUPACAO: null,
};

const ORDEM_ETAPA: Record<string, string> = {
  FICHA_APROVADA: "ASSINATURA",
  ASSINATURA: "CONTRATO_ASSINADO",
  CONTRATO_ASSINADO: "VISTORIA",
  VISTORIA: "CHAVES_PRONTAS",
  CHAVES_PRONTAS: "ATIVO",
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

export default function Kanban({
  contratos: iniciais,
  corretores,
}: {
  contratos: CartaoContrato[];
  corretores: MembroOpcao[];
}) {
  const [contratos, setContratos] = useState(iniciais);
  const [modal, setModal] = useState(false);
  const [, start] = useTransition();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const router = useRouter();

  // dados do servidor são a fonte da verdade após cada refresh
  useEffect(() => {
    setContratos(iniciais);
  }, [iniciais]);

  const porColuna = useMemo(() => {
    const m = new Map<string, CartaoContrato[]>();
    for (const col of COLUNAS) m.set(col.etapa, []);
    for (const c of contratos) m.get(c.etapa)?.push(c);
    return m;
  }, [contratos]);

  function avancar(c: CartaoContrato) {
    const nova = ORDEM_ETAPA[c.etapa];
    if (!nova || ocupado) return;
    setOcupado(c.id);
    setContratos((prev) => prev.map((x) => (x.id === c.id ? { ...x, etapa: nova } : x)));
    start(async () => {
      try {
        const r = await avancarEtapa(c.id);
        if (r.disparadas.length > 0) {
          toast.success(`📲 WhatsApp automático disparado`, {
            description: `${r.disparadas.join(" e ")} ${
              r.disparadas.length > 1 ? "receberam" : "recebeu"
            } a mensagem da etapa — sem ninguém digitar.`,
          });
        } else {
          toast.success("Etapa avançada.");
        }
        router.refresh();
      } catch {
        toast.error("Não foi possível avançar — tente de novo.");
        setContratos((prev) => prev.map((x) => (x.id === c.id ? { ...x, etapa: c.etapa } : x)));
      } finally {
        setOcupado(null);
      }
    });
  }

  function desocupar(c: CartaoContrato) {
    if (ocupado) return;
    setOcupado(c.id);
    setContratos((prev) => prev.map((x) => (x.id === c.id ? { ...x, etapa: "DESOCUPACAO" } : x)));
    start(async () => {
      try {
        const r = await iniciarDesocupacao(c.id);
        toast.success("Desocupação iniciada", {
          description:
            r.disparadas.length > 0
              ? `${r.disparadas.join(", ")} já foi avisado no WhatsApp — e a equipe de desocupação recebeu a tarefa.`
              : "Processo registrado.",
        });
        router.refresh();
      } catch {
        toast.error("Não foi possível iniciar a desocupação.");
        setContratos((prev) => prev.map((x) => (x.id === c.id ? { ...x, etapa: "ATIVO" } : x)));
      } finally {
        setOcupado(null);
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[0.8rem] text-ink-3">
          Avançou a etapa aqui → <span className="text-ink-2">o cliente recebe WhatsApp na hora</span>. Sem
          planilha, sem lembrete, sem cobrança interna.
        </p>
        <button className="btn-brand shrink-0" onClick={() => setModal(true)}>
          <Plus size={15} strokeWidth={2.5} />
          Novo contrato
        </button>
      </div>

      <div className="flex gap-3.5 overflow-x-auto pb-4 -mx-1 px-1">
        {COLUNAS.map((col) => {
          const cartoes = porColuna.get(col.etapa) ?? [];
          return (
            <div key={col.etapa} className="w-[272px] shrink-0">
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <span className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-ink-2">
                  {col.titulo}
                </span>
                <span className="font-mono text-[0.62rem] text-ink-3">{cartoes.length}</span>
                <span className="ml-auto h-px flex-1 max-w-[60px] bg-[var(--hairline)]" />
              </div>

              <div className="space-y-2.5 min-h-[120px]">
                {cartoes.map((c) => {
                    const acao = ACAO[c.etapa];
                    return (
                      <motion.div
                        key={c.id}
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="card p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[0.62rem] text-ink-3">{c.codigo}</span>
                          <span className="font-mono text-[0.72rem] text-brand">{brl(c.valor)}</span>
                        </div>
                        <div className="mt-1.5 text-[0.9rem] font-medium leading-tight">{c.inquilino}</div>
                        <div className="mt-0.5 text-[0.72rem] text-ink-3 leading-snug">
                          {c.imovel} · {c.bairro}
                        </div>

                        {c.etapa === "CHAVES_PRONTAS" && c.entregaData && (
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-brand/25 bg-brand-faint px-2.5 py-1.5 text-[0.7rem] text-brand">
                            <KeyRound size={11} />
                            entrega {fmtCurto(c.entregaData)} às {c.entregaHora}
                            {c.respEntrega && ` · ${c.respEntrega.nome.split(" ")[0]}`}
                          </div>
                        )}
                        {c.etapa === "VISTORIA" && c.vistoriaData && (
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-info/25 bg-info/10 px-2.5 py-1.5 text-[0.7rem] text-info">
                            <CalendarDays size={11} />
                            vistoria {fmtCurto(c.vistoriaData)} às {c.vistoriaHora}
                          </div>
                        )}
                        {c.etapa === "DESOCUPACAO" && (
                          <div className="mt-2.5 text-[0.7rem] text-ink-3">
                            proprietário <span className="text-ink-2">{c.proprietario}</span> sendo
                            atualizado a cada etapa
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          {c.corretor && (
                            <span title={`Corretor: ${c.corretor.nome}`}>
                              <Avatar nome={c.corretor.nome} cor={c.corretor.cor} tamanho={22} />
                            </span>
                          )}
                          {acao ? (
                            <button
                              className="btn-ghost flex-1 justify-center !py-1.5 !text-[0.72rem] hover:!border-brand/50 hover:!text-brand"
                              disabled={ocupado === c.id}
                              onClick={() => avancar(c)}
                            >
                              <acao.icon size={12} />
                              {ocupado === c.id ? "Disparando…" : acao.rotulo}
                            </button>
                          ) : c.etapa === "ATIVO" ? (
                            <button
                              className="btn-ghost flex-1 justify-center !py-1.5 !text-[0.7rem]"
                              disabled={ocupado === c.id}
                              onClick={() => desocupar(c)}
                            >
                              <LogOut size={12} />
                              Iniciar desocupação
                            </button>
                          ) : (
                            <span className="flex-1 text-center">
                              <Chip tom="ouro">acompanhando</Chip>
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {modal && <ModalNovoContrato corretores={corretores} fechar={() => setModal(false)} />}
    </>
  );
}

function ModalNovoContrato({ corretores, fechar }: { corretores: MembroOpcao[]; fechar: () => void }) {
  const [pendente, start] = useTransition();
  const router = useRouter();
  const [f, setF] = useState({
    inquilino: "",
    inquilinoZap: "",
    imovel: "",
    bairro: "",
    valor: "",
    proprietario: "",
    proprietarioZap: "",
    corretorId: corretores[0]?.id ?? "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  function salvar() {
    if (!f.inquilino.trim() || !f.imovel.trim()) {
      toast.error("Preencha ao menos inquilino e imóvel.");
      return;
    }
    start(async () => {
      const r = await criarContrato({
        inquilino: f.inquilino.trim(),
        inquilinoZap: f.inquilinoZap.trim() || "51 99999-0000",
        imovel: f.imovel.trim(),
        endereco: "",
        bairro: f.bairro.trim() || "Centro",
        valor: parseInt(f.valor || "1200", 10),
        proprietario: f.proprietario.trim() || "Proprietário",
        proprietarioZap: f.proprietarioZap.trim() || "51 99999-0001",
        corretorId: f.corretorId || undefined,
      });
      toast.success(`🎉 ${r.codigo} criado — ficha aprovada!`, {
        description:
          r.disparadas.length > 0
            ? `${r.disparadas.join(", ")} já recebeu o WhatsApp de boas-vindas.`
            : undefined,
      });
      fechar();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={fechar}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-[1.2rem]">Ficha digital — cadastro único</h3>
          <button className="text-ink-3 hover:text-ink" onClick={fechar}>
            <X size={17} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="field" placeholder="Inquilino *" value={f.inquilino} onChange={set("inquilino")} />
            <input className="field" placeholder="WhatsApp (51 9…)" value={f.inquilinoZap} onChange={set("inquilinoZap")} />
          </div>
          <input className="field" placeholder="Imóvel (ex.: Apto 301 · Ed. Central) *" value={f.imovel} onChange={set("imovel")} />
          <div className="grid grid-cols-2 gap-3">
            <input className="field" placeholder="Bairro" value={f.bairro} onChange={set("bairro")} />
            <input className="field" placeholder="Aluguel (R$)" inputMode="numeric" value={f.valor} onChange={set("valor")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="field" placeholder="Proprietário" value={f.proprietario} onChange={set("proprietario")} />
            <input className="field" placeholder="WhatsApp do proprietário" value={f.proprietarioZap} onChange={set("proprietarioZap")} />
          </div>
          <select className="field" value={f.corretorId} onChange={set("corretorId")}>
            {corretores.map((c) => (
              <option key={c.id} value={c.id}>
                Corretor: {c.nome}
              </option>
            ))}
          </select>
        </div>

        <button className="btn-brand mt-5 w-full justify-center" disabled={pendente} onClick={salvar}>
          {pendente ? "Criando e disparando WhatsApp…" : "Aprovar ficha + disparar boas-vindas"}
        </button>
        <p className="mt-2.5 text-center text-[0.66rem] text-ink-3 leading-relaxed">
          Preenche 1 vez e pronto: substitui os 3 cadastros de hoje (sistema + ficha de papel +
          grupo de WhatsApp). Cai conferido para a Paola, o jurídico aprova e a assinatura dispara
          sozinha.
        </p>
      </motion.div>
    </div>
  );
}
