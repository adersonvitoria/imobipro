// Motor de disparos: regras diárias (cron) e instantâneas (mudança de etapa).
import { db } from "./db";
import { addDays, brl, dayOfMonth, fmtCurto, fmtLongo, primeiroNome, spToday } from "./dates";
import { render } from "./templates";
import { enviarWhatsApp } from "./whatsapp";

type NovaMensagem = {
  regraTipo: string;
  regraNome: string;
  paraNome: string;
  paraZap: string;
  paraTipo: "INQUILINO" | "PROPRIETARIO" | "EQUIPE";
  conteudo: string;
  origem: "CRON" | "MANUAL" | "ETAPA" | "RECEPCAO";
  dedupeKey?: string;
  contratoId?: string;
  membroId?: string;
};

/** Cria a mensagem (com dedupe) e tenta enviar. Retorna true se criou. */
export async function despachar(m: NovaMensagem): Promise<boolean> {
  if (m.dedupeKey) {
    const existe = await db.mensagem.findUnique({ where: { dedupeKey: m.dedupeKey } });
    if (existe) return false;
  }
  const status = await enviarWhatsApp(m.paraZap, m.conteudo);
  try {
    await db.mensagem.create({ data: { ...m, status } });
    return true;
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") return false;
    throw e;
  }
}

/** Roda todas as regras diárias. Idempotente — pode rodar quantas vezes quiser no dia. */
export async function rodarDisparosDiarios(origem: "CRON" | "MANUAL") {
  const cfg = await db.config.findFirstOrThrow();
  const regrasArr = await db.regra.findMany();
  const regras = new Map(regrasArr.map((r) => [r.tipo, r]));

  const hoje = spToday();
  const amanha = addDays(hoje, 1);
  const d3 = addDays(hoje, 3);

  const base = {
    imobiliaria: cfg.imobiliaria,
    loja: cfg.lojaEndereco,
    horario_loja: cfg.lojaHorario,
  };

  let criadas = 0;
  let puladas = 0;

  const tenta = async (m: NovaMensagem) => {
    const criou = await despachar(m);
    if (criou) criadas++;
    else puladas++;
  };

  // 1) Entrega de chaves — dia
  const rEntregaDia = regras.get("ENTREGA_DIA");
  if (rEntregaDia?.ativo) {
    const entregas = await db.contrato.findMany({
      where: { etapa: "CHAVES_PRONTAS", entregaData: hoje },
      include: { respEntrega: true },
    });
    for (const c of entregas) {
      await tenta({
        regraTipo: rEntregaDia.tipo,
        regraNome: rEntregaDia.nome,
        paraNome: c.inquilino,
        paraZap: c.inquilinoZap,
        paraTipo: "INQUILINO",
        origem,
        contratoId: c.id,
        dedupeKey: `ENTREGA_DIA:${c.id}:${hoje}`,
        conteudo: render(rEntregaDia.template, {
          ...base,
          nome: primeiroNome(c.inquilino),
          imovel: c.imovel,
          hora: c.entregaHora ?? "10:00",
          responsavel: c.respEntrega?.nome ?? "nossa equipe",
        }),
      });
    }
  }

  // 2) Entrega de chaves — véspera
  const rVespera = regras.get("ENTREGA_VESPERA");
  if (rVespera?.ativo) {
    const entregas = await db.contrato.findMany({
      where: { etapa: "CHAVES_PRONTAS", entregaData: amanha },
      include: { respEntrega: true },
    });
    for (const c of entregas) {
      await tenta({
        regraTipo: rVespera.tipo,
        regraNome: rVespera.nome,
        paraNome: c.inquilino,
        paraZap: c.inquilinoZap,
        paraTipo: "INQUILINO",
        origem,
        contratoId: c.id,
        dedupeKey: `ENTREGA_VESPERA:${c.id}:${hoje}`,
        conteudo: render(rVespera.template, {
          ...base,
          nome: primeiroNome(c.inquilino),
          imovel: c.imovel,
          data: fmtCurto(amanha),
          hora: c.entregaHora ?? "10:00",
          responsavel: c.respEntrega?.nome ?? "nossa equipe",
        }),
      });
    }
  }

  // 3) Lembrete de vistoria (véspera)
  const rVistoria = regras.get("VISTORIA_LEMBRETE");
  if (rVistoria?.ativo) {
    const vistorias = await db.contrato.findMany({
      where: { etapa: "VISTORIA", vistoriaData: amanha },
    });
    for (const c of vistorias) {
      await tenta({
        regraTipo: rVistoria.tipo,
        regraNome: rVistoria.nome,
        paraNome: c.inquilino,
        paraZap: c.inquilinoZap,
        paraTipo: "INQUILINO",
        origem,
        contratoId: c.id,
        dedupeKey: `VISTORIA_LEMBRETE:${c.id}:${hoje}`,
        conteudo: render(rVistoria.template, {
          ...base,
          nome: primeiroNome(c.inquilino),
          imovel: c.imovel,
          data: fmtCurto(amanha),
          hora: c.vistoriaHora ?? "14:00",
        }),
      });
    }
  }

  // 4) Boleto — 3 dias antes do vencimento
  const rBoleto = regras.get("BOLETO_D3");
  if (rBoleto?.ativo) {
    const ativos = await db.contrato.findMany({
      where: { etapa: "ATIVO", diaVencimento: dayOfMonth(d3) },
    });
    for (const c of ativos) {
      await tenta({
        regraTipo: rBoleto.tipo,
        regraNome: rBoleto.nome,
        paraNome: c.inquilino,
        paraZap: c.inquilinoZap,
        paraTipo: "INQUILINO",
        origem,
        contratoId: c.id,
        dedupeKey: `BOLETO_D3:${c.id}:${hoje}`,
        conteudo: render(rBoleto.template, {
          ...base,
          nome: primeiroNome(c.inquilino),
          imovel: c.imovel,
          vencimento: fmtCurto(d3),
          valor: brl(c.valor),
        }),
      });
    }
  }

  // 5) Repasse ao proprietário (dia fixo do mês)
  const rRepasse = regras.get("REPASSE_PROPRIETARIO");
  if (rRepasse?.ativo && dayOfMonth(hoje) === cfg.diaRepasse) {
    const ativos = await db.contrato.findMany({ where: { etapa: "ATIVO" } });
    for (const c of ativos) {
      await tenta({
        regraTipo: rRepasse.tipo,
        regraNome: rRepasse.nome,
        paraNome: c.proprietario,
        paraZap: c.proprietarioZap,
        paraTipo: "PROPRIETARIO",
        origem,
        contratoId: c.id,
        dedupeKey: `REPASSE:${c.id}:${hoje.slice(0, 7)}`,
        conteudo: render(rRepasse.template, {
          ...base,
          proprietario: primeiroNome(c.proprietario),
          imovel: c.imovel,
        }),
      });
    }
  }

  // 6) Agenda do dia para cada membro da equipe
  const rAgenda = regras.get("AGENDA_EQUIPE");
  if (rAgenda?.ativo) {
    const tarefas = await db.tarefa.findMany({
      where: { data: hoje, concluida: false },
      include: { responsavel: true },
      orderBy: { hora: "asc" },
    });
    const porMembro = new Map<string, typeof tarefas>();
    for (const t of tarefas) {
      const lista = porMembro.get(t.responsavelId) ?? [];
      lista.push(t);
      porMembro.set(t.responsavelId, lista);
    }
    for (const [membroId, lista] of porMembro) {
      const membro = lista[0].responsavel;
      const linhas = lista
        .map((t) => `• ${t.hora ? `${t.hora} — ` : ""}${t.titulo}`)
        .join("\n");
      await tenta({
        regraTipo: rAgenda.tipo,
        regraNome: rAgenda.nome,
        paraNome: membro.nome,
        paraZap: membro.whatsapp,
        paraTipo: "EQUIPE",
        origem,
        membroId,
        dedupeKey: `AGENDA:${membroId}:${hoje}`,
        conteudo: render(rAgenda.template, {
          ...base,
          nome: primeiroNome(membro.nome),
          data: fmtLongo(hoje),
          lista: linhas,
        }),
      });
    }
  }

  return { criadas, puladas };
}

