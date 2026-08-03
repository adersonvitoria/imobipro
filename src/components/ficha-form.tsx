"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  Circle,
  Copy,
  FileSignature,
  Home,
  Paperclip,
  ScrollText,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { gerarContrato } from "@/app/actions";
import {
  fmtCPF,
  fmtTelefone,
  maiorDe18,
  validarCPF,
  validarEmail,
  validarTelefone,
  type FichaDados,
} from "@/lib/validar";

const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"];

type Pessoa = "loc" | "prop";

const VAZIO = {
  locNome: "", locCpf: "", locRg: "", locNascimento: "", locTelefone: "", locEmail: "",
  locEstadoCivil: "", locProfissao: "", locEndereco: "",
  propNome: "", propCpf: "", propRg: "", propNascimento: "", propTelefone: "", propEmail: "",
  propEstadoCivil: "", propProfissao: "", propEndereco: "",
  recebimento: "PIX" as "PIX" | "TRANSFERENCIA",
  pixChave: "", banco: "", agencia: "", conta: "",
  imovelEndereco: "", imovelBairro: "", valor: "", diaVencimento: "10",
  matricula: "", temCondominio: false, condominioValor: "",
};

const DOCS_VAZIO = {
  locRg: "", locResidencia: "", propRg: "", propResidencia: "",
  matricula: "", iptu: "", luz: "", condominio: "",
};

function Campo({ rotulo, children, largura = "" }: { rotulo: string; children: React.ReactNode; largura?: string }) {
  return (
    <label className={`block ${largura}`}>
      <span className="mb-1 block text-[0.64rem] uppercase tracking-[0.12em] text-ink-3">{rotulo}</span>
      {children}
    </label>
  );
}

