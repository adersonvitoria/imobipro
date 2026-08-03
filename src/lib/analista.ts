// Analista IA da operação — lê o banco inteiro e responde com dados reais.
// Determinístico e auditável: cada resposta nasce de um snapshot do Postgres.
import { db } from "./db";
import {
  addDays,
  brl,
  dayOfMonth,
  fmtCurto,
  fmtHora,
  fmtLongo,
  primeiroNome,
  spStartOfToday,
  spToday,
} from "./dates";

const ETAPA_ROTULO: Record<string, string> = {
  FICHA_APROVADA: "Ficha aprovada",
  ASSINATURA: "Assinatura",
  CONTRATO_ASSINADO: "Contrato assinado",
  VISTORIA: "Vistoria",
  CHAVES_PRONTAS: "Chaves prontas",
  ATIVO: "Ativos",
  DESOCUPACAO: "Desocupação",
};

type Entrega = { codigo: string; inquilino: string; imovel: string; hora: string; resp: string };

export type Snapshot = {
  hoje: string;
  geradoEm: string;
  registros: number;
  carteira: { ativos: number; valorMes: number; ticket: number; esteira: number; total: number };
  porEtapa: { etapa: string; rotulo: string; qtd: number }[];
  entregasHoje: Entrega[];
  entregasAmanha: Entrega[];
  entregasSemResp: number;
  vistorias: { inquilino: string; imovel: string; data: string; hora: string }[];
  desocupacoes: { imovel: string; proprietario: string }[];
  boletos: { inquilino: string; imovel: string; data: string; valor: number }[];
  tarefas: {
    total: number;
    concluidas: number;
    atrasadas: { titulo: string; hora: string; nome: string }[];
    porMembro: { nome: string; papel: string; pendentes: number; concluidas: number; itens: string[] }[];
    agenda: { hora: string | null; titulo: string; nome: string; concluida: boolean }[];
  };
  disparos: {
    hoje: number;
    ontem: number;
    ultimos7: number;
    porRegraHoje: { nome: string; qtd: number }[];
    ultimaHora: string | null;
    paraProprietariosHoje: number;
  };
  chamadosHoje: number;
  regrasDesligadas: string[];
  sinistros: {
    abertos: {
      imovel: string;
      proprietario: string;
      seguradora: string;
      status: string;
      protocolo: string;
      dias: number;
      previsaoDias: number;
    }[];
    concluidos: number;
  };
  cobrancas: {
    abertas: {
      inquilino: string;
      imovel: string;
      proprietario: string;
      status: string;
      valor: number;
      previsao: string;
      dias: number;
    }[];
    regularizadas: number;
  };
  financeiro: {
    receberAberto: number;
    pagarAberto: number;
    receberVencidas: { desc: string; valor: number; dias: number }[];
    pagarVencidas: { desc: string; valor: number; dias: number }[];
    receber7: { desc: string; valor: number; data: string; ehHoje: boolean }[];
    pagar7: { desc: string; valor: number; data: string; ehHoje: boolean }[];
    pagarHojeQtd: number;
    saldo7: number;
  };
  notasFiscais: {
    emitidasMes: number;
    valorMes: number;
    pendentes: { desc: string; tomador: string; valor: number }[];
    ultimas: { numero: number; tomador: string; valor: number }[];
  };
};