/** Dispara as mensagens instantâneas de uma mudança de etapa */
export async function dispararEtapa(contratoId: string, etapa: string) {
  const cfg = await db.config.findFirstOrThrow();
  const c = await db.contrato.findUniqueOrThrow({
    where: { id: contratoId },
    include: { respEntrega: true, corretor: true },
  });

  const base = {
    imobiliaria: cfg.imobiliaria,
    loja: cfg.lojaEndereco,
    horario_loja: cfg.lojaHorario,
    nome: primeiroNome(c.inquilino),
    proprietario: primeiroNome(c.proprietario),
    imovel: c.imovel,
    corretor: c.corretor?.nome ?? "nossa equipe",
    responsavel: c.respEntrega?.nome ?? "nossa equipe",
    data: c.entregaData ? fmtCurto(c.entregaData) : "",
    hora: c.entregaHora ?? "",
    repasse: `dia ${cfg.diaRepasse}`,
  };

  const mapa: Record<string, { tipos: string[] }> = {
    FICHA_APROVADA: { tipos: ["ETAPA_FICHA"] },
    CONTRATO_ASSINADO: { tipos: ["ETAPA_CONTRATO"] },
    VISTORIA: { tipos: ["ETAPA_VISTORIA"] },
    CHAVES_PRONTAS: { tipos: ["ETAPA_CHAVES_PRONTAS"] },
    ATIVO: { tipos: ["ETAPA_ATIVO", "ETAPA_ATIVO_PROP"] },
    DESOCUPACAO: { tipos: ["ETAPA_DESOCUPACAO"] },
  };

  const tipos = mapa[etapa]?.tipos ?? [];
  const disparadas: string[] = [];

  for (const tipo of tipos) {
    const regra = await db.regra.findUnique({ where: { tipo } });
    if (!regra?.ativo) continue;

    const paraProprietario = regra.destino === "PROPRIETARIO";
    const vars = { ...base };
    if (tipo === "ETAPA_VISTORIA") {
      vars.data = c.vistoriaData ? fmtCurto(c.vistoriaData) : "em breve";
      vars.hora = c.vistoriaHora ?? "14:00";
    }

    const criou = await despachar({
      regraTipo: regra.tipo,
      regraNome: regra.nome,
      paraNome: paraProprietario ? c.proprietario : c.inquilino,
      paraZap: paraProprietario ? c.proprietarioZap : c.inquilinoZap,
      paraTipo: paraProprietario ? "PROPRIETARIO" : "INQUILINO",
      origem: "ETAPA",
      contratoId: c.id,
      dedupeKey: `${tipo}:${c.id}`,
      conteudo: render(regra.template, vars),
    });
    if (criou) disparadas.push(paraProprietario ? c.proprietario : c.inquilino);
  }

  return disparadas;
}