function AnexoBtn({
  rotulo,
  nome,
  onFile,
}: {
  rotulo: string;
  nome: string;
  onFile: (n: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[0.72rem] transition-colors ${
        nome
          ? "border-ok/40 bg-ok/10 text-ok"
          : "border-dashed border-[var(--hairline)] text-ink-3 hover:border-brand/50 hover:text-brand"
      }`}
    >
      {nome ? <CheckCircle2 size={13} className="shrink-0" /> : <Paperclip size={13} className="shrink-0" />}
      <span className="min-w-0 flex-1">
        <span className="block">{rotulo}</span>
        {nome && <span className="block truncate font-mono text-[0.6rem] opacity-80">{nome}</span>}
      </span>
      <input
        ref={ref}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f.name);
        }}
      />
    </button>
  );
}

export default function FichaForm() {
  const [f, setF] = useState(VAZIO);
  const [docs, setDocs] = useState(DOCS_VAZIO);
  const [resultado, setResultado] = useState<{ codigo: string; texto: string } | null>(null);
  const [pendente, start] = useTransition();
  const router = useRouter();

  const set = (k: keyof typeof VAZIO) => (v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const checks = useMemo(() => {
    const pessoa = (p: Pessoa, rotulo: string) => [
      { r: `${rotulo}: nome completo`, ok: f[`${p}Nome`].trim().split(" ").length >= 2 },
      { r: `${rotulo}: CPF válido`, ok: validarCPF(f[`${p}Cpf`]) },
      { r: `${rotulo}: RG`, ok: f[`${p}Rg`].trim().length >= 5 },
      { r: `${rotulo}: maior de 18 anos`, ok: maiorDe18(f[`${p}Nascimento`]) },
      { r: `${rotulo}: telefone`, ok: validarTelefone(f[`${p}Telefone`]) },
      { r: `${rotulo}: e-mail`, ok: validarEmail(f[`${p}Email`]) },
      { r: `${rotulo}: estado civil`, ok: f[`${p}EstadoCivil`] !== "" },
      { r: `${rotulo}: profissão`, ok: f[`${p}Profissao`].trim().length >= 3 },
      { r: `${rotulo}: endereço`, ok: f[`${p}Endereco`].trim().length >= 8 },
    ];
    const lista = [
      ...pessoa("loc", "Locatário"),
      { r: "Locatário: foto RG/CNH", ok: !!docs.locRg },
      { r: "Locatário: comprovante de residência", ok: !!docs.locResidencia },
      ...pessoa("prop", "Proprietário"),
      { r: "Proprietário: foto RG/CNH", ok: !!docs.propRg },
      { r: "Proprietário: comprovante de residência", ok: !!docs.propResidencia },
      {
        r: "Recebimento do proprietário",
        ok:
          f.recebimento === "PIX"
            ? f.pixChave.trim().length >= 5
            : f.banco.trim().length >= 2 && f.agencia.trim().length >= 2 && f.conta.trim().length >= 3,
      },
      { r: "Imóvel: endereço", ok: f.imovelEndereco.trim().length >= 8 },
      { r: "Imóvel: valor do aluguel", ok: parseInt(f.valor || "0", 10) >= 300 },
      { r: "Imóvel: matrícula", ok: f.matricula.trim().length >= 3 },
      { r: "Anexo: matrícula do imóvel", ok: !!docs.matricula },
      { r: "Anexo: IPTU", ok: !!docs.iptu },
      { r: "Anexo: conta de luz (titularidade)", ok: !!docs.luz },
      ...(f.temCondominio
        ? [
            { r: "Condomínio: valor", ok: parseInt(f.condominioValor || "0", 10) > 0 },
            { r: "Anexo: boleto do condomínio", ok: !!docs.condominio },
          ]
        : []),
    ];
    return lista;
  }, [f, docs]);

  const feitos = checks.filter((c) => c.ok).length;
  const completo = feitos === checks.length;
  const pct = Math.round((feitos / checks.length) * 100);

  function enviar() {
    if (!completo || pendente) return;
    start(async () => {
      const r = await gerarContrato({
        ...f,
        valor: parseInt(f.valor, 10),
        diaVencimento: parseInt(f.diaVencimento || "10", 10),
        condominioValor: parseInt(f.condominioValor || "0", 10),
        docs,
      } as FichaDados);
      if (r.ok) {
        setResultado({ codigo: r.codigo, texto: r.contratoTexto });
        toast.success(`🎉 Contrato ${r.codigo} gerado e validado!`, { description: r.aviso });
        router.refresh();
      } else {
        toast.error("Validação do servidor encontrou pendências", { description: r.erros?.join(" · ") });
      }
    });
  }

  const P = ({ p, titulo, icone: Icone }: { p: Pessoa; titulo: string; icone: typeof User }) => (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-[1.1rem]">
        <Icone size={15} className="text-brand" />
        {titulo}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome completo" largura="sm:col-span-2">
          <input className="field" value={f[`${p}Nome`]} onChange={(e) => set(`${p}Nome`)(e.target.value)} placeholder="Nome e sobrenome" />
        </Campo>
        <Campo rotulo="CPF">
          <input className="field" inputMode="numeric" value={f[`${p}Cpf`]} onChange={(e) => set(`${p}Cpf`)(fmtCPF(e.target.value))} placeholder="000.000.000-00" />
        </Campo>
        <Campo rotulo="RG">
          <input className="field" value={f[`${p}Rg`]} onChange={(e) => set(`${p}Rg`)(e.target.value)} placeholder="0000000000" />
        </Campo>
        <Campo rotulo="Data de nascimento">
          <input className="field" type="date" value={f[`${p}Nascimento`]} onChange={(e) => set(`${p}Nascimento`)(e.target.value)} />
        </Campo>
        <Campo rotulo="Telefone / WhatsApp">
          <input className="field" inputMode="tel" value={f[`${p}Telefone`]} onChange={(e) => set(`${p}Telefone`)(fmtTelefone(e.target.value))} placeholder="(51) 99999-0000" />
        </Campo>
        <Campo rotulo="E-mail" largura="sm:col-span-2">
          <input className="field" type="email" value={f[`${p}Email`]} onChange={(e) => set(`${p}Email`)(e.target.value)} placeholder="nome@email.com" />
        </Campo>
        <Campo rotulo="Estado civil">
          <select className="field" value={f[`${p}EstadoCivil`]} onChange={(e) => set(`${p}EstadoCivil`)(e.target.value)}>
            <option value="">Selecionar…</option>
            {ESTADOS_CIVIS.map((ec) => (
              <option key={ec} value={ec}>{ec}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Profissão">
          <input className="field" value={f[`${p}Profissao`]} onChange={(e) => set(`${p}Profissao`)(e.target.value)} placeholder="Profissão" />
        </Campo>
        <Campo rotulo="Endereço atual" largura="sm:col-span-2">
          <input className="field" value={f[`${p}Endereco`]} onChange={(e) => set(`${p}Endereco`)(e.target.value)} placeholder="Rua, número, bairro, cidade" />
        </Campo>
      </div>
      <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
        <AnexoBtn rotulo="Foto do RG ou CNH" nome={docs[`${p}Rg`]} onFile={(n) => setDocs((d) => ({ ...d, [`${p}Rg`]: n }))} />
        <AnexoBtn rotulo="Comprovante de residência" nome={docs[`${p}Residencia`]} onFile={(n) => setDocs((d) => ({ ...d, [`${p}Residencia`]: n }))} />
      </div>
    </section>
  );

  return (
    <>
      <div className="grid gap-3.5 xl:grid-cols-3">
        <div className="space-y-3.5 xl:col-span-2">
          <div className="grid gap-3.5 lg:grid-cols-2">
            <P p="loc" titulo="Locatário" icone={User} />
            <P p="prop" titulo="Proprietário" icone={UserCheck} />
          </div>

          {/* Recebimento do proprietário */}
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-[1.1rem]">
              <Banknote size={15} className="text-brand" />
              Depósito do repasse ao proprietário
            </h2>
            <div className="flex gap-2">
              {(["PIX", "TRANSFERENCIA"] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => set("recebimento")(op)}
                  className={`rounded-full border px-4 py-1.5 text-[0.76rem] transition-colors ${
                    f.recebimento === op
                      ? "border-brand/50 bg-brand-faint text-brand"
                      : "border-[var(--hairline)] text-ink-3 hover:text-ink-2"
                  }`}
                >
                  {op === "PIX" ? "PIX" : "Transferência bancária"}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {f.recebimento === "PIX" ? (
                <Campo rotulo="Chave PIX" largura="sm:col-span-3">
                  <input className="field" value={f.pixChave} onChange={(e) => set("pixChave")(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
                </Campo>
              ) : (
                <>
                  <Campo rotulo="Banco">
                    <input className="field" value={f.banco} onChange={(e) => set("banco")(e.target.value)} placeholder="Ex.: Banrisul" />
                  </Campo>
                  <Campo rotulo="Agência">
                    <input className="field" value={f.agencia} onChange={(e) => set("agencia")(e.target.value)} placeholder="0000" />
                  </Campo>
                  <Campo rotulo="Conta">
                    <input className="field" value={f.conta} onChange={(e) => set("conta")(e.target.value)} placeholder="00000-0" />
                  </Campo>
                </>
              )}
            </div>
          </section>

          {/* Imóvel */}
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-[1.1rem]">
              <Home size={15} className="text-brand" />
              Imóvel e documentação
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Endereço do imóvel" largura="sm:col-span-2">
                <input className="field" value={f.imovelEndereco} onChange={(e) => set("imovelEndereco")(e.target.value)} placeholder="Rua, número, complemento" />
              </Campo>
              <Campo rotulo="Bairro">
                <input className="field" value={f.imovelBairro} onChange={(e) => set("imovelBairro")(e.target.value)} placeholder="Bairro" />
              </Campo>
              <Campo rotulo="Matrícula do imóvel">
                <input className="field" value={f.matricula} onChange={(e) => set("matricula")(e.target.value)} placeholder="Nº da matrícula no RI" />
              </Campo>
              <Campo rotulo="Aluguel (R$/mês)">
                <input className="field" inputMode="numeric" value={f.valor} onChange={(e) => set("valor")(e.target.value.replace(/\D/g, ""))} placeholder="1500" />
              </Campo>
              <Campo rotulo="Dia de vencimento">
                <input className="field" inputMode="numeric" value={f.diaVencimento} onChange={(e) => set("diaVencimento")(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="10" />
              </Campo>
            </div>

            <label className="mt-3.5 flex items-center gap-2 text-[0.78rem] text-ink-2">
              <input
                type="checkbox"
                checked={f.temCondominio}
                onChange={(e) => set("temCondominio")(e.target.checked)}
                className="h-4 w-4 accent-[#ed1e8f]"
              />
              O imóvel tem condomínio
            </label>
            {f.temCondominio && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Campo rotulo="Valor do condomínio (R$)">
                  <input className="field" inputMode="numeric" value={f.condominioValor} onChange={(e) => set("condominioValor")(e.target.value.replace(/\D/g, ""))} placeholder="350" />
                </Campo>
                <div className="sm:pt-5">
                  <AnexoBtn rotulo="Boleto do condomínio" nome={docs.condominio} onFile={(n) => setDocs((d) => ({ ...d, condominio: n }))} />
                </div>
              </div>
            )}

            <div className="mt-3.5 grid gap-2 sm:grid-cols-3">
              <AnexoBtn rotulo="Matrícula do imóvel" nome={docs.matricula} onFile={(n) => setDocs((d) => ({ ...d, matricula: n }))} />
              <AnexoBtn rotulo="IPTU" nome={docs.iptu} onFile={(n) => setDocs((d) => ({ ...d, iptu: n }))} />
              <AnexoBtn rotulo="Conta de luz (titularidade → locatário)" nome={docs.luz} onFile={(n) => setDocs((d) => ({ ...d, luz: n }))} />
            </div>
          </section>
        </div>

        {/* Checklist de validação */}
        <aside className="card h-fit p-5 xl:sticky xl:top-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-[1.1rem]">
            <FileSignature size={15} className="text-brand" />
            Validação da ficha
          </h2>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-display text-[1.6rem] leading-none">{pct}%</span>
            <span className="font-mono text-[0.66rem] text-ink-3">
              {feitos}/{checks.length} itens
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--soft-2)]">
            <div
              className={`h-full rounded-full transition-all ${completo ? "bg-ok/80" : "bg-gradient-to-r from-[#ff77bd] to-[#ed1e8f]"}`}
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>

          <ul className="mt-3.5 max-h-[300px] space-y-1 overflow-y-auto pr-1">
            {checks.map((c) => (
              <li key={c.r} className={`flex items-center gap-2 text-[0.7rem] ${c.ok ? "text-ok" : "text-ink-3"}`}>
                {c.ok ? <CheckCircle2 size={11} className="shrink-0" /> : <Circle size={11} className="shrink-0" />}
                <span className={c.ok ? "line-through opacity-70" : ""}>{c.r}</span>
              </li>
            ))}
          </ul>

          <button className="btn-brand mt-4 w-full justify-center" disabled={!completo || pendente} onClick={enviar}>
            <ScrollText size={15} />
            {pendente ? "Gerando contrato…" : completo ? "Gerar contrato agora" : `Faltam ${checks.length - feitos} itens`}
          </button>
          <p className="mt-2 text-center text-[0.64rem] leading-relaxed text-ink-3">
            Ao gerar: contrato pronto para a conferência da Paola, documentos na pasta digital e
            boas-vindas no WhatsApp do locatário — tudo em 1 clique.
          </p>
        </aside>
      </div>

      {/* Contrato gerado */}
      {resultado && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setResultado(null)}>
          <div className="card flex max-h-[88vh] w-full max-w-3xl flex-col p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[1.25rem]">
                Contrato <span className="text-brand">{resultado.codigo}</span> gerado ✓
              </h3>
              <button className="text-ink-3 hover:text-ink" onClick={() => setResultado(null)}>
                <X size={17} />
              </button>
            </div>
            <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--hairline)] bg-[var(--soft)] p-4 font-sans text-[0.74rem] leading-relaxed text-ink-2">
              {resultado.texto}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="btn-ghost"
                onClick={() => {
                  navigator.clipboard.writeText(resultado.texto);
                  toast.success("Texto do contrato copiado.");
                }}
              >
                <Copy size={13} />
                Copiar texto
              </button>
              <Link href="/contratos" className="btn-ghost">
                Ver no quadro de contratos
              </Link>
              <Link href="/documentos" className="btn-ghost">
                Ver pasta de documentos
              </Link>
              <button
                className="btn-brand ml-auto"
                onClick={() => {
                  setResultado(null);
                  setF(VAZIO);
                  setDocs(DOCS_VAZIO);
                }}
              >
                Nova ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