export async function coletarSnapshot(): Promise<Snapshot> {
  const hoje = spToday();
  const amanha = addDays(hoje, 1);
  const inicioHoje = spStartOfToday();
  const inicioOntem = new Date(`${addDays(hoje, -1)}T00:00:00-03:00`);
  const inicio7 = new Date(`${addDays(hoje, -6)}T00:00:00-03:00`);

  const [
    contratos,
    tarefasHoje,
    msgsHoje,
    msgsOntem,
    msgs7,
    regras,
    chamadosHoje,
    lancAbertos,
    notasAll,
    sinistrosAll,
    cobrancasAll,
  ] = await Promise.all([
      db.contrato.findMany({ include: { respEntrega: true } }),
      db.tarefa.findMany({ where: { data: hoje }, include: { responsavel: true }, orderBy: { hora: "asc" } }),
      db.mensagem.findMany({
        where: { criadaEm: { gte: inicioHoje } },
        orderBy: { criadaEm: "desc" },
        select: { regraNome: true, paraTipo: true, criadaEm: true },
      }),
      db.mensagem.count({ where: { criadaEm: { gte: inicioOntem, lt: inicioHoje } } }),
      db.mensagem.count({ where: { criadaEm: { gte: inicio7 } } }),
      db.regra.findMany(),
      db.mensagem.count({ where: { origem: "RECEPCAO", criadaEm: { gte: inicioHoje } } }),
      db.lancamento.findMany({ where: { status: "ABERTO" }, orderBy: { vencimento: "asc" } }),
      db.notaFiscal.findMany(),
      db.sinistro.findMany({ orderBy: { abertoEm: "desc" } }),
      db.cobranca.findMany({ orderBy: { iniciadaEm: "desc" } }),
    ]);

  const ativos = contratos.filter((c) => c.etapa === "ATIVO");
  const esteira = contratos.filter((c) =>
    ["FICHA_APROVADA", "ASSINATURA", "CONTRATO_ASSINADO", "VISTORIA", "CHAVES_PRONTAS"].includes(c.etapa)
  );
  const valorMes = ativos.reduce((s, c) => s + c.valor, 0);

  const mapEntrega = (c: (typeof contratos)[number]): Entrega => ({
    codigo: c.codigo,
    inquilino: c.inquilino,
    imovel: c.imovel,
    hora: c.entregaHora ?? "10:00",
    resp: c.respEntrega ? primeiroNome(c.respEntrega.nome) : "sem responsável",
  });
  const entregasHoje = contratos
    .filter((c) => c.etapa === "CHAVES_PRONTAS" && c.entregaData === hoje)
    .sort((a, b) => (a.entregaHora ?? "").localeCompare(b.entregaHora ?? ""))
    .map(mapEntrega);
  const entregasAmanha = contratos
    .filter((c) => c.etapa === "CHAVES_PRONTAS" && c.entregaData === amanha)
    .sort((a, b) => (a.entregaHora ?? "").localeCompare(b.entregaHora ?? ""))
    .map(mapEntrega);
  const entregasSemResp = contratos.filter(
    (c) => c.etapa === "CHAVES_PRONTAS" && !c.respEntregaId
  ).length;

  const vistorias = contratos
    .filter((c) => c.etapa === "VISTORIA" && c.vistoriaData && c.vistoriaData >= hoje)
    .map((c) => ({
      inquilino: c.inquilino,
      imovel: c.imovel,
      data: c.vistoriaData === hoje ? "hoje" : c.vistoriaData === amanha ? "amanhã" : fmtCurto(c.vistoriaData!),
      hora: c.vistoriaHora ?? "14:00",
    }));

  const desocupacoes = contratos
    .filter((c) => c.etapa === "DESOCUPACAO")
    .map((c) => ({ imovel: c.imovel, proprietario: c.proprietario }));

  // boletos vencendo nos próximos 5 dias (com virada de mês)
  const boletos: Snapshot["boletos"] = [];
  for (let d = 0; d <= 5; d++) {
    const dia = addDays(hoje, d);
    const diaMes = dayOfMonth(dia);
    for (const c of ativos.filter((c) => c.diaVencimento === diaMes)) {
      boletos.push({ inquilino: c.inquilino, imovel: c.imovel, data: fmtCurto(dia), valor: c.valor });
    }
  }

  const agoraHM = fmtHora(new Date());
  const atrasadas = tarefasHoje
    .filter((t) => !t.concluida && t.hora && t.hora < agoraHM)
    .map((t) => ({ titulo: t.titulo, hora: t.hora!, nome: primeiroNome(t.responsavel.nome) }));

  const porMembroMap = new Map<string, { nome: string; papel: string; pendentes: number; concluidas: number; itens: string[] }>();
  for (const t of tarefasHoje) {
    const atual = porMembroMap.get(t.responsavelId) ?? {
      nome: primeiroNome(t.responsavel.nome),
      papel: t.responsavel.papel,
      pendentes: 0,
      concluidas: 0,
      itens: [],
    };
    if (t.concluida) atual.concluidas++;
    else {
      atual.pendentes++;
      if (atual.itens.length < 3) atual.itens.push(`${t.hora ? `${t.hora} ` : ""}${t.titulo}`);
    }
    porMembroMap.set(t.responsavelId, atual);
  }
  const porMembro = Array.from(porMembroMap.values()).sort((a, b) => b.pendentes - a.pendentes);

  const porRegraMap = new Map<string, number>();
  for (const m of msgsHoje) porRegraMap.set(m.regraNome, (porRegraMap.get(m.regraNome) ?? 0) + 1);
  const porRegraHoje = Array.from(porRegraMap.entries())
    .map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  const regrasDesligadas = regras.filter((r) => !r.ativo).map((r) => r.nome);

  // contas a pagar / receber
  const em7 = addDays(hoje, 7);
  const diasDesde = (v: string) =>
    Math.round((new Date(`${hoje}T12:00:00Z`).getTime() - new Date(`${v}T12:00:00Z`).getTime()) / 86400000);
  const descLanc = (l: (typeof lancAbertos)[number]) => `${l.descricao} — ${l.contraparte}`;
  const receber = lancAbertos.filter((l) => l.tipo === "RECEBER");
  const pagar = lancAbertos.filter((l) => l.tipo === "PAGAR");
  const receberVencidas = receber
    .filter((l) => l.vencimento < hoje)
    .map((l) => ({ desc: descLanc(l), valor: l.valor, dias: diasDesde(l.vencimento) }));
  const pagarVencidas = pagar
    .filter((l) => l.vencimento < hoje)
    .map((l) => ({ desc: descLanc(l), valor: l.valor, dias: diasDesde(l.vencimento) }));
  const janela7 = (l: (typeof lancAbertos)[number]) => l.vencimento >= hoje && l.vencimento <= em7;
  const mapJanela = (l: (typeof lancAbertos)[number]) => ({
    desc: descLanc(l),
    valor: l.valor,
    data: fmtCurto(l.vencimento),
    ehHoje: l.vencimento === hoje,
  });
  const receber7 = receber.filter(janela7).map(mapJanela);
  const pagar7 = pagar.filter(janela7).map(mapJanela);
  const soma = (a: { valor: number }[]) => a.reduce((s, x) => s + x.valor, 0);

  // NFS-e
  const compet = hoje.slice(0, 7);
  const nfEmitidas = notasAll.filter((n) => n.status === "EMITIDA" && n.competencia === compet);
  const nfPendentes = notasAll.filter((n) => n.status === "PENDENTE");

  // sinistros de seguro-fiança
  const ROT_SINISTRO: Record<string, string> = {
    ABERTO: "aberto na seguradora",
    EM_ANALISE: "em análise",
    DEFERIDO: "deferido — pagamento programado",
    PAGO: "pago",
  };
  const ROT_COBRANCA: Record<string, string> = {
    COBRANCA_INICIADA: "cobrança iniciada",
    AVISO_FORMAL: "aviso formal enviado",
    NEGOCIACAO: "em negociação",
    JURIDICO: "no jurídico",
    REGULARIZADO: "regularizada",
  };
  const cobAbertas = cobrancasAll
    .filter((c) => c.status !== "REGULARIZADO")
    .map((c) => ({
      inquilino: c.inquilino,
      imovel: c.imovel,
      proprietario: c.proprietario,
      status: ROT_COBRANCA[c.status] ?? c.status,
      valor: c.valor,
      previsao: c.previsaoPagamento ? `até ${fmtCurto(c.previsaoPagamento)}` : "em definição",
      dias: Math.max(0, Math.round((Date.now() - c.iniciadaEm.getTime()) / 86400000)),
    }));

  const sinAbertos = sinistrosAll
    .filter((s) => s.status !== "PAGO")
    .map((s) => ({
      imovel: s.imovel,
      proprietario: s.proprietario,
      seguradora: s.seguradora === "LOFT" ? "Loft" : "Porto Seguro",
      status: ROT_SINISTRO[s.status] ?? s.status,
      protocolo: s.protocolo,
      dias: Math.max(0, Math.round((Date.now() - s.abertoEm.getTime()) / 86400000)),
      previsaoDias: s.previsaoDias,
    }));

  return {
    hoje,
    geradoEm: agoraHM,
    registros:
      contratos.length +
      tarefasHoje.length +
      msgsHoje.length +
      regras.length +
      lancAbertos.length +
      notasAll.length +
      sinistrosAll.length +
      cobrancasAll.length,
    carteira: {
      ativos: ativos.length,
      valorMes,
      ticket: ativos.length > 0 ? Math.round(valorMes / ativos.length) : 0,
      esteira: esteira.length,
      total: contratos.length,
    },
    porEtapa: Object.entries(ETAPA_ROTULO)
      .map(([etapa, rotulo]) => ({ etapa, rotulo, qtd: contratos.filter((c) => c.etapa === etapa).length }))
      .filter((e) => e.qtd > 0),
    entregasHoje,
    entregasAmanha,
    entregasSemResp,
    vistorias,
    desocupacoes,
    boletos,
    tarefas: {
      total: tarefasHoje.length,
      concluidas: tarefasHoje.filter((t) => t.concluida).length,
      atrasadas,
      porMembro,
      agenda: tarefasHoje.map((t) => ({
        hora: t.hora,
        titulo: t.titulo,
        nome: primeiroNome(t.responsavel.nome),
        concluida: t.concluida,
      })),
    },
    disparos: {
      hoje: msgsHoje.length,
      ontem: msgsOntem,
      ultimos7: msgs7,
      porRegraHoje,
      ultimaHora: msgsHoje[0] ? fmtHora(msgsHoje[0].criadaEm) : null,
      paraProprietariosHoje: msgsHoje.filter((m) => m.paraTipo === "PROPRIETARIO").length,
    },
    chamadosHoje,
    regrasDesligadas,
    sinistros: {
      abertos: sinAbertos,
      concluidos: sinistrosAll.length - sinAbertos.length,
    },
    cobrancas: {
      abertas: cobAbertas,
      regularizadas: cobrancasAll.length - cobAbertas.length,
    },
    financeiro: {
      receberAberto: soma(receber),
      pagarAberto: soma(pagar),
      receberVencidas,
      pagarVencidas,
      receber7,
      pagar7,
      pagarHojeQtd: pagar7.filter((p) => p.ehHoje).length,
      saldo7: soma(receber7) + soma(receberVencidas) - soma(pagar7) - soma(pagarVencidas),
    },
    notasFiscais: {
      emitidasMes: nfEmitidas.length,
      valorMes: nfEmitidas.reduce((s, n) => s + n.valor, 0),
      pendentes: nfPendentes.map((n) => ({ desc: n.descricao, tomador: n.tomador, valor: n.valor })),
      ultimas: nfEmitidas
        .slice()
        .sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0))
        .slice(0, 4)
        .map((n) => ({ numero: n.numero ?? 0, tomador: n.tomador, valor: n.valor })),
    },
  };
}

