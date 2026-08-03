import { fmtHora } from "@/lib/dates";

/** Converte *negrito* do WhatsApp e quebras de linha */
export function WaTexto({ texto }: { texto: string }) {
  const partes = texto.split(/(\*[^*\n]+\*)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <strong key={i} className="font-semibold">
            {p.slice(1, -1)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export function WaBolha({
  texto,
  hora,
  direcao = "out",
}: {
  texto: string;
  hora?: Date | string;
  direcao?: "out" | "in";
}) {
  const horaFmt = hora instanceof Date ? fmtHora(hora) : hora;
  return (
    <div className={`wa-bubble ${direcao === "out" ? "wa-out" : "wa-in"}`}>
      <WaTexto texto={texto} />
      {horaFmt && (
        <span className="mt-1 flex items-center justify-end gap-1 text-[0.62rem] opacity-60">
          {horaFmt}
          {direcao === "out" && <span className="text-[#7fd1e8]">✓✓</span>}
        </span>
      )}
    </div>
  );
}

/** Moldura de celular para previews */
export function Celular({ children, titulo }: { children: React.ReactNode; titulo?: string }) {
  return (
    <div className="celular mx-auto w-full max-w-[300px] rounded-[1.6rem] border border-[var(--hairline)] bg-[#0b141a] shadow-phone overflow-hidden">
      <div className="flex items-center gap-2 bg-[#1f2c33] px-3.5 py-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#ff77bd] to-[#b70f6e] text-[0.6rem] font-bold text-[#ffffff]">
          VB
        </span>
        <div className="leading-tight">
          <div className="text-[0.72rem] font-medium text-[#e9edef]">
            {titulo ?? "VeraBrokers"}
          </div>
          <div className="text-[0.58rem] text-[#8696a0]">online agora</div>
        </div>
      </div>
      <div
        className="space-y-2 px-3 py-3.5 min-h-[180px]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.028) 1px, transparent 1.2px)",
          backgroundSize: "18px 18px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
