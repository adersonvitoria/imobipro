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
  FICHA_APROVADA: "ASSINATURA",
  ASSINATURA: "CONTRATO_ASSINADO",
  CONTRATO_ASSINADO: "VISTORIA",
  VISTORIA: "CHAVES_PRONTAS",
  CHAVES_PRONTAS: "ATIVO",
};

const ROTULO: Record<string, string> = {
  FICHA_APROVADA: "Ficha aprovada",
  ASSINATURA: "Contrato p/ assinatura",
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

  const adm = await db.membro.findFirst({ where: { papel: "VISTORIA", ativo: true } });
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

/** Ficha digital completa: valida tudo, cria contrato + pasta de documentos e gera o texto do contrato */
export async function gerarContrato(d: import("@/lib/validar").FichaDados) {
  const { validarCPF, validarEmail, validarTelefone, maiorDe18 } = await import("@/lib/validar");
  const { fmtCurto, spToday, primeiroNome } = await import("@/lib/dates");

  // revalidação essencial no servidor
  const erros: string[] = [];
  if (!d.locNome.trim() || !d.propNome.trim()) erros.push("nomes obrigatórios");
  if (!validarCPF(d.locCpf) || !validarCPF(d.propCpf)) erros.push("CPF inválido");
  if (!validarEmail(d.locEmail) || !validarEmail(d.propEmail)) erros.push("e-mail inválido");
  if (!validarTelefone(d.locTelefone) || !validarTelefone(d.propTelefone)) erros.push("telefone inválido");
  if (!maiorDe18(d.locNascimento) || !maiorDe18(d.propNascimento)) erros.push("data de nascimento inválida");
  if (!d.matricula.trim() || !d.docs.matricula || !d.docs.iptu || !d.docs.luz) erros.push("documentos do imóvel");
  if (d.recebimento === "PIX" && !d.pixChave.trim()) erros.push("chave PIX");
  if (d.recebimento === "TRANSFERENCIA" && (!d.banco.trim() || !d.agencia.trim() || !d.conta.trim()))
    erros.push("dados bancários");
  if (erros.length > 0) return { ok: false as const, erros };

  const cfg = await db.config.findFirstOrThrow();
  const total = await db.contrato.count();
  const codigo = `VB-${1053 + total}`;
  const corretor = await db.membro.findFirst({ where: { papel: "CORRETOR", ativo: true } });

  const contrato = await db.contrato.create({
    data: {
      codigo,
      etapa: "FICHA_APROVADA",
      imovel: d.imovelEndereco,
      endereco: d.imovelEndereco,
      bairro: d.imovelBairro || "Centro",
      valor: Math.max(1, Math.round(d.valor)),
      diaVencimento: d.diaVencimento || 10,
      inquilino: d.locNome.trim(),
      inquilinoZap: d.locTelefone,
      proprietario: d.propNome.trim(),
      proprietarioZap: d.propTelefone,
      corretorId: corretor?.id ?? null,
    },
  });

  await db.ficha.create({
    data: {
      contratoId: contrato.id,
      locNome: d.locNome, locCpf: d.locCpf, locRg: d.locRg, locNascimento: d.locNascimento,
      locTelefone: d.locTelefone, locEmail: d.locEmail, locEstadoCivil: d.locEstadoCivil,
      locProfissao: d.locProfissao, locEndereco: d.locEndereco,
      propNome: d.propNome, propCpf: d.propCpf, propRg: d.propRg, propNascimento: d.propNascimento,
      propTelefone: d.propTelefone, propEmail: d.propEmail, propEstadoCivil: d.propEstadoCivil,
      propProfissao: d.propProfissao, propEndereco: d.propEndereco,
      recebimento: d.recebimento, pixChave: d.pixChave || null,
      banco: d.banco || null, agencia: d.agencia || null, conta: d.conta || null,
      imovelEndereco: d.imovelEndereco, imovelBairro: d.imovelBairro,
      valor: Math.round(d.valor), diaVencimento: d.diaVencimento,
      matricula: d.matricula, temCondominio: d.temCondominio,
      condominioValor: d.temCondominio ? Math.round(d.condominioValor || 0) : null,
    },
  });

  const documentos: { pessoa: string; pessoaZap: string; tipoPessoa: string; tipo: string; rotulo: string; arquivo: string }[] = [
    { pessoa: d.locNome, pessoaZap: d.locTelefone, tipoPessoa: "INQUILINO", tipo: "RG_CNH", rotulo: "RG ou CNH", arquivo: d.docs.locRg },
    { pessoa: d.locNome, pessoaZap: d.locTelefone, tipoPessoa: "INQUILINO", tipo: "COMP_RESIDENCIA", rotulo: "Comprovante de residência", arquivo: d.docs.locResidencia },
    { pessoa: d.propNome, pessoaZap: d.propTelefone, tipoPessoa: "PROPRIETARIO", tipo: "RG_CNH", rotulo: "RG ou CNH", arquivo: d.docs.propRg },
    { pessoa: d.propNome, pessoaZap: d.propTelefone, tipoPessoa: "PROPRIETARIO", tipo: "COMP_RESIDENCIA", rotulo: "Comprovante de residência", arquivo: d.docs.propResidencia },
    { pessoa: d.propNome, pessoaZap: d.propTelefone, tipoPessoa: "PROPRIETARIO", tipo: "MATRICULA", rotulo: "Matrícula do imóvel", arquivo: d.docs.matricula },
    { pessoa: d.propNome, pessoaZap: d.propTelefone, tipoPessoa: "PROPRIETARIO", tipo: "IPTU", rotulo: "IPTU do imóvel", arquivo: d.docs.iptu },
    { pessoa: d.propNome, pessoaZap: d.propTelefone, tipoPessoa: "PROPRIETARIO", tipo: "CONTA_LUZ", rotulo: "Conta de luz (p/ transferência de titularidade)", arquivo: d.docs.luz },
  ];
  if (d.temCondominio && d.docs.condominio) {
    documentos.push({
      pessoa: d.propNome, pessoaZap: d.propTelefone, tipoPessoa: "PROPRIETARIO",
      tipo: "CONDOMINIO", rotulo: "Boleto do condomínio", arquivo: d.docs.condominio,
    });
  }
  for (const doc of documentos) {
    await db.documento.create({
      data: { ...doc, status: "RECEBIDO", recebidoEm: new Date(), contratoId: contrato.id },
    });
  }

  await db.evento.create({
    data: { contratoId: contrato.id, titulo: "Ficha digital validada — contrato gerado automaticamente" },
  });
  const paola = await db.membro.findFirst({ where: { papel: "CONTRATOS", ativo: true } });
  if (paola) {
    await db.tarefa.create({
      data: {
        titulo: `Conferir contrato gerado — ${d.locNome} (${codigo})`,
        tipo: "OUTRO",
        data: spToday(),
        responsavelId: paola.id,
        contratoId: contrato.id,
      },
    });
  }

  const disparadas = await dispararEtapa(contrato.id, "FICHA_APROVADA");

  // ---- texto do contrato -------------------------------------------------
  const hoje = new Date();
  const dataExtenso = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(hoje);
  const brlFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
  const pagamento =
    d.recebimento === "PIX"
      ? `via PIX (chave: ${d.pixChave})`
      : `via transferência bancária (banco ${d.banco}, agência ${d.agencia}, conta ${d.conta})`;

  const contratoTexto = `CONTRATO DE LOCAÇÃO RESIDENCIAL — ${codigo}

LOCADOR(A): ${d.propNome}, ${d.propEstadoCivil.toLowerCase()}, ${d.propProfissao.toLowerCase()}, portador(a) do RG nº ${d.propRg} e CPF nº ${d.propCpf}, nascido(a) em ${fmtCurto(d.propNascimento)}/${d.propNascimento.slice(0, 4)}, residente e domiciliado(a) em ${d.propEndereco}, telefone ${d.propTelefone}, e-mail ${d.propEmail}.

LOCATÁRIO(A): ${d.locNome}, ${d.locEstadoCivil.toLowerCase()}, ${d.locProfissao.toLowerCase()}, portador(a) do RG nº ${d.locRg} e CPF nº ${d.locCpf}, nascido(a) em ${fmtCurto(d.locNascimento)}/${d.locNascimento.slice(0, 4)}, residente e domiciliado(a) em ${d.locEndereco}, telefone ${d.locTelefone}, e-mail ${d.locEmail}.

ADMINISTRADORA: VeraBrokers Imóveis Ltda, com sede na ${cfg.lojaEndereco}.

CLÁUSULA 1ª — DO OBJETO. Locação do imóvel situado em ${d.imovelEndereco}, bairro ${d.imovelBairro}, Gravataí/RS, matrícula nº ${d.matricula}, conforme documentação anexa (matrícula, IPTU e conta de luz).

CLÁUSULA 2ª — DO PRAZO. O prazo da locação é de 30 (trinta) meses, iniciando-se na data de entrega das chaves.

CLÁUSULA 3ª — DO ALUGUEL. O aluguel mensal é de ${brlFmt(d.valor)}, com vencimento todo dia ${d.diaVencimento} de cada mês.${
    d.temCondominio && d.condominioValor
      ? ` O condomínio, no valor aproximado de ${brlFmt(d.condominioValor)}, é de responsabilidade do(a) LOCATÁRIO(A).`
      : ""
  }

CLÁUSULA 4ª — DO REPASSE. O repasse ao LOCADOR(A) será realizado pela ADMINISTRADORA ${pagamento}, até o 5º dia útil após a compensação do aluguel.

CLÁUSULA 5ª — DA GARANTIA. A presente locação é garantida por SEGURO-FIANÇA contratado junto a seguradora parceira, nos termos da Lei 8.245/91.

CLÁUSULA 6ª — DA TITULARIDADE DA ENERGIA. O(A) LOCATÁRIO(A) obriga-se a transferir a titularidade da conta de energia elétrica do imóvel para o seu nome em até 30 dias da entrega das chaves, conforme fatura anexa.

CLÁUSULA 7ª — DO IPTU. O IPTU do imóvel, conforme guia anexa, será pago pelo(a) LOCATÁRIO(A) de forma mensal junto ao aluguel.

CLÁUSULA 8ª — DO FORO. Fica eleito o foro da Comarca de Gravataí/RS.

Gravataí, ${dataExtenso}.

_______________________________          _______________________________
${d.propNome}                            ${d.locNome}
LOCADOR(A)                               LOCATÁRIO(A)

_______________________________
VeraBrokers Imóveis Ltda — Administradora
Revisão jurídica: Fábio Antunes`;

  revalidarTudo();
  return {
    ok: true as const,
    codigo,
    contratoTexto,
    disparadas,
    aviso: `${primeiroNome(d.locNome)} recebeu o WhatsApp de boas-vindas e a Paola recebeu a tarefa de conferência.`,
  };
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
  desocupacao: { papel: "VISTORIA", rotulo: "Desocupação" },
  repasse: { papel: "FINANCEIRO", rotulo: "Repasse ao proprietário" },
  chaves: { papel: "ADMINISTRATIVO", rotulo: "Entrega de chaves" },
  contrato: { papel: "CONTRATOS", rotulo: "Contratos e assinaturas" },
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
    conteudo: `📥 Novo chamado direcionado para você:\n\n*${alvo.rotulo}* — ${resumo}\nCliente: ${nomeCliente}\n\nAberto pela recepção automática VeraBrokers.`,
  });

  revalidarTudo();
  return { ok: true, responsavel: membro.nome };
}