// ---------------------------------------------------------------- respostas

function rodape(s: Snapshot): string {
  return `\n\n🗄 Lido agora do banco: ${s.carteira.total} contratos · ${s.tarefas.total} tarefas · ${s.disparos.hoje} mensagens de hoje · regras da régua.`;
}

function listaEntregas(lista: Entrega[]): string {
  return lista.map((e) => `  • ${e.hora} — ${primeiroNome(e.inquilino)} (${e.imovel}), com *${e.resp}*`).join("\n");
}

export function respostaResumo(s: Snapshot): string {
  const partes: string[] = [];
  partes.push(`📊 *Pulso da operação — ${fmtLongo(s.hoje)}, ${s.geradoEm}*`);

  partes.push(
    `\n💰 *Carteira:* ${s.carteira.ativos} contratos ativos somando *${brl(s.carteira.valorMes)}/mês* (ticket médio ${brl(
      s.carteira.ticket
    )}). Mais ${s.carteira.esteira} em andamento na esteira.`
  );

  if (s.entregasHoje.length > 0) {
    partes.push(`\n🔑 *Entregas de chave hoje (${s.entregasHoje.length}):*\n${listaEntregas(s.entregasHoje)}`);
  } else {
    partes.push(`\n🔑 *Entregas de chave:* nenhuma hoje.`);
  }
  if (s.entregasAmanha.length > 0) {
    partes.push(
      `\n*Amanhã (${s.entregasAmanha.length}):* ${s.entregasAmanha
        .map((e) => `${primeiroNome(e.inquilino)} ${e.hora} (${e.resp})`)
        .join(" · ")}`
    );
  }
  if (s.entregasHoje.length + s.entregasAmanha.length > 0) {
    partes.push(`\nCada inquilino já foi avisado automaticamente com hora, local e responsável.`);
  }

  if (s.tarefas.agenda.length > 0) {
    const linhas = s.tarefas.agenda
      .slice(0, 10)
      .map((t) => `  ${t.concluida ? "✅" : "⏳"} ${t.hora ? `${t.hora} — ` : ""}${t.titulo} → *${t.nome}*`)
      .join("\n");
    partes.push(
      `\n\n🗓 *Tarefas do dia (${s.tarefas.total}):*\n${linhas}${
        s.tarefas.total > 10 ? `\n  … e mais ${s.tarefas.total - 10}` : ""
      }`
    );
  }

  if (s.desocupacoes.length > 0) {
    partes.push(
      `\n📦 *Desocupações:* ${s.desocupacoes.length} em acompanhamento (${s.desocupacoes
        .map((d) => `${d.imovel} — ${d.proprietario}`)
        .join("; ")}). Proprietário recebe cada etapa por mensagem.`
    );
  }

  if (s.sinistros.abertos.length > 0) {
    const sin = s.sinistros.abertos[0];
    partes.push(
      `\n🛡 *Sinistros:* ${s.sinistros.abertos.length} em andamento (${sin.seguradora} · *${sin.status}* há ${sin.dias} dias, previsão até ${sin.previsaoDias} dias) — o proprietário é informado automaticamente.`
    );
  }

  if (s.cobrancas.abertas.length > 0) {
    const cob = s.cobrancas.abertas[0];
    partes.push(
      `\n📢 *Cobranças:* ${s.cobrancas.abertas.length} em andamento (${primeiroNome(cob.inquilino)} · *${cob.status}* · previsão ${cob.previsao}) — ${cob.proprietario} recebe cada movimento.`
    );
  }

  if (s.boletos.length > 0) {
    partes.push(
      `\n💳 *Boletos:* ${s.boletos.length} vencendo em até 5 dias (${s.boletos
        .map((b) => `${primeiroNome(b.inquilino)} dia ${b.data}`)
        .join(" · ")}) — lembrete automático D-3 na régua.`
    );
  }

  const t = s.tarefas;
  let equipe = `\n✅ *Equipe:* ${t.concluidas} de ${t.total} tarefas do dia concluídas.`;
  if (t.porMembro[0] && t.porMembro[0].pendentes > 0) {
    equipe += ` Maior carga agora: *${t.porMembro[0].nome}* (${t.porMembro[0].pendentes} pendentes).`;
  }
  if (t.atrasadas.length > 0) equipe += ` ⚠️ ${t.atrasadas.length} passaram do horário.`;
  partes.push(equipe);

  const f = s.financeiro;
  partes.push(
    `\n💸 *Contas:* a receber ${brl(f.receberAberto)} em aberto${
      f.receberVencidas.length > 0 ? ` (⚠️ ${f.receberVencidas.length} vencida${f.receberVencidas.length > 1 ? "s" : ""})` : ""
    } · a pagar ${brl(f.pagarAberto)}${f.pagarHojeQtd > 0 ? ` (${f.pagarHojeQtd} vence${f.pagarHojeQtd > 1 ? "m" : ""} hoje)` : ""}. NFS-e: ${
      s.notasFiscais.emitidasMes
    } emitidas no mês${s.notasFiscais.pendentes.length > 0 ? ` · ${s.notasFiscais.pendentes.length} pendente` : ""}.`
  );

  partes.push(
    `\n📲 *Comunicação:* ${s.disparos.hoje} disparos hoje (ontem: ${s.disparos.ontem}; últimos 7 dias: ${s.disparos.ultimos7}).` +
      (s.regrasDesligadas.length > 0
        ? ` ⚠️ Regras desligadas: ${s.regrasDesligadas.join(", ")}.`
        : ` Todas as regras da régua estão ligadas.`)
  );

  return partes.join("") + rodape(s);
}

