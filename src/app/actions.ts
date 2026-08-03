"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { addDays, spToday } from "@/lib/dates";
import { dispararEtapa, despachar, rodarDisparosDiarios } from "@/lib/engine";
import { seedDemo } from "@/lib/seed-core";

function revalidarTudo() {
  revalidatePath("/", "layout");
}

/** Botão "Rodar disparos de hoje" e cron manual */
export async function rodarAgora() {
  const r = await rodarDisparosDiarios("MANUAL");
  revalidarTudo();
  return r;
}

const PROXIMA: Record<string, string> = {
  FICHA_APROVADA: "CONTRATO_ASSINADO",
  CONTRATO_ASSINADO: "VISTORIA",
  VISTORIA: "CHAVES_PRONTAS",
  CHAVES_PRONTAS: "ATIVO",
};

const ROTULO: Record<string, string> = {
  FICHA_APROVADA: "Ficha aprovada",
  CONTRATO_ASSINADO: "Contrato assinado",
  VISTORIA: "Vistoria",
  CHAVES_PRONTAS: "Chaves prontas",
  ATIVO: "Contrato ativo",
  DESOCUPACAO: "Desocupação",
};

/** Avança o contrato para a próxima etapa e dispara as mensagens automáticas */
export async function avancarEtapa(contratoId: string) {
  const c = await db.contrato.findUniqueOrThrow({ where: { id: contratoId } });
  const nova = PROXIMA[c.etapa];
  if (!nova) return { ok: false, disparadas: [] as string[], etapa: c.etapa };

  const hoje = spToday();
  const amanha = addDays(hoje, 1);
  const dados: {
    etapa: string;
    vistoriaData?: string;
    vistoriaHora?: string;
    entregaData?: string;
    entregaHora?: string;
    respEntregaId?: string;
  } = { etapa: nova };

  if (nova === "VISTORIA") {
    dados.vistoriaData = c.vistoriaData ?? amanha;
    dados.vistoriaHora = c.vistoriaHora ?? "14:00";
    const vistoriador = await db.membro.findFirst({ where: { papel: "VISTORIA", ativo: true } });
    if (vistoriador) {
      await db.tarefa.create({
        data: {
          titulo: `Vistoria de entrada — ${c.inquilino} (${c.imovel})`,
          tipo: "VISTORIA",
          data: dados.vistoriaData,
          hora: dados.vistoriaHora,
          responsavelId: vistoriador.id,
          contratoId: c.id,
        },
      });
    }
  }

  if (nova === "CHAVES_PRONTAS") {
    dados.entregaData = c.entregaData ?? amanha;
    dados.entregaHora = c.entregaHora ?? "10:00";
    const adm = await db.membro.findFirst({ where: { papel: "ADMINISTRATIVO", ativo: true } });
    if (adm) {
      dados.respEntregaId = c.respEntregaId ?? adm.id;
      await db.tarefa.create({
        data: {
          titulo: `Entrega de chaves — ${c.inquilino} (${c.imovel})`,
          tipo: "ENTREGA_CHAVE",
          data: dados.entregaData,
          hora: dados.entregaHora,
          responsavelId: dados.respEntregaId,
          contratoId: c.id,
        },
      });
    }
  }

  if (nova === "ATIVO") {
    await db.tarefa.updateMany({
      where: { contratoId: c.id, tipo: "ENTREGA_CHAVE", concluida: false },
      data: { concluida: true },
    });
  }

  await db.contrato.update({ where: { id: contratoId }, data: dados });
  await db.evento.create({
    data: { contratoId, titulo: `Etapa avançada: ${ROTULO[c.etapa]} → ${ROTULO[nova]}` },
  });

  const disparadas = await dispararEtapa(contratoId, nova);
  revalidarTudo();
  return { ok: true, disparadas, etapa: nova };
}

/** ATIVO → DESOCUPACAO, com aviso automático ao proprietário */
export async function iniciarDesocupacao(contratoId: string) {
  const c = await db.contrato.findUniqueOrThrow({ where: { id: contratoId } });
  if (c.etapa !== "ATIVO") return { ok: false, disparadas: [] as string[] };

  await db.contrato.update({ where: { id: contratoId }, data: { etapa: "DESOCUPACAO" } });
  await db.evento.create({ data: { contratoId, titulo: "Processo de desocupação iniciado" } });

  const adm = await db.membro.findFirst({ where: { papel: "ADMINISTRATIVO", ativo: true } });
  if (adm) {
    await db.tarefa.create({
      data: {
        titulo: `Desocupação — retorno ao proprietário ${c.proprietario} (${c.imovel})`,
        tipo: "DESOCUPACAO",
        data: spToday(),
        hora: "17:00",
        responsavelId: adm.id,
        contratoId: c.id,
      },
    });
  }

  const disparadas = await dispararEtapa(contratoId, "DESOCUPACAO");
  revalidarTudo();
  return { ok: true, disparadas };
}

