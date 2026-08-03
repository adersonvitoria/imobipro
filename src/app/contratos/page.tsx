import { db } from "@/lib/db";
import { TituloPagina } from "@/components/ui";
import Kanban, { type CartaoContrato } from "@/components/kanban";

export const dynamic = "force-dynamic";

export default async function Contratos() {
  const [contratos, corretores] = await Promise.all([
    db.contrato.findMany({
      include: {
        corretor: true,
        respEntrega: true,
        documentos: { where: { status: "PENDENTE" }, select: { id: true } },
      },
      orderBy: { criadoEm: "asc" },
    }),
    db.membro.findMany({ where: { papel: "CORRETOR", ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  const cartoes: CartaoContrato[] = contratos.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    etapa: c.etapa,
    imovel: c.imovel,
    bairro: c.bairro,
    valor: c.valor,
    inquilino: c.inquilino,
    proprietario: c.proprietario,
    entregaData: c.entregaData,
    entregaHora: c.entregaHora,
    vistoriaData: c.vistoriaData,
    vistoriaHora: c.vistoriaHora,
    corretor: c.corretor ? { nome: c.corretor.nome, cor: c.corretor.cor } : null,
    respEntrega: c.respEntrega ? { nome: c.respEntrega.nome } : null,
    docsPendentes: c.documentos.length,
  }));

  return (
    <div>
      <TituloPagina
        sobre="esteira de locação"
        titulo={
          <>
            Contratos <span className="text-brand">em movimento</span>
          </>
        }
      />
      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <Kanban
          contratos={cartoes}
          corretores={corretores.map((c) => ({ id: c.id, nome: c.nome }))}
        />
      </div>
    </div>
  );
}