export function respostaEntregas(s: Snapshot): string {
  const partes: string[] = [`🔑 *Entregas de chave — visão completa*`];
  partes.push(
    s.entregasHoje.length > 0
      ? `\n*Hoje (${s.entregasHoje.length}):*\n${listaEntregas(s.entregasHoje)}`
      : `\nHoje não há entregas programadas.`
  );
  partes.push(
    s.entregasAmanha.length > 0
      ? `\n\n*Amanhã (${s.entregasAmanha.length}):*\n${listaEntregas(s.entregasAmanha)}`
      : `\n\nAmanhã não há entregas programadas.`
  );
  partes.push(
    `\n\nCada inquilino recebe aviso na *véspera* e no *dia*, com hora, local e com quem retirar — ninguém mais cobra o corretor.`
  );
  if (s.entregasSemResp > 0)
    partes.push(`\n⚠️ *Atenção:* ${s.entregasSemResp} entrega(s) ainda sem responsável definido.`);
  if (s.vistorias.length > 0) {
    partes.push(
      `\n\n📋 *Vistorias no radar:* ${s.vistorias
        .map((v) => `${primeiroNome(v.inquilino)} (${v.imovel}) ${v.data} às ${v.hora}`)
        .join(" · ")}.`
    );
  }
  return partes.join("") + rodape(s);
}