/** Pasta digital: marca documento como recebido/aprovado e confirma no WhatsApp */
export async function marcarDocumento(id: string, status: "PENDENTE" | "RECEBIDO" | "APROVADO") {
  const { primeiroNome } = await import("@/lib/dates");
  const { render } = await import("@/lib/templates");

  const doc = await db.documento.findUniqueOrThrow({ where: { id } });
  const arquivo =
    status === "PENDENTE"
      ? null
      : doc.arquivo ?? `${doc.tipo.toLowerCase().replace(/_/g, "-")}-${primeiroNome(doc.pessoa).toLowerCase()}.jpg`;

  await db.documento.update({
    where: { id },
    data: { status, arquivo, recebidoEm: status === "PENDENTE" ? null : doc.recebidoEm ?? new Date() },
  });

  let confirmada = false;
  if (status === "RECEBIDO") {
    const regra = await db.regra.findUnique({ where: { tipo: "DOC_CONFIRMACAO" } });
    if (regra?.ativo) {
      const cfg = await db.config.findFirstOrThrow();
      const aindaFaltam = await db.documento.findMany({
        where: { pessoa: doc.pessoa, status: "PENDENTE", id: { not: id } },
      });
      const faltantes =
        aindaFaltam.length > 0
          ? `\n\nAinda falta(m): *${aindaFaltam.map((f) => f.rotulo).join(", ")}* — pode mandar na sequência!`
          : ` Sua documentação está *completa* — seguimos para a próxima etapa! 🎉`;
      confirmada = await despachar({
        regraTipo: regra.tipo,
        regraNome: regra.nome,
        paraNome: doc.pessoa,
        paraZap: doc.pessoaZap,
        paraTipo: doc.tipoPessoa === "PROPRIETARIO" ? "PROPRIETARIO" : "INQUILINO",
        origem: "MANUAL",
        contratoId: doc.contratoId ?? undefined,
        dedupeKey: `DOC_CONF:${id}`,
        conteudo: render(regra.template, {
          nome: primeiroNome(doc.pessoa),
          documento: doc.rotulo,
          faltantes,
          imobiliaria: cfg.imobiliaria,
        }),
      });
    }
  }

  revalidarTudo();
  return { ok: true, confirmada };
}

