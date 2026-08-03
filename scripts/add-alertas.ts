// One-off: adiciona as regras de alerta por demanda/conta sem reseedar o banco.
// Uso: npx tsx scripts/add-alertas.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const REGRAS = [
  {
    tipo: "ALERTA_DEMANDA", grupo: "DIARIO", ordem: 7, hora: "08:10", destino: "EQUIPE",
    nome: "Alerta por demanda do dia",
    descricao: "Cada demanda pendente do dia vira um alerta individual no WhatsApp do responsável — nada passa batido.",
    template:
      "⏰ Alerta de demanda, {{nome}}!\n\n📌 *{{demanda}}*\n🗓 Hoje · {{hora}}\n\nQuando concluir, marque ✅ na sua agenda do ImobiPRO. — {{imobiliaria}}",
  },
  {
    tipo: "ALERTA_CONTA", grupo: "DIARIO", ordem: 8, hora: "08:15", destino: "EQUIPE",
    nome: "Alerta de contas do dia",
    descricao: "Contas a pagar vencendo hoje e recebimentos em atraso chegam um a um no WhatsApp do financeiro.",
    template:
      "💸 {{nome}}, conta no radar de hoje:\n\n{{tipo}}: *{{descricao}}*\n👤 {{contraparte}}\n💰 {{valor}} · vencimento: {{vencimento}}\n\nRegistrado no ImobiPRO. — {{imobiliaria}}",
  },
];

(async () => {
  for (const r of REGRAS) {
    await db.regra.upsert({ where: { tipo: r.tipo }, update: {}, create: r });
    console.log(`regra ok: ${r.tipo}`);
  }
  await db.$disconnect();
})();