export function respostaProprietarios(s: Snapshot): string {
  const partes: string[] = [`🤝 *Proprietários — o cliente mais importante*`];
  partes.push(
    s.desocupacoes.length > 0
      ? `\n📦 *Desocupações em andamento:* ${s.desocupacoes
          .map((d) => `\n  • ${d.imovel} — *${d.proprietario}* (recebe atualização automática de cada etapa)`)
          .join("")}`
      : `\nNenhuma desocupação em andamento no momento.`
  );
  partes.push(
    `\n\n💰 *Repasses:* ${s.carteira.ativos} contratos ativos geram ${brl(
      s.carteira.valorMes
    )}/mês em repasses. Hoje ${s.disparos.paraProprietariosHoje} mensagem(ns) automática(s) já foram enviadas a proprietários (aviso de repasse/etapa).`
  );
  partes.push(
    `\n\nA régua garante: aviso de imóvel ocupado, repasse do mês e cada passo da desocupação — *sem o proprietário precisar perguntar*.`
  );
  return partes.join("") + rodape(s);
}

export function respostaFinanceiro(s: Snapshot): string {
  const f = s.financeiro;
  const partes: string[] = [`💰 *Financeiro da carteira*`];
  partes.push(
    `\n• Contratos ativos: *${s.carteira.ativos}* somando *${brl(s.carteira.valorMes)}/mês* (ticket médio ${brl(
      s.carteira.ticket
    )})` + `\n• Em fechamento na esteira: *${s.carteira.esteira}* contratos`
  );

  // A receber
  let rec = `\n\n📥 *Contas a receber — em aberto: ${brl(f.receberAberto)}*`;
  if (f.receberVencidas.length > 0) {
    rec += `\n  ⚠️ Vencidas (${f.receberVencidas.length}): ${f.receberVencidas
      .map((v) => `${v.desc}, ${brl(v.valor)} (há ${v.dias} dia${v.dias > 1 ? "s" : ""})`)
      .join(" · ")}`;
  }
  if (f.receber7.length > 0) {
    rec += `\n${f.receber7
      .slice(0, 5)
      .map((r) => `  • ${r.ehHoje ? "*HOJE*" : r.data} — ${r.desc}, ${brl(r.valor)}`)
      .join("\n")}${f.receber7.length > 5 ? `\n  … e mais ${f.receber7.length - 5} na semana` : ""}`;
  }
  partes.push(rec);

  // A pagar
  let pag = `\n\n📤 *Contas a pagar — em aberto: ${brl(f.pagarAberto)}*`;
  if (f.pagarVencidas.length > 0) {
    pag += `\n  ⚠️ Vencidas (${f.pagarVencidas.length}): ${f.pagarVencidas
      .map((v) => `${v.desc}, ${brl(v.valor)}`)
      .join(" · ")}`;
  }
  if (f.pagar7.length > 0) {
    pag += `\n${f.pagar7
      .slice(0, 5)
      .map((p) => `  • ${p.ehHoje ? "*HOJE*" : p.data} — ${p.desc}, ${brl(p.valor)}`)
      .join("\n")}${f.pagar7.length > 5 ? `\n  … e mais ${f.pagar7.length - 5} na semana` : ""}`;
  }
  partes.push(pag);

  partes.push(
    `\n\n💵 *Saldo previsto (próximos 7 dias): ${f.saldo7 >= 0 ? "+" : ""}${brl(f.saldo7)}*`
  );

  partes.push(
    s.boletos.length > 0
      ? `\n\n💳 *Boletos de aluguel (5 dias):* ${s.boletos
          .map((b) => `${primeiroNome(b.inquilino)} dia ${b.data} (${brl(b.valor)})`)
          .join(" · ")} — lembrete automático D-3 na régua.`
      : `\n\n💳 Nenhum boleto de aluguel vencendo nos próximos 5 dias.`
  );

  const n = s.notasFiscais;
  partes.push(
    `\n\n🧾 *NFS-e:* ${n.emitidasMes} emitida${n.emitidasMes === 1 ? "" : "s"} no mês (${brl(n.valorMes)})` +
      (n.pendentes.length > 0
        ? ` · *${n.pendentes.length} pendente${n.pendentes.length === 1 ? "" : "s"}* de emissão`
        : "") +
      ` — emissão automática junto do repasse.`
  );

  return partes.join("") + rodape(s);
}