/** Pasta digital: dispara agora a cobrança dos documentos pendentes de uma pessoa */
export async function cobrarDocumentos(pessoa: string) {
  const { spToday, primeiroNome } = await import("@/lib/dates");
  const { render } = await import("@/lib/templates");

  const lista = await db.documento.findMany({
    where: { pessoa, status: "PENDENTE" },
    include: { contrato: true },
  });
  if (lista.length === 0) return { ok: false, criadas: 0 };

  const regra = await db.regra.findUnique({ where: { tipo: "DOC_PENDENTE" } });
  if (!regra?.ativo) return { ok: false, criadas: 0 };

  const cfg = await db.config.findFirstOrThrow();
  const chave = pessoa.toLowerCase().replace(/\s+/g, "-");
  const criou = await despachar({
    regraTipo: regra.tipo,
    regraNome: regra.nome,
    paraNome: pessoa,
    paraZap: lista[0].pessoaZap,
    paraTipo: lista[0].tipoPessoa === "PROPRIETARIO" ? "PROPRIETARIO" : "INQUILINO",
    origem: "MANUAL",
    contratoId: lista[0].contratoId ?? undefined,
    dedupeKey: `DOC_MANUAL:${chave}:${spToday()}`,
    conteudo: render(regra.template, {
      imobiliaria: cfg.imobiliaria,
      loja: cfg.lojaEndereco,
      horario_loja: cfg.lojaHorario,
      nome: primeiroNome(pessoa),
      imovel: lista[0].contrato?.imovel ?? "seu contrato",
      lista: lista.map((d) => `  • ${d.rotulo}`).join("\n"),
    }),
  });

  revalidarTudo();
  return { ok: true, criadas: criou ? 1 : 0 };
}

