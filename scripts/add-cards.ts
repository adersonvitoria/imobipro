// One-off: adiciona contratos nas colunas Ficha Aprovada e Assinatura (sem reseed).
// Uso: npx tsx scripts/add-cards.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const zap = (n: number) => `51 98${String(100 + n).slice(0, 3)}-${String(1000 + n * 37).slice(0, 4)}`;

const NOVOS = [
  {
    codigo: "VB-1054", etapa: "FICHA_APROVADA", imovel: "Apto 105 · Res. Jardim das Flores",
    endereco: "Rua das Azaleias, 98", bairro: "Vera Cruz", valor: 1180, diaVencimento: 10,
    inquilino: "Bruna Lopes", inquilinoZap: zap(61), proprietario: "Sr. Otto Kranz", proprietarioZap: zap(62),
    corretorPapel: "Gustavo",
    docs: [
      { tipo: "RG_CNH", rotulo: "RG ou CNH", status: "APROVADO", arquivo: "rg-bruna.pdf" },
      { tipo: "COMP_RENDA", rotulo: "Comprovante de renda", status: "PENDENTE" },
    ],
  },
  {
    codigo: "VB-1055", etapa: "FICHA_APROVADA", imovel: "Casa 2 dorm · Parque dos Anjos",
    endereco: "Rua Missões, 415", bairro: "Parque dos Anjos", valor: 1420, diaVencimento: 5,
    inquilino: "Carlos Eduardo Mota", inquilinoZap: zap(63), proprietario: "Sra. Neusa Balbinot", proprietarioZap: zap(64),
    corretorPapel: "Eduardo",
    docs: [
      { tipo: "RG_CNH", rotulo: "RG ou CNH", status: "APROVADO", arquivo: "rg-carlos.pdf" },
      { tipo: "COMP_RENDA", rotulo: "Comprovante de renda", status: "APROVADO", arquivo: "renda-carlos.pdf" },
    ],
  },
  {
    codigo: "VB-1056", etapa: "FICHA_APROVADA", imovel: "Apto 402 · Ed. Monte Carlo",
    endereco: "Rua Anápio Gomes, 720", bairro: "Centro", valor: 1980, diaVencimento: 15,
    inquilino: "Fernanda Riedel", inquilinoZap: zap(65), proprietario: "Sr. Hélio Wartchow", proprietarioZap: zap(66),
    corretorPapel: "Gustavo", docs: [],
  },
  {
    codigo: "VB-1057", etapa: "ASSINATURA", imovel: "Sobrado 3 dorm · São Vicente",
    endereco: "Rua Guaporé, 233", bairro: "São Vicente", valor: 2150, diaVencimento: 10,
    inquilino: "Paulo Henrique Dias", inquilinoZap: zap(67), proprietario: "Sra. Carmen Souto", proprietarioZap: zap(68),
    corretorPapel: "Eduardo", docs: [],
  },
  {
    codigo: "VB-1058", etapa: "ASSINATURA", imovel: "Kitnet 08 · Ed. Estação",
    endereco: "Rua Dr. Luiz Bastos do Prado, 1520", bairro: "Centro", valor: 850, diaVencimento: 10,
    inquilino: "Vanessa Krüger", inquilinoZap: zap(69), proprietario: "Sr. Ari Fensterseifer", proprietarioZap: zap(70),
    corretorPapel: "Gustavo", docs: [],
  },
];

(async () => {
  const gustavo = await db.membro.findFirst({ where: { nome: { startsWith: "Gustavo" } } });
  const eduardo = await db.membro.findFirst({ where: { nome: { startsWith: "Eduardo" } } });

  for (const n of NOVOS) {
    const existe = await db.contrato.findUnique({ where: { codigo: n.codigo } });
    if (existe) {
      console.log(`já existe: ${n.codigo}`);
      continue;
    }
    const c = await db.contrato.create({
      data: {
        codigo: n.codigo, etapa: n.etapa, imovel: n.imovel, endereco: n.endereco, bairro: n.bairro,
        valor: n.valor, diaVencimento: n.diaVencimento,
        inquilino: n.inquilino, inquilinoZap: n.inquilinoZap,
        proprietario: n.proprietario, proprietarioZap: n.proprietarioZap,
        corretorId: (n.corretorPapel === "Gustavo" ? gustavo?.id : eduardo?.id) ?? null,
      },
    });
    await db.evento.create({
      data: {
        contratoId: c.id,
        titulo: n.etapa === "ASSINATURA" ? "Contrato enviado para assinatura digital" : "Ficha aprovada pelo administrativo",
      },
    });
    for (const d of n.docs) {
      await db.documento.create({
        data: {
          contratoId: c.id, pessoa: n.inquilino, pessoaZap: n.inquilinoZap, tipoPessoa: "INQUILINO",
          tipo: d.tipo, rotulo: d.rotulo, status: d.status, arquivo: d.arquivo ?? null,
          recebidoEm: d.status === "PENDENTE" ? null : new Date(),
        },
      });
    }
    console.log(`criado: ${n.codigo} (${n.etapa}) — ${n.inquilino}`);
  }
  await db.$disconnect();
})();