export function respostaNotas(s: Snapshot): string {
  const n = s.notasFiscais;
  const partes: string[] = [`🧾 *Notas fiscais de serviço (NFS-e)*`];
  partes.push(
    `\n*Emitidas no mês: ${n.emitidasMes}* somando *${brl(n.valorMes)}* — taxa de administração dos contratos ativos.`
  );
  if (n.ultimas.length > 0) {
    partes.push(`\n${n.ultimas.map((u) => `  • nº ${u.numero} — ${u.tomador} · ${brl(u.valor)}`).join("\n")}`);
  }
  partes.push(
    n.pendentes.length > 0
      ? `\n\n⏳ *Pendente${n.pendentes.length === 1 ? "" : "s"} de emissão (${n.pendentes.length}):*\n${n.pendentes
          .map((p) => `  • ${p.desc} — ${p.tomador}, ${brl(p.valor)}`)
          .join("\n")}`
      : `\n\n✅ Nenhuma nota pendente de emissão.`
  );
  partes.push(
    `\n\nComo funciona: no dia do repasse o sistema *emite a NFS-e da taxa automaticamente* e envia ao proprietário junto do aviso. Na versão final, integrado à prefeitura via provedor (Focus NFe / eNotas / Asaas).`
  );
  return partes.join("") + rodape(s);
}

export function respostaCobrancas(s: Snapshot): string {
  const partes: string[] = [`📢 *Cobranças de inadimplência*`];
  if (s.cobrancas.abertas.length > 0) {
    partes.push(`\n*Em andamento (${s.cobrancas.abertas.length}):*`);
    for (const c of s.cobrancas.abertas) {
      partes.push(
        `\n  • *${c.imovel}* — inquilino ${primeiroNome(c.inquilino)} · ${brl(c.valor)} em aberto` +
          `\n    Status: *${c.status}* há ${c.dias} dias · previsão de regularização: ${c.previsao}` +
          `\n    Proprietário ${c.proprietario} é avisado a cada movimento.`
      );
    }
  } else {
    partes.push(`\nNenhuma cobrança em andamento. ✅`);
  }
  if (s.cobrancas.regularizadas > 0) {
    partes.push(`\n\nRegularizadas no histórico: ${s.cobrancas.regularizadas}.`);
  }
  partes.push(
    `\n\nA esteira evolui sozinha: cobrança iniciada → aviso formal → negociação → jurídico. O proprietário nunca fica sem saber em que pé está — e o repasse sai no dia em que o pagamento entra.`
  );
  return partes.join("") + rodape(s);
}

export function respostaSinistros(s: Snapshot): string {
  const partes: string[] = [`🛡 *Seguro-fiança — sinistros*`];
  if (s.sinistros.abertos.length > 0) {
    partes.push(`\n*Em andamento (${s.sinistros.abertos.length}):*`);
    for (const sin of s.sinistros.abertos) {
      partes.push(
        `\n  • *${sin.imovel}* — ${sin.proprietario}` +
          `\n    ${sin.seguradora} · protocolo ${sin.protocolo} · *${sin.status}* há ${sin.dias} dias · previsão: até ${sin.previsaoDias} dias`
      );
    }
  } else {
    partes.push(`\nNenhum sinistro em andamento. ✅`);
  }
  if (s.sinistros.concluidos > 0) {
    partes.push(`\n\nConcluídos no histórico: ${s.sinistros.concluidos}.`);
  }
  partes.push(
    `\n\n90% das cobranças de proprietário somem quando o status chega sozinho: a Recepção IA responde na hora e a régua avisa a cada mudança — na versão final, direto da API da Loft/Porto Seguro.`
  );
  return partes.join("") + rodape(s);
}

export function respostaEquipe(s: Snapshot): string {
  const t = s.tarefas;
  const partes: string[] = [`👥 *Carga da equipe — hoje*`];
  if (t.porMembro.length === 0) {
    partes.push(`\nSem tarefas registradas para hoje.`);
  } else {
    for (const m of t.porMembro) {
      partes.push(
        `\n• *${m.nome}*: ${m.pendentes} pendente(s), ${m.concluidas} concluída(s)` +
          (m.itens.length > 0 ? `\n${m.itens.map((i) => `    – ${i}`).join("\n")}` : "")
      );
    }
  }
  if (t.atrasadas.length > 0) {
    partes.push(
      `\n\n⚠️ *Passaram do horário:* ${t.atrasadas.map((a) => `${a.titulo} (${a.hora}, ${a.nome})`).join(" · ")}`
    );
  }
  partes.push(
    `\n\nÀs 07:30 cada um recebeu a própria agenda no WhatsApp — e amanhã recebe de novo, sem ninguém precisar lembrar.`
  );
  return partes.join("") + rodape(s);
}