const SINISTRO_ROTULO: Record<string, string> = {
  ABERTO: "aberto na seguradora",
  EM_ANALISE: "em análise",
  DEFERIDO: "deferido — pagamento programado",
  PAGO: "pago",
};

/** Recepção IA: consulta o status do sinistro de seguro-fiança e avisa o proprietário */
export async function consultarSinistro(nomeCliente: string) {
  const s = await db.sinistro.findFirst({
    where: { status: { in: ["ABERTO", "EM_ANALISE", "DEFERIDO"] } },
    orderBy: { abertoEm: "desc" },
  });
  if (!s) return { ok: false as const };

  const { spToday, primeiroNome } = await import("@/lib/dates");
  const { render } = await import("@/lib/templates");
  const cfg = await db.config.findFirstOrThrow();
  const regra = await db.regra.findUnique({ where: { tipo: "SINISTRO_STATUS" } });
  const seguradora = s.seguradora === "LOFT" ? "Loft" : "Porto Seguro";
  const statusRotulo = SINISTRO_ROTULO[s.status] ?? s.status;
  const dias = Math.max(0, Math.round((Date.now() - s.abertoEm.getTime()) / 86400000));

  if (regra?.ativo) {
    await despachar({
      regraTipo: regra.tipo,
      regraNome: regra.nome,
      paraNome: s.proprietario,
      paraZap: s.proprietarioZap,
      paraTipo: "PROPRIETARIO",
      origem: "RECEPCAO",
      dedupeKey: `SINISTRO_STATUS:${s.id}:${spToday()}`,
      conteudo: render(regra.template, {
        proprietario: primeiroNome(s.proprietario),
        imovel: s.imovel,
        seguradora,
        protocolo: s.protocolo,
        status: statusRotulo,
        previsao: `até ${s.previsaoDias} dias`,
        imobiliaria: cfg.imobiliaria,
      }),
    });
  }

  revalidarTudo();
  return {
    ok: true as const,
    imovel: s.imovel,
    proprietario: s.proprietario,
    seguradora,
    protocolo: s.protocolo,
    status: statusRotulo,
    previsaoDias: s.previsaoDias,
    dias,
  };
}

