// Diagnóstico rápido dos alertas de hoje
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const TZ = "America/Sao_Paulo";
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const inicioHoje = new Date(`${hoje}T00:00:00-03:00`);

(async () => {
  const [alertasDemanda, alertasConta, tarefasPend, tarefasFeitas, contasHoje] = await Promise.all([
    db.mensagem.findMany({ where: { regraTipo: "ALERTA_DEMANDA", criadaEm: { gte: inicioHoje } }, select: { paraNome: true, conteudo: true } }),
    db.mensagem.findMany({ where: { regraTipo: "ALERTA_CONTA", criadaEm: { gte: inicioHoje } }, select: { paraNome: true, conteudo: true } }),
    db.tarefa.count({ where: { data: hoje, concluida: false } }),
    db.tarefa.count({ where: { data: hoje, concluida: true } }),
    db.lancamento.count({ where: { status: "ABERTO", vencimento: { lte: hoje } } }),
  ]);
  console.log(`tarefas hoje: ${tarefasPend} pendentes / ${tarefasFeitas} concluídas`);
  console.log(`contas abertas venc<=hoje: ${contasHoje}`);
  console.log(`alertas de demanda criados: ${alertasDemanda.length}`);
  for (const a of alertasDemanda) console.log(`  → ${a.paraNome}: ${a.conteudo.split("\n")[2]}`);
  console.log(`alertas de conta criados: ${alertasConta.length}`);
  for (const a of alertasConta) console.log(`  → ${a.paraNome}: ${a.conteudo.split("\n")[2]}`);
  await db.$disconnect();
})();