export function respostaDisparos(s: Snapshot): string {
  const partes: string[] = [`📲 *Comunicação automática*`];
  partes.push(
    `\n• Hoje: *${s.disparos.hoje} mensagens* (última às ${s.disparos.ultimaHora ?? "—"})` +
      `\n• Ontem: ${s.disparos.ontem} · Últimos 7 dias: *${s.disparos.ultimos7}*` +
      `\n• Chamados abertos pela recepção IA hoje: ${s.chamadosHoje}`
  );
  if (s.disparos.porRegraHoje.length > 0) {
    partes.push(
      `\n\n*Por regra, hoje:*\n${s.disparos.porRegraHoje.map((r) => `  • ${r.nome}: ${r.qtd}`).join("\n")}`
    );
  }
  partes.push(
    `\n\nEstimativa de tempo devolvido hoje: *${Math.round((s.disparos.hoje * 4) / 6) / 10}h* (≈4 min por mensagem manual).`
  );
  return partes.join("") + rodape(s);
}

export function respostaRiscos(s: Snapshot): string {
  const alertas: string[] = [];
  if (s.regrasDesligadas.length > 0)
    alertas.push(`🔴 Regras da régua desligadas: *${s.regrasDesligadas.join(", ")}* — clientes deixam de ser avisados.`);
  if (s.entregasSemResp > 0)
    alertas.push(`🟠 ${s.entregasSemResp} entrega(s) de chave sem responsável definido.`);
  if (s.tarefas.atrasadas.length > 0)
    alertas.push(
      `🟠 ${s.tarefas.atrasadas.length} tarefa(s) passaram do horário: ${s.tarefas.atrasadas
        .map((a) => `${a.titulo} (${a.nome})`)
        .join(" · ")}.`
    );
  const fichas = s.porEtapa.find((e) => e.etapa === "FICHA_APROVADA")?.qtd ?? 0;
  if (fichas > 0) alertas.push(`🟡 ${fichas} ficha(s) aprovada(s) aguardando assinatura de contrato.`);
  if (s.boletos.length > 0)
    alertas.push(`🟡 ${s.boletos.length} boleto(s) vencendo em até 5 dias — lembretes automáticos programados.`);
  if (s.financeiro.receberVencidas.length > 0)
    alertas.push(
      `🔴 Recebimento em atraso: ${s.financeiro.receberVencidas
        .map((v) => `${v.desc} (${brl(v.valor)}, há ${v.dias} dias)`)
        .join(" · ")}.`
    );
  if (s.financeiro.pagarHojeQtd > 0)
    alertas.push(
      `🟡 ${s.financeiro.pagarHojeQtd} conta(s) a pagar vencem hoje (${s.financeiro.pagar7
        .filter((p) => p.ehHoje)
        .map((p) => p.desc)
        .join(" · ")}).`
    );
  if (s.notasFiscais.pendentes.length > 0)
    alertas.push(
      `🟡 ${s.notasFiscais.pendentes.length} NFS-e pendente(s) de emissão (${s.notasFiscais.pendentes
        .map((p) => p.tomador)
        .join(", ")}).`
    );
  if (s.sinistros.abertos.length > 0)
    alertas.push(
      `🟡 ${s.sinistros.abertos.length} sinistro(s) de seguro-fiança em andamento (${s.sinistros.abertos
        .map((x) => `${x.protocolo} há ${x.dias} dias`)
        .join(" · ")}) — proprietários sendo atualizados automaticamente.`
    );
  if (s.cobrancas.abertas.length > 0)
    alertas.push(
      `🟠 ${s.cobrancas.abertas.length} cobrança(s) de inadimplência em andamento (${s.cobrancas.abertas
        .map((x) => `${primeiroNome(x.inquilino)}: ${x.status}`)
        .join(" · ")}).`
    );

  const partes = [`🚨 *Riscos e pendências agora*`];
  partes.push(alertas.length > 0 ? `\n${alertas.map((a) => `\n${a}`).join("")}` : `\n\n✅ Nenhum alerta crítico. Operação redonda.`);
  return partes.join("") + rodape(s);
}

function respostaAjuda(s: Snapshot): string {
  return (
    `Posso te responder, com dados ao vivo do banco:\n` +
    `\n  • *"Resumo do dia"* — pulso geral da operação` +
    `\n  • *"Como estão as entregas?"* — chaves de hoje e amanhã` +
    `\n  • *"Situação dos proprietários"* — desocupações e repasses` +
    `\n  • *"Financeiro e boletos"* — carteira, contas a pagar/receber e saldo` +
    `\n  • *"Notas fiscais"* — NFS-e emitidas e pendentes` +
    `\n  • *"Sinistros"* — seguro-fiança: status, protocolo e previsão` +
    `\n  • *"Cobranças"* — inadimplência: esteira, status e previsão` +
    `\n  • *"Carga da equipe"* — quem está com o quê` +
    `\n  • *"Disparos de hoje"* — comunicação automática` +
    `\n  • *"Riscos e pendências"* — o que merece atenção` +
    rodape(s)
  );
}

