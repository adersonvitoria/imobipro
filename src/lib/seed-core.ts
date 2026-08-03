// Seed de demonstração — VeraBrokers, Gravataí/RS.
// Reutilizado pelo `npm run db:seed` e pelo botão "Reiniciar demonstração".
import type { PrismaClient } from "@prisma/client";
import { addDays, dayOfMonth, spInstant, spToday } from "./dates";

export async function seedDemo(db: PrismaClient) {
  const hoje = spToday();
  const amanha = addDays(hoje, 1);

  // limpa tudo (ordem respeita FKs)
  await db.mensagem.deleteMany();
  await db.evento.deleteMany();
  await db.tarefa.deleteMany();
  await db.contrato.deleteMany();
  await db.regra.deleteMany();
  await db.membro.deleteMany();
  await db.config.deleteMany();

  await db.config.create({
    data: {
      id: 1,
      imobiliaria: "VeraBrokers",
      lojaEndereco: "Rua Osvaldo Aranha, 1305 · sala 702 · Centro, Gravataí",
      lojaHorario: "seg a sex, 9h às 18h",
      whatsappLoja: "51 3600-0000",
      diaRepasse: dayOfMonth(hoje), // demo: repasse cai sempre "hoje"
    },
  });

  // ---- Equipe -------------------------------------------------------------
  const [gustavo, eduardo, marilice, roberta, diego, daiane] = await Promise.all(
    [
      { nome: "Gustavo Farias", papel: "CORRETOR", whatsapp: "51 98411-2233", cor: "#f473b8" },
      { nome: "Eduardo Ramos", papel: "CORRETOR", whatsapp: "51 98122-7788", cor: "#ed1e8f" },
      { nome: "Marilice Souza", papel: "ADMINISTRATIVO", whatsapp: "51 99633-4455", cor: "#9ec3d8" },
      { nome: "Roberta Lima", papel: "FINANCEIRO", whatsapp: "51 98455-1122", cor: "#c9a0c6" },
      { nome: "Diego Martins", papel: "VISTORIA", whatsapp: "51 99711-9900", cor: "#8fca9f" },
      { nome: "Daiane Santanna", papel: "GESTAO", whatsapp: "51 99988-0011", cor: "#e0a98f" },
    ].map((m) => db.membro.create({ data: m }))
  );

  // ---- Regras da régua ----------------------------------------------------
  const regras: {
    tipo: string; grupo: string; nome: string; descricao: string; destino: string;
    hora?: string; template: string; ordem: number;
  }[] = [
    {
      tipo: "AGENDA_EQUIPE", grupo: "DIARIO", ordem: 1, hora: "07:30", destino: "EQUIPE",
      nome: "Agenda do dia para a equipe",
      descricao: "Cada membro recebe sua lista de tarefas do dia — ninguém precisa lembrar ninguém.",
      template:
        "☀️ {{nome}}, bom dia! Sua agenda de hoje ({{data}}):\n\n{{lista}}\n\nQualquer mudança, o sistema te avisa por aqui. — {{imobiliaria}}",
    },
    {
      tipo: "ENTREGA_VESPERA", grupo: "DIARIO", ordem: 2, hora: "08:00", destino: "INQUILINO",
      nome: "Entrega de chaves — véspera",
      descricao: "Lembra o inquilino um dia antes: data, hora, local e com quem retirar.",
      template:
        "Oi {{nome}}! 🔑 Amanhã ({{data}}) suas chaves do imóvel *{{imovel}}* estarão disponíveis para retirada com *{{responsavel}}*, às {{hora}}, na {{loja}}. Traga documento com foto. Até amanhã!",
    },
    {
      tipo: "ENTREGA_DIA", grupo: "DIARIO", ordem: 3, hora: "08:00", destino: "INQUILINO",
      nome: "Entrega de chaves — dia",
      descricao: "No dia da entrega o inquilino recebe hora, local e responsável. Ninguém mais cobra o corretor.",
      template:
        "Chegou o grande dia, {{nome}}! 🏠✨ Suas chaves do imóvel *{{imovel}}* já estão separadas. Retirada *hoje às {{hora}}* com *{{responsavel}}* — {{loja}} ({{horario_loja}}). Bem-vindo(a) ao seu novo lar!",
    },
    {
      tipo: "VISTORIA_LEMBRETE", grupo: "DIARIO", ordem: 4, hora: "08:00", destino: "INQUILINO",
      nome: "Lembrete de vistoria",
      descricao: "Véspera da vistoria de entrada: data e hora, sem ninguém precisar ligar.",
      template:
        "Oi {{nome}}! 📋 Lembrete: a vistoria de entrada do imóvel *{{imovel}}* acontece amanhã ({{data}}) às {{hora}}. Não é obrigatório acompanhar, mas você é bem-vindo(a).",
    },
    {
      tipo: "BOLETO_D3", grupo: "DIARIO", ordem: 5, hora: "08:00", destino: "INQUILINO",
      nome: "Boleto — 3 dias antes do vencimento",
      descricao: "Reduz inadimplência e corta o “me manda o boleto?” do administrativo.",
      template:
        "Oi {{nome}}! 💳 Seu aluguel do imóvel *{{imovel}}* ({{valor}}) vence dia {{vencimento}}. Quer a 2ª via do boleto? Responda *BOLETO* que enviamos na hora.",
    },
    {
      tipo: "REPASSE_PROPRIETARIO", grupo: "DIARIO", ordem: 6, hora: "08:00", destino: "PROPRIETARIO",
      nome: "Repasse ao proprietário",
      descricao: "O cliente mais importante recebe o aviso de repasse sem precisar perguntar.",
      template:
        "Olá {{proprietario}}! 💰 Seu repasse do imóvel *{{imovel}}* foi processado hoje e cai em conta em até 1 dia útil. Extrato disponível na {{imobiliaria}}. Obrigado pela parceria!",
    },
    {
      tipo: "ETAPA_FICHA", grupo: "INSTANTANEO", ordem: 7, destino: "INQUILINO",
      nome: "Ficha aprovada",
      descricao: "Dispara na hora em que a ficha é aprovada no sistema.",
      template:
        "Oi {{nome}}, ótima notícia! 🎉 Sua ficha para o imóvel *{{imovel}}* foi *APROVADA*! Seu corretor {{corretor}} e a equipe {{imobiliaria}} já estão preparando seu contrato. Vamos te avisando de cada etapa por aqui — sem precisar ligar.",
    },
    {
      tipo: "ETAPA_CONTRATO", grupo: "INSTANTANEO", ordem: 8, destino: "INQUILINO",
      nome: "Contrato assinado",
      descricao: "Confirmação instantânea da assinatura.",
      template:
        "Oi {{nome}}! ✍️ Contrato do imóvel *{{imovel}}* assinado com sucesso. Próxima etapa: vistoria de entrada — te avisamos assim que estiver agendada.",
    },
    {
      tipo: "ETAPA_VISTORIA", grupo: "INSTANTANEO", ordem: 9, destino: "INQUILINO",
      nome: "Vistoria agendada",
      descricao: "Avisa data e hora da vistoria assim que agendada.",
      template:
        "Oi {{nome}}! 📋 A vistoria de entrada do imóvel *{{imovel}}* foi agendada para {{data}} às {{hora}}. Depois dela, suas chaves entram em preparação. Falta pouco! 🏠",
    },
    {
      tipo: "ETAPA_CHAVES_PRONTAS", grupo: "INSTANTANEO", ordem: 10, destino: "INQUILINO",
      nome: "Chaves em preparação",
      descricao: "Chaves prontas: já marca dia, hora e responsável pela entrega.",
      template:
        "Boa notícia, {{nome}}! 🔑 As chaves do imóvel *{{imovel}}* estão prontas! Entrega marcada: *{{data}} às {{hora}}*, com *{{responsavel}}*, na {{loja}}. Você receberá um lembrete na véspera.",
    },
    {
      tipo: "ETAPA_ATIVO", grupo: "INSTANTANEO", ordem: 11, destino: "INQUILINO",
      nome: "Boas-vindas ao novo lar",
      descricao: "Chaves entregues: boas-vindas + canais de atendimento no mesmo contato.",
      template:
        "{{nome}}, chaves entregues! 🏠✨ Seja muito bem-vindo(a) ao seu novo lar. Guarde este contato: por aqui você pede *2ª via de boleto*, *manutenção* e fala com o *financeiro* — resposta rápida, sem telefone. — {{imobiliaria}}",
    },
    {
      tipo: "ETAPA_ATIVO_PROP", grupo: "INSTANTANEO", ordem: 12, destino: "PROPRIETARIO",
      nome: "Imóvel ocupado — aviso ao proprietário",
      descricao: "Proprietário sabe na hora que o imóvel foi entregue e quando recebe.",
      template:
        "Olá {{proprietario}}! ✅ Seu imóvel *{{imovel}}* foi entregue hoje ao inquilino {{nome}}. Contrato ativo — seu repasse acontece todo *{{repasse}}*. Você será avisado(a) de cada movimentação por aqui.",
    },
    {
      tipo: "ETAPA_DESOCUPACAO", grupo: "INSTANTANEO", ordem: 13, destino: "PROPRIETARIO",
      nome: "Desocupação iniciada",
      descricao: "Proprietário acompanha cada etapa da desocupação sem precisar cobrar.",
      template:
        "Olá {{proprietario}}. Iniciamos hoje o processo de desocupação do imóvel *{{imovel}}*. Você receberá atualização de *cada etapa*: vistoria de saída, eventuais reparos e reanúncio. Pode ficar tranquilo(a) — a {{imobiliaria}} cuida de tudo. 🤝",
    },
  ];
  for (const r of regras) await db.regra.create({ data: r });

  // ---- Contratos ----------------------------------------------------------
  const zap = (n: number) => `51 98${String(100 + n).slice(0, 3)}-${String(1000 + n * 37).slice(0, 4)}`;

  const cAmanha = [
    { codigo: "VB-1041", inquilino: "Camila Ferreira", imovel: "Apto 302 · Ed. Solar das Acácias", endereco: "Rua Anita Garibaldi, 210", bairro: "Centro", valor: 1650, proprietario: "Sr. Nelson Brum", hora: "09:00", resp: marilice.id, corretor: gustavo.id },
    { codigo: "VB-1038", inquilino: "João Pedro Alves", imovel: "Casa 2 dorm · Vera Cruz", endereco: "Rua das Hortênsias, 87", bairro: "Vera Cruz", valor: 1400, proprietario: "Dona Teresinha Fam", hora: "10:00", resp: marilice.id, corretor: eduardo.id },
    { codigo: "VB-1044", inquilino: "Larissa Prates", imovel: "Apto 204 · Res. Morada do Sol", endereco: "Av. Centenário, 1543", bairro: "Morada Gaúcha", valor: 1250, proprietario: "Sr. Otávio Ritter", hora: "11:00", resp: diego.id, corretor: gustavo.id },
    { codigo: "VB-1046", inquilino: "Vagner Souza", imovel: "Sobrado 3 dorm · Dom Feliciano", endereco: "Rua Caxias do Sul, 402", bairro: "Dom Feliciano", valor: 1980, proprietario: "Sra. Ivone Castilhos", hora: "14:00", resp: marilice.id, corretor: eduardo.id },
    { codigo: "VB-1047", inquilino: "Patrícia Dias", imovel: "Kitnet 12 · Ed. Único", endereco: "Rua Coelho Neto, 55", bairro: "Centro", valor: 890, proprietario: "Sr. Jorge Baldissera", hora: "16:00", resp: diego.id, corretor: gustavo.id },
  ];
  const contratosAmanha = [];
  for (const c of cAmanha) {
    contratosAmanha.push(
      await db.contrato.create({
        data: {
          codigo: c.codigo, etapa: "CHAVES_PRONTAS", imovel: c.imovel, endereco: c.endereco,
          bairro: c.bairro, valor: c.valor, diaVencimento: 10,
          inquilino: c.inquilino, inquilinoZap: zap(c.valor % 97),
          proprietario: c.proprietario, proprietarioZap: zap(c.valor % 53),
          corretorId: c.corretor, entregaData: amanha, entregaHora: c.hora, respEntregaId: c.resp,
        },
      })
    );
  }

  const entregaHoje1 = await db.contrato.create({
    data: {
      codigo: "VB-1035", etapa: "CHAVES_PRONTAS", imovel: "Apto 501 · Ed. Firenze", endereco: "Rua Dr. Luiz Bastos do Prado, 980", bairro: "Centro",
      valor: 1720, diaVencimento: 10, inquilino: "Henrique Ott", inquilinoZap: zap(11),
      proprietario: "Sra. Beatriz Mallmann", proprietarioZap: zap(12), corretorId: gustavo.id,
      entregaData: hoje, entregaHora: "10:30", respEntregaId: marilice.id,
    },
  });
  const entregaHoje2 = await db.contrato.create({
    data: {
      codigo: "VB-1036", etapa: "CHAVES_PRONTAS", imovel: "Casa 2 dorm · Parque dos Anjos", endereco: "Rua Ijuí, 233", bairro: "Parque dos Anjos",
      valor: 1300, diaVencimento: 10, inquilino: "Débora Nunes", inquilinoZap: zap(13),
      proprietario: "Sr. Vilson Quadros", proprietarioZap: zap(14), corretorId: eduardo.id,
      entregaData: hoje, entregaHora: "15:00", respEntregaId: diego.id,
    },
  });

  const vistoriaAmanha = await db.contrato.create({
    data: {
      codigo: "VB-1049", etapa: "VISTORIA", imovel: "Apto 303 · Res. Ipê Amarelo", endereco: "Rua São Vicente, 771", bairro: "São Vicente",
      valor: 1150, diaVencimento: 10, inquilino: "Felipe Xavier", inquilinoZap: zap(15),
      proprietario: "Sr. Loreno Kist", proprietarioZap: zap(16), corretorId: gustavo.id,
      vistoriaData: amanha, vistoriaHora: "14:00",
    },
  });

  const contratoAssinado = await db.contrato.create({
    data: {
      codigo: "VB-1050", etapa: "CONTRATO_ASSINADO", imovel: "Loja 02 · Av. Dorival C. de Oliveira", endereco: "Av. Dorival Cândido de Oliveira, 3100", bairro: "Centro",
      valor: 2600, diaVencimento: 5, inquilino: "Tainá Rocha", inquilinoZap: zap(17),
      proprietario: "Sr. Ermindo Weiss", proprietarioZap: zap(18), corretorId: eduardo.id,
    },
  });

  const ficha1 = await db.contrato.create({
    data: {
      codigo: "VB-1051", etapa: "FICHA_APROVADA", imovel: "Apto 702 · Ed. Golden Tower", endereco: "Rua José Loureiro da Silva, 1590", bairro: "Centro",
      valor: 2100, diaVencimento: 10, inquilino: "Márcio Steigleder", inquilinoZap: zap(19),
      proprietario: "Dra. Helena Fritsch", proprietarioZap: zap(20), corretorId: gustavo.id,
    },
  });
  await db.contrato.create({
    data: {
      codigo: "VB-1052", etapa: "FICHA_APROVADA", imovel: "Casa 3 dorm · Salgado Filho", endereco: "Rua Tupinambá, 412", bairro: "Salgado Filho",
      valor: 1850, diaVencimento: 15, inquilino: "Ana Beatriz Cunha", inquilinoZap: zap(21),
      proprietario: "Sr. Arno Petry", proprietarioZap: zap(22), corretorId: eduardo.id,
    },
  });

  // Ativos — 1 deles vence exatamente em 3 dias (dispara o boleto na demo)
  const ativos = [
    { codigo: "VB-0987", inquilino: "Rodrigo Malta", imovel: "Apto 405 · Ed. Lucerna", endereco: "Rua Balduíno Righi, 66", bairro: "Centro", valor: 1500, venc: dayOfMonth(addDays(hoje, 3)), proprietario: "Dona Iara Peixoto" },
    { codigo: "VB-0954", inquilino: "Simone Vargas", imovel: "Casa 2 dorm · Barnabé", endereco: "Rua Aneron Corrêa, 190", bairro: "Barnabé", valor: 1200, venc: 15, proprietario: "Sr. Adão Pereira" },
    { codigo: "VB-0921", inquilino: "Cristiano Leal", imovel: "Apto 108 · Res. Viena", endereco: "Rua Irai, 320", bairro: "COHAB A", valor: 980, venc: 20, proprietario: "Sra. Marta Winter" },
    { codigo: "VB-0899", inquilino: "Juliana Castro", imovel: "Sala 703 · Centro Empresarial", endereco: "Rua Osvaldo Aranha, 1305", bairro: "Centro", valor: 2250, venc: 27, proprietario: "Dr. Paulo Krieger" },
  ];
  for (const [i, a] of ativos.entries()) {
    await db.contrato.create({
      data: {
        codigo: a.codigo, etapa: "ATIVO", imovel: a.imovel, endereco: a.endereco, bairro: a.bairro,
        valor: a.valor, diaVencimento: a.venc, inquilino: a.inquilino, inquilinoZap: zap(30 + i),
        proprietario: a.proprietario, proprietarioZap: zap(40 + i),
        corretorId: i % 2 === 0 ? gustavo.id : eduardo.id,
      },
    });
  }

  const desocupacao = await db.contrato.create({
    data: {
      codigo: "VB-0876", etapa: "DESOCUPACAO", imovel: "Casa 2 dorm · Bom Sucesso", endereco: "Rua Carlos Barbosa, 512", bairro: "Bom Sucesso",
      valor: 1350, diaVencimento: 10, inquilino: "Diego Fontoura", inquilinoZap: zap(50),
      proprietario: "Sr. Milton Weber", proprietarioZap: zap(51), corretorId: gustavo.id,
    },
  });

  // ---- Tarefas ------------------------------------------------------------
  const tarefas: { titulo: string; tipo: string; data: string; hora?: string; responsavelId: string; contratoId?: string }[] = [
    { titulo: "Retorno de desocupação — Sr. Milton (Casa · Bom Sucesso)", tipo: "DESOCUPACAO", data: hoje, hora: "09:30", responsavelId: marilice.id, contratoId: desocupacao.id },
    { titulo: "Entrega de chaves — Henrique Ott (Apto 501 · Ed. Firenze)", tipo: "ENTREGA_CHAVE", data: hoje, hora: "10:30", responsavelId: marilice.id, contratoId: entregaHoje1.id },
    { titulo: "Entrega de chaves — Débora Nunes (Casa · Parque dos Anjos)", tipo: "ENTREGA_CHAVE", data: hoje, hora: "15:00", responsavelId: diego.id, contratoId: entregaHoje2.id },
    { titulo: "Reparo hidráulico — Apto 204 · Dom Feliciano", tipo: "REPARO", data: hoje, hora: "11:00", responsavelId: diego.id },
    { titulo: "Conferir repasses do dia e enviar comprovantes", tipo: "OUTRO", data: hoje, hora: "09:00", responsavelId: roberta.id },
    { titulo: "Visita com cliente — Casa 3 dorm · Salgado Filho", tipo: "ATENDIMENTO", data: hoje, hora: "15:30", responsavelId: gustavo.id },
    { titulo: "Fotos do imóvel novo — Sobrado · Dom Feliciano", tipo: "ATENDIMENTO", data: hoje, hora: "10:00", responsavelId: eduardo.id },
    { titulo: "Preparar kits de chaves (5 entregas do dia)", tipo: "OUTRO", data: amanha, hora: "08:30", responsavelId: marilice.id },
    { titulo: "Vistoria de entrada — Felipe Xavier (Apto 303 · Res. Ipê Amarelo)", tipo: "VISTORIA", data: amanha, hora: "14:00", responsavelId: diego.id, contratoId: vistoriaAmanha.id },
  ];
  for (const c of contratosAmanha) {
    tarefas.push({
      titulo: `Entrega de chaves — ${c.inquilino} (${c.imovel})`,
      tipo: "ENTREGA_CHAVE", data: amanha, hora: c.entregaHora ?? "10:00",
      responsavelId: c.respEntregaId!, contratoId: c.id,
    });
  }
  for (const t of tarefas) await db.tarefa.create({ data: t });

  // ---- Eventos de linha do tempo (amostra) --------------------------------
  await db.evento.create({ data: { contratoId: ficha1.id, titulo: "Ficha aprovada pelo administrativo" } });
  await db.evento.create({ data: { contratoId: contratoAssinado.id, titulo: "Contrato assinado digitalmente" } });
  await db.evento.create({ data: { contratoId: desocupacao.id, titulo: "Aviso de desocupação recebido do inquilino" } });

  // ---- Histórico de mensagens (últimos 13 dias, alimenta o gráfico) -------
  const NOMES = ["Camila Ferreira", "João Pedro Alves", "Larissa Prates", "Vagner Souza", "Patrícia Dias", "Henrique Ott", "Débora Nunes", "Felipe Xavier", "Tainá Rocha", "Márcio Steigleder", "Ana Beatriz Cunha", "Rodrigo Malta", "Simone Vargas", "Juliana Castro"];
  const PROPS = ["Sr. Nelson Brum", "Dona Iara Peixoto", "Sr. Adão Pereira", "Sra. Marta Winter", "Dr. Paulo Krieger", "Sr. Milton Weber", "Sra. Ivone Castilhos"];
  const IMOVEIS = ["Apto 302 · Ed. Solar das Acácias", "Casa 2 dorm · Vera Cruz", "Apto 204 · Res. Morada do Sol", "Kitnet 12 · Ed. Único", "Apto 405 · Ed. Lucerna", "Casa 2 dorm · Barnabé", "Sala 703 · Centro Empresarial"];
  const EQUIPE = [gustavo, eduardo, marilice, roberta, diego];

  const historico: { tipo: string; nome: string; make: (n: string, im: string, p: string) => { paraNome: string; paraTipo: string; conteudo: string } }[] = [
    { tipo: "BOLETO_D3", nome: "Boleto — 3 dias antes do vencimento", make: (n, im) => ({ paraNome: n, paraTipo: "INQUILINO", conteudo: `Oi ${n.split(" ")[0]}! 💳 Seu aluguel do imóvel *${im}* vence em 3 dias. Quer a 2ª via do boleto? Responda *BOLETO* que enviamos na hora.` }) },
    { tipo: "AGENDA_EQUIPE", nome: "Agenda do dia para a equipe", make: (_n, _im, _p) => { const m = EQUIPE[Math.floor(Math.random() * EQUIPE.length)]; return { paraNome: m.nome, paraTipo: "EQUIPE", conteudo: `☀️ ${m.nome.split(" ")[0]}, bom dia! Sua agenda de hoje:\n\n• 09:00 — Atendimento\n• 11:00 — Vistoria\n• 15:00 — Entrega de chaves\n\n— VeraBrokers` }; } },
    { tipo: "ENTREGA_DIA", nome: "Entrega de chaves — dia", make: (n, im) => ({ paraNome: n, paraTipo: "INQUILINO", conteudo: `Chegou o grande dia, ${n.split(" ")[0]}! 🏠✨ Suas chaves do imóvel *${im}* já estão separadas. Bem-vindo(a) ao seu novo lar!` }) },
    { tipo: "REPASSE_PROPRIETARIO", nome: "Repasse ao proprietário", make: (_n, im, p) => ({ paraNome: p, paraTipo: "PROPRIETARIO", conteudo: `Olá ${p}! 💰 Seu repasse do imóvel *${im}* foi processado e cai em conta em até 1 dia útil. Obrigado pela parceria!` }) },
    { tipo: "ETAPA_FICHA", nome: "Ficha aprovada", make: (n, im) => ({ paraNome: n, paraTipo: "INQUILINO", conteudo: `Oi ${n.split(" ")[0]}, ótima notícia! 🎉 Sua ficha para o imóvel *${im}* foi *APROVADA*!` }) },
    { tipo: "ENTREGA_VESPERA", nome: "Entrega de chaves — véspera", make: (n, im) => ({ paraNome: n, paraTipo: "INQUILINO", conteudo: `Oi ${n.split(" ")[0]}! 🔑 Amanhã suas chaves do imóvel *${im}* estarão disponíveis para retirada. Traga documento com foto!` }) },
    { tipo: "ETAPA_DESOCUPACAO", nome: "Desocupação iniciada", make: (_n, im, p) => ({ paraNome: p, paraTipo: "PROPRIETARIO", conteudo: `Olá ${p}. Atualização da desocupação do imóvel *${im}*: vistoria de saída concluída. Próximo passo: reanúncio. 🤝` }) },
  ];

  const contagens = [7, 9, 6, 12, 8, 14, 5, 11, 9, 15, 8, 13, 10]; // 13 dias atrás → ontem
  for (let d = 0; d < contagens.length; d++) {
    const dia = addDays(hoje, d - contagens.length);
    for (let i = 0; i < contagens[d]; i++) {
      const h = historico[(d * 3 + i) % historico.length];
      const nome = NOMES[(d * 5 + i * 2) % NOMES.length];
      const imovel = IMOVEIS[(d + i) % IMOVEIS.length];
      const prop = PROPS[(d * 2 + i) % PROPS.length];
      const feito = h.make(nome, imovel, prop);
      const minuto = String((i * 7) % 60).padStart(2, "0");
      const horaBase = i % 4 === 0 ? "08" : i % 4 === 1 ? "09" : i % 4 === 2 ? "11" : "15";
      await db.mensagem.create({
        data: {
          regraTipo: h.tipo, regraNome: h.nome,
          paraNome: feito.paraNome, paraZap: zap(60 + ((d * 13 + i) % 30)), paraTipo: feito.paraTipo,
          conteudo: feito.conteudo, status: "SIMULADA", origem: "CRON",
          dedupeKey: `hist:${dia}:${i}`, criadaEm: spInstant(dia, `${horaBase}:${minuto}`),
        },
      });
    }
  }

  // Duas mensagens de hoje (o botão "Rodar disparos" preenche o resto ao vivo)
  await db.mensagem.create({
    data: {
      regraTipo: "ETAPA_FICHA", regraNome: "Ficha aprovada",
      paraNome: "Márcio Steigleder", paraZap: zap(19), paraTipo: "INQUILINO",
      conteudo: "Oi Márcio, ótima notícia! 🎉 Sua ficha para o imóvel *Apto 702 · Ed. Golden Tower* foi *APROVADA*! Seu corretor Gustavo Farias e a equipe VeraBrokers já estão preparando seu contrato. Vamos te avisando de cada etapa por aqui — sem precisar ligar.",
      status: "SIMULADA", origem: "ETAPA", dedupeKey: `ETAPA_FICHA:${ficha1.id}`,
      contratoId: ficha1.id, criadaEm: spInstant(hoje, "09:12"),
    },
  });
  await db.mensagem.create({
    data: {
      regraTipo: "ETAPA_CONTRATO", regraNome: "Contrato assinado",
      paraNome: "Tainá Rocha", paraZap: zap(17), paraTipo: "INQUILINO",
      conteudo: "Oi Tainá! ✍️ Contrato do imóvel *Loja 02 · Av. Dorival C. de Oliveira* assinado com sucesso. Próxima etapa: vistoria de entrada — te avisamos assim que estiver agendada.",
      status: "SIMULADA", origem: "ETAPA", dedupeKey: `ETAPA_CONTRATO:${contratoAssinado.id}`,
      contratoId: contratoAssinado.id, criadaEm: spInstant(hoje, "10:05"),
    },
  });

  return { ok: true };
}
