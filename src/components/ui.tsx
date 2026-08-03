import type { LucideIcon } from "lucide-react";

export function TituloPagina({
  sobre,
  titulo,
  children,
  compacto = false,
}: {
  sobre: string;
  titulo: React.ReactNode;
  children?: React.ReactNode;
  compacto?: boolean;
}) {
  return (
    <header
      className={`${compacto ? "mb-4" : "mb-7"} flex flex-wrap items-end justify-between gap-3 animate-fade-up`}
    >
      <div>
        <div className="mb-1 text-[0.66rem] uppercase tracking-[0.22em] text-brand/80">{sobre}</div>
        <h1
          className={`font-display leading-[1.05] tracking-tight ${
            compacto ? "text-[1.55rem] sm:text-[1.85rem]" : "text-[1.9rem] sm:text-[2.3rem]"
          }`}
        >
          {titulo}
        </h1>
      </div>
      {children && <div className="flex items-center gap-2.5">{children}</div>}
    </header>
  );
}

export function Kpi({
  rotulo,
  valor,
  detalhe,
  icon: Icon,
  destaque = false,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: string;
  icon: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <div className={`card px-5 py-4 ${destaque ? "shadow-glow border-brand/30" : ""}`}>
      <div className="flex items-center justify-between text-ink-3">
        <span className="text-[0.68rem] uppercase tracking-[0.14em]">{rotulo}</span>
        <Icon size={15} className={destaque ? "text-brand" : ""} />
      </div>
      <div className="mt-2 font-display text-[2rem] leading-none tracking-tight">
        {valor}
      </div>
      {detalhe && <div className="mt-1.5 text-[0.72rem] text-ink-3">{detalhe}</div>}
    </div>
  );
}

export function Chip({
  children,
  tom = "neutro",
}: {
  children: React.ReactNode;
  tom?: "neutro" | "ouro" | "ok" | "info" | "aviso";
}) {
  const cores: Record<string, string> = {
    neutro: "border-[var(--hairline)] text-ink-3",
    ouro: "border-brand/40 text-brand bg-brand-faint",
    ok: "border-ok/30 text-ok bg-ok/5",
    info: "border-info/30 text-info bg-info/10",
    aviso: "border-warn/30 text-warn bg-warn/5",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.08em] ${cores[tom]}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ nome, cor, tamanho = 30 }: { nome: string; cor: string; tamanho?: number }) {
  const iniciais = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold"
      style={{
        width: tamanho,
        height: tamanho,
        background: `${cor}26`,
        color: cor,
        fontSize: tamanho * 0.36,
        border: `1px solid ${cor}55`,
      }}
    >
      {iniciais}
    </span>
  );
}

export function Vazio({ titulo, dica }: { titulo: string; dica?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--hairline)] px-6 py-10 text-center">
      <div className="text-sm text-ink-2">{titulo}</div>
      {dica && <div className="mt-1 text-[0.72rem] text-ink-3">{dica}</div>}
    </div>
  );
}