function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function responder(pergunta: string, s: Snapshot): string {
  const p = normalizar(pergunta);
  const tem = (...ks: string[]) => ks.some((k) => p.includes(k));

  if (tem("nota", "nfs", "fiscal", "imposto", "emissao", "emitir")) return respostaNotas(s);
  if (tem("cobranc", "inadimpl", "juridic", "calote", "devedor", "nao pagou")) return respostaCobrancas(s);
  if (tem("sinistro", "seguradora", "seguro", "loft", "porto", "fianca")) return respostaSinistros(s);
  if (tem("entrega", "chave", "retirada", "vistoria")) return respostaEntregas(s);
  if (tem("proprietario", "dono do imovel", "repasse", "desocupacao", "milton")) return respostaProprietarios(s);
  if (tem("financeiro", "boleto", "venciment", "receita", "carteira", "faturamento", "dinheiro", "aluguel", "inadimpl", "valor", "pagar", "receber", "contas", "caixa", "fluxo", "saldo", "vencid")) return respostaFinanceiro(s);
  if (tem("equipe", "time", "carga", "sobrecarregad", "tarefa", "agenda", "quem esta", "quem faz")) return respostaEquipe(s);
  if (tem("disparo", "mensagen", "whatsapp", "comunicac", "envio")) return respostaDisparos(s);
  if (tem("risco", "pendencia", "alerta", "problema", "atencao", "gargalo", "atrasad")) return respostaRiscos(s);
  if (tem("resumo", "operacao", "panorama", "pulso", "geral", "visao", "boletim", "status", "como esta", "hoje", "dia")) return respostaResumo(s);
  if (tem("ajuda", "o que voce", "help")) return respostaAjuda(s);
  return respostaAjuda(s);
}

/** Versão compacta para o boletim diário no WhatsApp da gestão */
export function resumoBoletim(s: Snapshot): string {
  const linhas: string[] = [];
  if (s.entregasHoje.length > 0) {
    linhas.push(`🔑 Entregas de chave hoje (${s.entregasHoje.length}):`);
    for (const e of s.entregasHoje) {
      linhas.push(`   • ${e.hora} — ${primeiroNome(e.inquilino)} (${e.imovel}) c/ ${e.resp}`);
    }
  } else {
    linhas.push(`🔑 Entregas de chave hoje: nenhuma`);
  }
  if (s.vistorias.length > 0)
    linhas.push(`📋 Vistorias: ${s.vistorias.map((v) => `${v.data} ${v.hora}`).join(" · ")}`);
  linhas.push(`📦 Desocupações em acompanhamento: ${s.desocupacoes.length}`);
  if (s.sinistros.abertos.length > 0) {
    linhas.push(
      `🛡 Sinistros em andamento: ${s.sinistros.abertos.length} (${s.sinistros.abertos
        .map((x) => `${x.seguradora} · ${x.status}`)
        .join(" · ")})`
    );
  }
  if (s.cobrancas.abertas.length > 0) {
    linhas.push(
      `📢 Cobranças em andamento: ${s.cobrancas.abertas.length} (${s.cobrancas.abertas
        .map((x) => `${primeiroNome(x.inquilino)} · ${x.status}`)
        .join(" · ")})`
    );
  }
  linhas.push(`💳 Boletos vencendo em 5 dias: ${s.boletos.length}`);
  linhas.push(`💰 Carteira ativa: ${brl(s.carteira.valorMes)}/mês (${s.carteira.ativos} contratos)`);
  linhas.push(
    `📥 A receber: ${brl(s.financeiro.receberAberto)} em aberto` +
      (s.financeiro.receberVencidas.length > 0 ? ` (${s.financeiro.receberVencidas.length} vencida!)` : "")
  );
  linhas.push(
    `📤 A pagar: ${brl(s.financeiro.pagarAberto)}` +
      (s.financeiro.pagarHojeQtd > 0 ? ` (${s.financeiro.pagarHojeQtd} vencem hoje)` : "")
  );
  linhas.push(
    `🧾 NFS-e: ${s.notasFiscais.emitidasMes} emitidas no mês` +
      (s.notasFiscais.pendentes.length > 0 ? ` · ${s.notasFiscais.pendentes.length} pendente` : "")
  );
  linhas.push(`🏗 Na esteira: ${s.carteira.esteira} contratos em fechamento`);
  if (s.tarefas.agenda.length > 0) {
    linhas.push(`🗓 Agenda do dia (${s.tarefas.total} tarefas):`);
    for (const t of s.tarefas.agenda.slice(0, 8)) {
      const titulo = t.titulo.length > 52 ? `${t.titulo.slice(0, 52)}…` : t.titulo;
      linhas.push(`   • ${t.hora ? `${t.hora} — ` : ""}${titulo} (${t.nome})`);
    }
    if (s.tarefas.agenda.length > 8) linhas.push(`   … e mais ${s.tarefas.agenda.length - 8}`);
  }
  linhas.push(`📲 Disparos ontem: ${s.disparos.ontem}`);
  const alertas: string[] = [];
  if (s.regrasDesligadas.length > 0) alertas.push(`regras desligadas (${s.regrasDesligadas.length})`);
  if (s.entregasSemResp > 0) alertas.push(`${s.entregasSemResp} entrega(s) sem responsável`);
  if (s.financeiro.receberVencidas.length > 0)
    alertas.push(`recebimento em atraso: ${s.financeiro.receberVencidas.map((v) => v.desc).join("; ")}`);
  linhas.push(alertas.length > 0 ? `⚠️ Atenção: ${alertas.join("; ")}` : `✅ Nenhum alerta — operação redonda`);
  return linhas.join("\n");
}
