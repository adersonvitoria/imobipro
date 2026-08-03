// Seed de demonstração — VeraBrokers, Gravataí/RS.
// Reutilizado pelo `npm run db:seed` e pelo botão "Reiniciar demonstração".
import type { PrismaClient } from "@prisma/client";
import { addDays, dayOfMonth, spInstant, spToday } from "./dates";

export async function seedDemo(db: PrismaClient) {
  const hoje = spToday();
  const amanha = addDays(hoje, 1);

  // limpa tudo (ordem respeita FKs)
  await db.documento.deleteMany();
  await db.cobranca.deleteMany();
  await db.sinistro.deleteMany();
  await db.notaFiscal.deleteMany();
  await db.lancamento.deleteMany();
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
  const [gustavo, eduardo, paola, marilice, claudete, aline, fabio, daiane] = await Promise.all(
    [
      { nome: "Gustavo Farias", papel: "CORRETOR", whatsapp: "51 98411-2233", cor: "#f473b8" },
      { nome: "Eduardo Ramos", papel: "CORRETOR", whatsapp: "51 98122-7788", cor: "#ed1e8f" },
      { nome: "Paola Siqueira", papel: "CONTRATOS", whatsapp: "51 98301-5566", cor: "#9ec3d8" },
      { nome: "Marilice Souza", papel: "ADMINISTRATIVO", whatsapp: "51 99633-4455", cor: "#c9a0c6" },
      { nome: "Claudete Fraga", papel: "FINANCEIRO", whatsapp: "51 98455-1122", cor: "#e8a087" },
      { nome: "Aline Moraes", papel: "VISTORIA", whatsapp: "51 99711-9900", cor: "#8fca9f" },
      { nome: "Fábio Antunes", papel: "JURIDICO", whatsapp: "51 99900-7788", cor: "#e0b34f" },
      { nome: "Daiane Santanna", papel: "GESTAO", whatsapp: "51 99988-0011", cor: "#c39bd3" },
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
      tipo: "BOLETIM_GESTAO", grupo: "DIARIO", ordem: 0, hora: "07:45", destino: "EQUIPE",
      nome: "Boletim da operação para a gestão",
      descricao: "A gestão recebe o pulso completo da operação no WhatsApp — sem precisar centralizar nada.",
      template:
        "📊 *Boletim {{imobiliaria}} — {{data}}*\n\nBom dia, {{nome}}! Sua operação em 30 segundos:\n\n{{resumo}}\n\n_Gerado automaticamente pela sua central. Pergunte \"como está a operação\" no Analista para detalhes._",
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
      tipo: "ALERTA_DEMANDA", grupo: "DIARIO", ordem: 7, hora: "08:10", destino: "EQUIPE",
      nome: "Alerta por demanda do dia",
      descricao: "Cada demanda pendente do dia vira um alerta individual no WhatsApp do responsável — nada passa batido.",
      template:
        "⏰ Alerta de demanda, {{nome}}!\n\n📌 *{{demanda}}*\n🗓 Hoje · {{hora}}\n\nQuando concluir, marque ✅ na sua agenda. — {{imobiliaria}}",
    },
    {
      tipo: "ALERTA_CONTA", grupo: "DIARIO", ordem: 8, hora: "08:15", destino: "EQUIPE",
      nome: "Alerta de contas do dia",
      descricao: "Contas a pagar vencendo hoje e recebimentos em atraso chegam um a um no WhatsApp do financeiro.",
      template:
        "💸 {{nome}}, conta no radar de hoje:\n\n{{tipo}}: *{{descricao}}*\n👤 {{contraparte}}\n💰 {{valor}} · vencimento: {{vencimento}}\n\nRegistrado na central. — {{imobiliaria}}",
    },
    {
      tipo: "DOC_PENDENTE", grupo: "DIARIO", ordem: 9, hora: "08:20", destino: "INQUILINO",
      nome: "Cobrança de documentos pendentes",
      descricao: "Quem está com documento faltando recebe a lista todo dia — sem a Paola precisar caçar ninguém no grupo.",
      template:
        "📎 Oi {{nome}}! Para avançar com o contrato do imóvel *{{imovel}}*, ainda faltam estes documentos:\n\n{{lista}}\n\nPode mandar *foto aqui mesmo* que eu já anexo na sua pasta digital — leva 1 minuto. 😉 — {{imobiliaria}}",
    },
    {
      tipo: "ETAPA_FICHA", grupo: "INSTANTANEO", ordem: 20, destino: "INQUILINO",
      nome: "Ficha aprovada",
      descricao: "Dispara na hora em que a ficha é aprovada no sistema.",
      template:
        "Oi {{nome}}, ótima notícia! 🎉 Sua ficha para o imóvel *{{imovel}}* foi *APROVADA*! Seu corretor {{corretor}} e a equipe {{imobiliaria}} já estão preparando seu contrato. Vamos te avisando de cada etapa por aqui — sem precisar ligar.",
    },
    {
      tipo: "ETAPA_ASSINATURA_PROP", grupo: "INSTANTANEO", ordem: 21, destino: "PROPRIETARIO",
      nome: "Contrato p/ assinatura — proprietário",
      descricao: "Contrato enviado: o proprietário recebe o aviso na hora, sem o corretor precisar parar visita pra avisar.",
      template:
        "📝 {{proprietario}}, o contrato de locação do seu imóvel *{{imovel}}* está pronto e disponível para *assinatura digital*! Você assina primeiro e, na sequência, o inquilino recebe o link automaticamente. Qualquer dúvida, é só responder aqui. — {{imobiliaria}}",
    },
    {
      tipo: "ETAPA_ASSINATURA_INQ", grupo: "INSTANTANEO", ordem: 22, destino: "INQUILINO",
      nome: "Contrato p/ assinatura — inquilino",
      descricao: "O inquilino já sabe que o contrato está em assinatura e que o link dele chega sozinho na sequência.",
      template:
        "Oi {{nome}}! 📝 Seu contrato do imóvel *{{imovel}}* foi enviado para *assinatura digital*. Assim que o proprietário assinar, o seu link chega automaticamente por aqui — sem precisar ligar pra ninguém. Falta pouco! 🏠",
    },
    {
      tipo: "ETAPA_CONTRATO", grupo: "INSTANTANEO", ordem: 23, destino: "INQUILINO",
      nome: "Contrato assinado",
      descricao: "Confirmação instantânea da assinatura.",
      template:
        "Oi {{nome}}! ✍️ Contrato do imóvel *{{imovel}}* assinado com sucesso. Próxima etapa: vistoria de entrada — te avisamos assim que estiver agendada.",
    },
    {
      tipo: "ETAPA_VISTORIA", grupo: "INSTANTANEO", ordem: 24, destino: "INQUILINO",
      nome: "Vistoria agendada",
      descricao: "Avisa data e hora da vistoria assim que agendada.",
      template:
        "Oi {{nome}}! 📋 A vistoria de entrada do imóvel *{{imovel}}* foi agendada para {{data}} às {{hora}}. Depois dela, suas chaves entram em preparação. Falta pouco! 🏠",
    },
    {
      tipo: "ETAPA_CHAVES_PRONTAS", grupo: "INSTANTANEO", ordem: 25, destino: "INQUILINO",
      nome: "Chaves em preparação",
      descricao: "Chaves prontas: já marca dia, hora e responsável pela entrega.",
      template:
        "Boa notícia, {{nome}}! 🔑 As chaves do imóvel *{{imovel}}* estão prontas! Entrega marcada: *{{data}} às {{hora}}*, com *{{responsavel}}*, na {{loja}}. Você receberá um lembrete na véspera.",
    },
    {
      tipo: "ETAPA_ATIVO", grupo: "INSTANTANEO", ordem: 26, destino: "INQUILINO",
      nome: "Boas-vindas ao novo lar",
      descricao: "Chaves entregues: boas-vindas + canais de atendimento no mesmo contato.",
      template:
        "{{nome}}, chaves entregues! 🏠✨ Seja muito bem-vindo(a) ao seu novo lar. Guarde este contato: por aqui você pede *2ª via de boleto*, *manutenção* e fala com o *financeiro* — resposta rápida, sem telefone. — {{imobiliaria}}",
    },
    {
      tipo: "ETAPA_ATIVO_PROP", grupo: "INSTANTANEO", ordem: 27, destino: "PROPRIETARIO",
      nome: "Imóvel ocupado — aviso ao proprietário",
      descricao: "Proprietário sabe na hora que o imóvel foi entregue e quando recebe.",
      template:
        "Olá {{proprietario}}! ✅ Seu imóvel *{{imovel}}* foi entregue hoje ao inquilino {{nome}}. Contrato ativo — seu repasse acontece todo *{{repasse}}*. Você será avisado(a) de cada movimentação por aqui.",
    },
    {
      tipo: "ETAPA_DESOCUPACAO", grupo: "INSTANTANEO", ordem: 28, destino: "PROPRIETARIO",
      nome: "Desocupação iniciada",
      descricao: "Proprietário acompanha cada etapa da desocupação sem precisar cobrar.",
      template:
        "Olá {{proprietario}}. Iniciamos hoje o processo de desocupação do imóvel *{{imovel}}*. Você receberá atualização de *cada etapa*: vistoria de saída, eventuais reparos e reanúncio. Pode ficar tranquilo(a) — a {{imobiliaria}} cuida de tudo. 🤝",
    },
    {
      tipo: "SINISTRO_STATUS", grupo: "INSTANTANEO", ordem: 29, destino: "PROPRIETARIO",
      nome: "Status de sinistro (seguro-fiança)",
      descricao: "Proprietário pergunta ou o status muda → resposta na hora com protocolo, status e previsão (API Loft/Porto Seguro).",
      template:
        "🛡 {{proprietario}}, atualização do seguro-fiança ({{seguradora}}):\n\n🏠 Imóvel: *{{imovel}}*\n📄 Protocolo: {{protocolo}}\n📌 Status: *{{status}}*\n⏳ Previsão: {{previsao}}\n\nVocê será avisado(a) automaticamente a cada mudança. — {{imobiliaria}}",
    },
    {
      tipo: "DOC_CONFIRMACAO", grupo: "INSTANTANEO", ordem: 31, destino: "INQUILINO",
      nome: "Documento recebido — confirmação",
      descricao: "Documento chegou → confirmação na hora, com a lista do que ainda falta (ou parabéns pela pasta completa).",
      template:
        "✅ Recebi seu *{{documento}}*, {{nome}}! Já está guardado na sua pasta digital.{{faltantes}} — {{imobiliaria}}",
    },
    {
      tipo: "COBRANCA_STATUS", grupo: "INSTANTANEO", ordem: 30, destino: "PROPRIETARIO",
      nome: "Status da cobrança (inadimplência)",
      descricao: "Aluguel atrasou? O proprietário sabe em que pé está a cobrança — sem ligar, sem cobrar o corretor.",
      template:
        "📢 {{proprietario}}, atualização da cobrança do imóvel *{{imovel}}*:\n\n📌 Status: *{{status}}*\n💰 Valor em aberto: {{valor}}\n⏳ Previsão de regularização: {{previsao}}\n\nSeu repasse é processado assim que o pagamento entrar — e você será avisado(a) de cada movimento. — {{imobiliaria}}",
    },
  ];
  for (const r of regras) await db.regra.create({ data: r });

  // ---- Contratos ----------------------------------------------------------
  const zap = (n: number) => `51 98${String(100 + n).slice(0, 3)}-${String(1000 + n * 37).slice(0, 4)}`;

  const cAmanha = [
    { codigo: "VB-1041", inquilino: "Camila Ferreira", imovel: "Apto 302 · Ed. Solar das Acácias", endereco: "Rua Anita Garibaldi, 210", bairro: "Centro", valor: 1650, proprietario: "Sr. Nelson Brum", hora: "09:00", resp: marilice.id, corretor: gustavo.id },
    { codigo: "VB-1038", inquilino: "João Pedro Alves", imovel: "Casa 2 dorm · Vera Cruz", endereco: "Rua das Hortênsias, 87", bairro: "Vera Cruz", valor: 1400, proprietario: "Dona Teresinha Fam", hora: "10:00", resp: marilice.id, corretor: eduardo.id },
    { codigo: "VB-1044", inquilino: "Larissa Prates", imovel: "Apto 204 · Res. Morada do Sol", endereco: "Av. Centenário, 1543", bairro: "Morada Gaúcha", valor: 1250, proprietario: "Sr. Otávio Ritter", hora: "11:00", resp: aline.id, corretor: gustavo.id },
    { codigo: "VB-1046", inquilino: "Vagner Souza", imovel: "Sobrado 3 dorm · Dom Feliciano", endereco: "Rua Caxias do Sul, 402", bairro: "Dom Feliciano", valor: 1980, proprietario: "Sra. Ivone Castilhos", hora: "14:00", resp: marilice.id, corretor: eduardo.id },
    { codigo: "VB-1047", inquilino: "Patrícia Dias", imovel: "Kitnet 12 · Ed. Único", endereco: "Rua Coelho Neto, 55", bairro: "Centro", valor: 890, proprietario: "Sr. Jorge Baldissera", hora: "16:00", resp: aline.id, corretor: gustavo.id },
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
      entregaData: hoje, entregaHora: "15:00", respEntregaId: aline.id,
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
      codigo: "VB-1051", etapa: "ASSINATURA", imovel: "Apto 702 · Ed. Golden Tower", endereco: "Rua José Loureiro da Silva, 1590", bairro: "Centro",
      valor: 2100, diaVencimento: 10, inquilino: "Márcio Steigleder", inquilinoZap: zap(19),
      proprietario: "Dra. Helena Fritsch", proprietarioZap: zap(20), corretorId: gustavo.id,
    },
  });
  const ficha2 = await db.contrato.create({
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
    { titulo: "Retorno de desocupação — Sr. Milton (Casa · Bom Sucesso)", tipo: "DESOCUPACAO", data: hoje, hora: "09:30", responsavelId: aline.id, contratoId: desocupacao.id },
    { titulo: "Enviar contrato p/ assinatura — Márcio Steigleder (Apto 702 · Ed. Golden Tower)", tipo: "OUTRO", data: hoje, hora: "09:45", responsavelId: paola.id, contratoId: ficha1.id },
    { titulo: "Revisão jurídica — contrato VB-1051 (Márcio Steigleder)", tipo: "OUTRO", data: hoje, hora: "11:30", responsavelId: fabio.id, contratoId: ficha1.id },
    { titulo: "Entrega de chaves — Henrique Ott (Apto 501 · Ed. Firenze)", tipo: "ENTREGA_CHAVE", data: hoje, hora: "10:30", responsavelId: marilice.id, contratoId: entregaHoje1.id },
    { titulo: "Entrega de chaves — Débora Nunes (Casa · Parque dos Anjos)", tipo: "ENTREGA_CHAVE", data: hoje, hora: "15:00", responsavelId: aline.id, contratoId: entregaHoje2.id },
    { titulo: "Reparo hidráulico — Apto 204 · Dom Feliciano", tipo: "REPARO", data: hoje, hora: "11:00", responsavelId: aline.id },
    { titulo: "Conferir repasses do dia e enviar comprovantes", tipo: "OUTRO", data: hoje, hora: "09:00", responsavelId: claudete.id },
    { titulo: "Visita com cliente — Casa 3 dorm · Salgado Filho", tipo: "ATENDIMENTO", data: hoje, hora: "15:30", responsavelId: gustavo.id },
    { titulo: "Fotos do imóvel novo — Sobrado · Dom Feliciano", tipo: "ATENDIMENTO", data: hoje, hora: "10:00", responsavelId: eduardo.id },
    { titulo: "Preparar kits de chaves (5 entregas do dia)", tipo: "OUTRO", data: amanha, hora: "08:30", responsavelId: marilice.id },
    { titulo: "Vistoria de entrada — Felipe Xavier (Apto 303 · Res. Ipê Amarelo)", tipo: "VISTORIA", data: amanha, hora: "14:00", responsavelId: aline.id, contratoId: vistoriaAmanha.id },
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
  await db.evento.create({ data: { contratoId: ficha1.id, titulo: "Contrato enviado para assinatura digital (Paola)" } });
  await db.evento.create({ data: { contratoId: contratoAssinado.id, titulo: "Contrato assinado digitalmente" } });
  await db.evento.create({ data: { contratoId: desocupacao.id, titulo: "Aviso de desocupação recebido do inquilino" } });

  // ---- Histórico de mensagens (últimos 13 dias, alimenta o gráfico) -------
  const NOMES = ["Camila Ferreira", "João Pedro Alves", "Larissa Prates", "Vagner Souza", "Patrícia Dias", "Henrique Ott", "Débora Nunes", "Felipe Xavier", "Tainá Rocha", "Márcio Steigleder", "Ana Beatriz Cunha", "Rodrigo Malta", "Simone Vargas", "Juliana Castro"];
  const PROPS = ["Sr. Nelson Brum", "Dona Iara Peixoto", "Sr. Adão Pereira", "Sra. Marta Winter", "Dr. Paulo Krieger", "Sr. Milton Weber", "Sra. Ivone Castilhos"];
  const IMOVEIS = ["Apto 302 · Ed. Solar das Acácias", "Casa 2 dorm · Vera Cruz", "Apto 204 · Res. Morada do Sol", "Kitnet 12 · Ed. Único", "Apto 405 · Ed. Lucerna", "Casa 2 dorm · Barnabé", "Sala 703 · Centro Empresarial"];
  const EQUIPE = [gustavo, eduardo, paola, marilice, claudete, aline];

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
      regraTipo: "ETAPA_ASSINATURA_PROP", regraNome: "Contrato p/ assinatura — proprietário",
      paraNome: "Dra. Helena Fritsch", paraZap: zap(20), paraTipo: "PROPRIETARIO",
      conteudo: "📝 Helena, o contrato de locação do seu imóvel *Apto 702 · Ed. Golden Tower* está pronto e disponível para *assinatura digital*! Você assina primeiro e, na sequência, o inquilino recebe o link automaticamente. Qualquer dúvida, é só responder aqui. — VeraBrokers",
      status: "SIMULADA", origem: "ETAPA", dedupeKey: `ETAPA_ASSINATURA_PROP:${ficha1.id}`,
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

  // ---- Contas a pagar e a receber ------------------------------------------
  const mesRef = (dia: number) => `${hoje.slice(0, 8)}${String(dia).padStart(2, "0")}`;
  const auto = (venc: string) => (venc < hoje ? "LIQUIDADO" : "ABERTO");

  const lancamentos: {
    tipo: string; descricao: string; contraparte: string; categoria: string;
    valor: number; vencimento: string; status: string;
  }[] = [
    // A receber — aluguéis do mês + taxa de intermediação
    { tipo: "RECEBER", descricao: "Aluguel do mês — Apto 405 · Ed. Lucerna", contraparte: "Rodrigo Malta", categoria: "ALUGUEL", valor: 1500, vencimento: addDays(hoje, 3), status: "ABERTO" },
    { tipo: "RECEBER", descricao: "Aluguel do mês — Casa 2 dorm · Barnabé", contraparte: "Simone Vargas", categoria: "ALUGUEL", valor: 1200, vencimento: mesRef(15), status: auto(mesRef(15)) },
    { tipo: "RECEBER", descricao: "Aluguel do mês — Apto 108 · Res. Viena", contraparte: "Cristiano Leal", categoria: "ALUGUEL", valor: 980, vencimento: mesRef(20), status: auto(mesRef(20)) },
    { tipo: "RECEBER", descricao: "Aluguel do mês — Sala 703 · Centro Empresarial", contraparte: "Juliana Castro", categoria: "ALUGUEL", valor: 2250, vencimento: mesRef(27), status: auto(mesRef(27)) },
    { tipo: "RECEBER", descricao: "Aluguel em atraso — Casa 2 dorm · Bom Sucesso", contraparte: "Diego Fontoura", categoria: "ALUGUEL", valor: 1350, vencimento: addDays(hoje, -4), status: "ABERTO" },
    { tipo: "RECEBER", descricao: "Taxa de intermediação — Loja 02 · Av. Dorival", contraparte: "Tainá Rocha", categoria: "TAXA", valor: 2600, vencimento: addDays(hoje, 6), status: "ABERTO" },
    // A pagar — repasses + fornecedores + despesas
    { tipo: "PAGAR", descricao: "Repasse — Apto 405 · Ed. Lucerna", contraparte: "Dona Iara Peixoto", categoria: "REPASSE", valor: 1350, vencimento: hoje, status: "ABERTO" },
    { tipo: "PAGAR", descricao: "Repasse — Casa 2 dorm · Barnabé", contraparte: "Sr. Adão Pereira", categoria: "REPASSE", valor: 1080, vencimento: mesRef(16), status: auto(mesRef(16)) },
    { tipo: "PAGAR", descricao: "Repasse — Apto 108 · Res. Viena", contraparte: "Sra. Marta Winter", categoria: "REPASSE", valor: 882, vencimento: mesRef(21), status: auto(mesRef(21)) },
    { tipo: "PAGAR", descricao: "Repasse — Sala 703 · Centro Empresarial", contraparte: "Dr. Paulo Krieger", categoria: "REPASSE", valor: 2025, vencimento: mesRef(28), status: auto(mesRef(28)) },
    { tipo: "PAGAR", descricao: "Reparo hidráulico — Apto 204 · Dom Feliciano", contraparte: "Hidráulica Silva", categoria: "FORNECEDOR", valor: 280, vencimento: addDays(hoje, 1), status: "ABERTO" },
    { tipo: "PAGAR", descricao: "Chaveiro — cópias para entregas da semana", contraparte: "Chaveiro Central", categoria: "FORNECEDOR", valor: 120, vencimento: hoje, status: "ABERTO" },
    { tipo: "PAGAR", descricao: "Anúncios — portais ZAP + OLX", contraparte: "OLX Brasil", categoria: "DESPESA", valor: 450, vencimento: addDays(hoje, 5), status: "ABERTO" },
    { tipo: "PAGAR", descricao: "Energia elétrica — loja Centro", contraparte: "CEEE Equatorial", categoria: "DESPESA", valor: 310, vencimento: addDays(hoje, 2), status: "ABERTO" },
    { tipo: "PAGAR", descricao: "Material de escritório", contraparte: "Papelaria Del Rei", categoria: "DESPESA", valor: 95, vencimento: addDays(hoje, -2), status: "LIQUIDADO" },
  ];
  for (const l of lancamentos) await db.lancamento.create({ data: l });

  // ---- NFS-e — notas do mês (taxa de administração) -------------------------
  const competencia = hoje.slice(0, 7);
  const notas = [
    { numero: 1041, tomador: "Dona Iara Peixoto", descricao: "Taxa de administração — Apto 405 · Ed. Lucerna", valor: 150 },
    { numero: 1042, tomador: "Sr. Adão Pereira", descricao: "Taxa de administração — Casa 2 dorm · Barnabé", valor: 120 },
    { numero: 1043, tomador: "Sra. Marta Winter", descricao: "Taxa de administração — Apto 108 · Res. Viena", valor: 98 },
    { numero: 1044, tomador: "Dr. Paulo Krieger", descricao: "Taxa de administração — Sala 703 · Centro Empresarial", valor: 225 },
  ];
  for (const [i, n] of notas.entries()) {
    await db.notaFiscal.create({
      data: {
        ...n, competencia, status: "EMITIDA",
        emitidaEm: spInstant(addDays(hoje, -1), `${String(8 + i).padStart(2, "0")}:1${i}`),
      },
    });
  }
  await db.notaFiscal.create({
    data: {
      competencia, tomador: "Sr. Ermindo Weiss",
      descricao: "Taxa de intermediação — Loja 02 · Av. Dorival",
      valor: 2600, status: "PENDENTE",
    },
  });

  // ---- Sinistros de seguro-fiança (Loft / Porto Seguro) ---------------------
  await db.sinistro.create({
    data: {
      seguradora: "LOFT", tipo: "INADIMPLENCIA", status: "EM_ANALISE",
      protocolo: "LFT-48291", previsaoDias: 90,
      imovel: "Casa 2 dorm · Bom Sucesso", proprietario: "Sr. Milton Weber",
      proprietarioZap: zap(51), contratoId: desocupacao.id,
      abertoEm: spInstant(addDays(hoje, -6), "10:20"),
    },
  });
  await db.sinistro.create({
    data: {
      seguradora: "PORTO", tipo: "DANOS", status: "PAGO",
      protocolo: "PS-77104", previsaoDias: 60,
      imovel: "Apto 108 · Res. Viena", proprietario: "Sra. Marta Winter",
      proprietarioZap: zap(42),
      abertoEm: spInstant(addDays(hoje, -40), "14:05"),
    },
  });

  // ---- Pasta digital — documentos --------------------------------------------
  const ontem = addDays(hoje, -1);
  const docs: {
    contratoId: string; pessoa: string; pessoaZap: string; tipoPessoa: string;
    tipo: string; rotulo: string; status: string; arquivo?: string;
  }[] = [
    // Ana Beatriz (VB-1052 · ficha aprovada) — pendências travando o contrato
    { contratoId: ficha2.id, pessoa: "Ana Beatriz Cunha", pessoaZap: zap(21), tipoPessoa: "INQUILINO", tipo: "RG_CNH", rotulo: "RG ou CNH", status: "APROVADO", arquivo: "rg-ana.pdf" },
    { contratoId: ficha2.id, pessoa: "Ana Beatriz Cunha", pessoaZap: zap(21), tipoPessoa: "INQUILINO", tipo: "CPF", rotulo: "CPF", status: "APROVADO", arquivo: "cpf-ana.pdf" },
    { contratoId: ficha2.id, pessoa: "Ana Beatriz Cunha", pessoaZap: zap(21), tipoPessoa: "INQUILINO", tipo: "COMP_RESIDENCIA", rotulo: "Comprovante de residência", status: "RECEBIDO", arquivo: "residencia-ana.jpg" },
    { contratoId: ficha2.id, pessoa: "Ana Beatriz Cunha", pessoaZap: zap(21), tipoPessoa: "INQUILINO", tipo: "COMP_RENDA", rotulo: "Comprovante de renda", status: "PENDENTE" },
    { contratoId: ficha2.id, pessoa: "Sr. Arno Petry", pessoaZap: zap(22), tipoPessoa: "PROPRIETARIO", tipo: "PROCURACAO", rotulo: "Procuração do imóvel", status: "PENDENTE" },
    // Márcio (VB-1051 · assinatura) — pasta completa
    { contratoId: ficha1.id, pessoa: "Márcio Steigleder", pessoaZap: zap(19), tipoPessoa: "INQUILINO", tipo: "RG_CNH", rotulo: "RG ou CNH", status: "APROVADO", arquivo: "rg-marcio.pdf" },
    { contratoId: ficha1.id, pessoa: "Márcio Steigleder", pessoaZap: zap(19), tipoPessoa: "INQUILINO", tipo: "CPF", rotulo: "CPF", status: "APROVADO", arquivo: "cpf-marcio.pdf" },
    { contratoId: ficha1.id, pessoa: "Márcio Steigleder", pessoaZap: zap(19), tipoPessoa: "INQUILINO", tipo: "COMP_RENDA", rotulo: "Comprovante de renda", status: "APROVADO", arquivo: "renda-marcio.pdf" },
    // Tainá (VB-1050 · contrato assinado) — falta anexar o contrato assinado
    { contratoId: contratoAssinado.id, pessoa: "Tainá Rocha", pessoaZap: zap(17), tipoPessoa: "INQUILINO", tipo: "APOLICE_SEGURO", rotulo: "Apólice do seguro-fiança", status: "RECEBIDO", arquivo: "apolice-taina.pdf" },
    { contratoId: contratoAssinado.id, pessoa: "Tainá Rocha", pessoaZap: zap(17), tipoPessoa: "INQUILINO", tipo: "CONTRATO_ASSINADO", rotulo: "Contrato assinado (via digital)", status: "PENDENTE" },
    // Camila (VB-1041 · entrega amanhã) — pasta completa
    { contratoId: contratosAmanha[0].id, pessoa: "Camila Ferreira", pessoaZap: contratosAmanha[0].inquilinoZap, tipoPessoa: "INQUILINO", tipo: "RG_CNH", rotulo: "RG ou CNH", status: "APROVADO", arquivo: "rg-camila.pdf" },
    { contratoId: contratosAmanha[0].id, pessoa: "Camila Ferreira", pessoaZap: contratosAmanha[0].inquilinoZap, tipoPessoa: "INQUILINO", tipo: "COMP_RENDA", rotulo: "Comprovante de renda", status: "APROVADO", arquivo: "renda-camila.pdf" },
    { contratoId: contratosAmanha[0].id, pessoa: "Camila Ferreira", pessoaZap: contratosAmanha[0].inquilinoZap, tipoPessoa: "INQUILINO", tipo: "APOLICE_SEGURO", rotulo: "Apólice do seguro-fiança", status: "APROVADO", arquivo: "apolice-camila.pdf" },
  ];
  for (const [i, d] of docs.entries()) {
    await db.documento.create({
      data: {
        contratoId: d.contratoId, pessoa: d.pessoa, pessoaZap: d.pessoaZap, tipoPessoa: d.tipoPessoa,
        tipo: d.tipo, rotulo: d.rotulo, status: d.status, arquivo: d.arquivo ?? null,
        recebidoEm: d.status === "PENDENTE" ? null : spInstant(ontem, `1${i % 8}:2${i % 6}`),
      },
    });
  }

  // ---- Cobranças de inadimplência -------------------------------------------
  await db.cobranca.create({
    data: {
      inquilino: "Diego Fontoura", imovel: "Casa 2 dorm · Bom Sucesso",
      proprietario: "Sr. Milton Weber", proprietarioZap: zap(51),
      valor: 1350, status: "NEGOCIACAO", previsaoPagamento: addDays(hoje, 12),
      iniciadaEm: spInstant(addDays(hoje, -4), "09:40"), contratoId: desocupacao.id,
    },
  });
  await db.cobranca.create({
    data: {
      inquilino: "Juliana Castro", imovel: "Sala 703 · Centro Empresarial",
      proprietario: "Dr. Paulo Krieger", proprietarioZap: zap(43),
      valor: 2250, status: "REGULARIZADO",
      iniciadaEm: spInstant(addDays(hoje, -15), "11:00"),
    },
  });

  return { ok: true };
}