const COBRANCA_ROTULO: Record<string, string> = {
  COBRANCA_INICIADA: "cobrança iniciada",
  AVISO_FORMAL: "aviso formal enviado",
  NEGOCIACAO: "em negociação com o inquilino",
  JURIDICO: "encaminhada ao jurídico",
  REGULARIZADO: "regularizada",
};

/** Recepção IA: consulta a cobrança em andamento e avisa o proprietário */
export async function consultarCobranca() {
  const c = await db.cobranca.findFirst({
    where: { status: { not: "REGULARIZADO" } },
    orderBy: { iniciadaEm: "desc" },
  });
  if (!c) return { ok: false as const };

  const { spToday, primeiroNome, fmtCurto, brl } = await import("@/lib/dates");
  const { render } = await import("@/lib/templates");
  const cfg = await db.config.findFirstOrThrow();
  const regra = await db.regra.findUnique({ where: { tipo: "COBRANCA_STATUS" } });
  const statusRotulo = COBRANCA_ROTULO[c.status] ?? c.status;
  const previsao = c.previsaoPagamento ? `até ${fmtCurto(c.previsaoPagamento)}` : "em definição";

  if (regra?.ativo) {
    await despachar({
      regraTipo: regra.tipo,
      regraNome: regra.nome,
      paraNome: c.proprietario,
      paraZap: c.proprietarioZap,
      paraTipo: "PROPRIETARIO",
      origem: "RECEPCAO",
      dedupeKey: `COBRANCA_STATUS:${c.id}:${spToday()}`,
      conteudo: render(regra.template, {
        proprietario: primeiroNome(c.proprietario),
        imovel: c.imovel,
        status: statusRotulo,
        valor: brl(c.valor),
        previsao,
        imobiliaria: cfg.imobiliaria,
      }),
    });
  }

  revalidarTudo();
  return {
    ok: true as const,
    imovel: c.imovel,
    inquilino: c.inquilino,
    status: statusRotulo,
    valor: c.valor,
    previsao,
  };
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