type NovoContrato = {
  inquilino: string;
  inquilinoZap: string;
  imovel: string;
  endereco: string;
  bairro: string;
  valor: number;
  proprietario: string;
  proprietarioZap: string;
  corretorId?: string;
  diaVencimento?: number;
};

/** Cria contrato em "Ficha aprovada" e já dispara o WhatsApp de boas-vindas */
export async function criarContrato(dados: NovoContrato) {
  const total = await db.contrato.count();
  const codigo = `VB-${1053 + total}`;

  const c = await db.contrato.create({
    data: {
      codigo,
      etapa: "FICHA_APROVADA",
      imovel: dados.imovel,
      endereco: dados.endereco || "—",
      bairro: dados.bairro || "Centro",
      valor: Math.max(1, Math.round(dados.valor || 1000)),
      diaVencimento: dados.diaVencimento || 10,
      inquilino: dados.inquilino,
      inquilinoZap: dados.inquilinoZap || "51 99999-0000",
      proprietario: dados.proprietario || "Proprietário",
      proprietarioZap: dados.proprietarioZap || "51 99999-0001",
      corretorId: dados.corretorId || null,
    },
  });

  await db.evento.create({ data: { contratoId: c.id, titulo: "Ficha aprovada pelo administrativo" } });
  const disparadas = await dispararEtapa(c.id, "FICHA_APROVADA");
  revalidarTudo();
  return { ok: true, codigo, disparadas };
}

export async function toggleRegra(id: string, ativo: boolean) {
  await db.regra.update({ where: { id }, data: { ativo } });
  revalidarTudo();
  return { ok: true };
}

export async function salvarTemplate(id: string, template: string) {
  await db.regra.update({ where: { id }, data: { template } });
  revalidarTudo();
  return { ok: true };
}

export async function alternarTarefa(id: string) {
  const t = await db.tarefa.findUniqueOrThrow({ where: { id } });
  await db.tarefa.update({ where: { id }, data: { concluida: !t.concluida } });
  revalidarTudo();
  return { ok: true, concluida: !t.concluida };
}

const SETOR_PAPEL: Record<string, { papel: string; rotulo: string }> = {
  boleto: { papel: "FINANCEIRO", rotulo: "2ª via de boleto" },
  manutencao: { papel: "VISTORIA", rotulo: "Manutenção" },
  desocupacao: { papel: "ADMINISTRATIVO", rotulo: "Desocupação" },
  repasse: { papel: "FINANCEIRO", rotulo: "Repasse ao proprietário" },
  chaves: { papel: "ADMINISTRATIVO", rotulo: "Entrega de chaves" },
};

/** Recepção IA: cria chamado real (tarefa + notificação interna) para o setor certo */
export async function criarChamado(setor: string, nomeCliente: string, resumo: string) {
  const alvo = SETOR_PAPEL[setor] ?? SETOR_PAPEL.desocupacao;
  const membro = await db.membro.findFirst({ where: { papel: alvo.papel, ativo: true } });
  if (!membro) return { ok: false, responsavel: "" };

  await db.tarefa.create({
    data: {
      titulo: `Chamado da recepção — ${alvo.rotulo}: ${resumo} (${nomeCliente})`,
      tipo: "ATENDIMENTO",
      data: spToday(),
      responsavelId: membro.id,
    },
  });

  await despachar({
    regraTipo: "RECEPCAO_IA",
    regraNome: "Recepção IA — direcionamento",
    paraNome: membro.nome,
    paraZap: membro.whatsapp,
    paraTipo: "EQUIPE",
    origem: "RECEPCAO",
    membroId: membro.id,
    conteudo: `📥 Novo chamado direcionado para você:\n\n*${alvo.rotulo}* — ${resumo}\nCliente: ${nomeCliente}\n\nAberto pela recepção automática ImobiPRO.`,
  });

  revalidarTudo();
  return { ok: true, responsavel: membro.nome };
}

/** Analista IA: responde perguntas sobre a operação com snapshot ao vivo do banco */
export async function perguntarAnalista(pergunta: string) {
  const { coletarSnapshot, responder } = await import("@/lib/analista");
  const snap = await coletarSnapshot();
  return { resposta: responder(pergunta, snap), hora: snap.geradoEm, registros: snap.registros };
}

/** Restaura a demonstração ao estado original */
export async function resetDemo() {
  await seedDemo(db);
  revalidarTudo();
  return { ok: true };
}
