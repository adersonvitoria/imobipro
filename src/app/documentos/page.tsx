import { FolderOpen } from "lucide-react";
import { db } from "@/lib/db";
import { Chip, TituloPagina } from "@/components/ui";
import DocsBoard, { type DocItem } from "@/components/docs-board";

export const dynamic = "force-dynamic";

export default async function Documentos() {
  const docs = await db.documento.findMany({
    include: { contrato: true },
    orderBy: [{ status: "asc" }, { criadoEm: "asc" }],
  });

  const itens: DocItem[] = docs.map((d) => ({
    id: d.id,
    pessoa: d.pessoa,
    tipoPessoa: d.tipoPessoa,
    rotulo: d.rotulo,
    status: d.status,
    arquivo: d.arquivo,
    contratoId: d.contratoId,
    codigo: d.contrato?.codigo ?? "—",
    imovel: d.contrato?.imovel ?? "Sem contrato vinculado",
  }));

  const pendentes = itens.filter((d) => d.status === "PENDENTE").length;
  const recebidos = itens.filter((d) => d.status === "RECEBIDO").length;
  const aprovados = itens.filter((d) => d.status === "APROVADO").length;

  return (
    <div>
      <TituloPagina
        sobre="pasta digital — adeus, grupo de WhatsApp"
        titulo={
          <>
            Documentos <span className="text-brand">num lugar só</span>
          </>
        }
      >
        <Chip tom="aviso">{pendentes} pendentes</Chip>
        <Chip tom="info">{recebidos} recebidos</Chip>
        <Chip tom="ok">{aprovados} aprovados</Chip>
      </TituloPagina>

      <p className="-mt-4 mb-7 max-w-2xl text-[0.9rem] text-ink-2 animate-fade-up">
        RG, comprovantes, apólices e contratos de <span className="text-ink">inquilinos e
        proprietários</span>, organizados por contrato. Quem está devendo documento{" "}
        <span className="text-ink">recebe cobrança automática às 08:20</span> — e confirmação na
        hora quando envia.
      </p>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <DocsBoard itens={itens} />
      </div>

      <p className="mt-8 flex items-center gap-2 text-[0.7rem] text-ink-3">
        <FolderOpen size={12} />
        Na versão final: o cliente manda a foto no WhatsApp e a IA classifica, valida e anexa o
        arquivo sozinha na pasta do contrato.
      </p>
    </div>
  );
}
