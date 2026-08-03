"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";
import { perguntarAnalista } from "@/app/actions";
import { WaTexto } from "@/components/wa";

type Msg = { de: "ai" | "user"; texto: string; hora?: string };

const CHIPS = [
  "Resumo do dia",
  "Como estão as entregas?",
  "Contas a pagar e receber",
  "Notas fiscais",
  "Situação dos proprietários",
  "Carga da equipe",
  "Riscos e pendências",
];

export default function AnalistaChat({
  inicial,
}: {
  inicial: { resposta: string; hora: string };
}) {
  const [msgs, setMsgs] = useState<Msg[]>([{ de: "ai", texto: inicial.resposta, hora: inicial.hora }]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [, start] = useTransition();
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, pensando]);

  function perguntar(q: string) {
    const pergunta = q.trim();
    if (!pergunta || pensando) return;
    setTexto("");
    setMsgs((m) => [...m, { de: "user", texto: pergunta }]);
    setPensando(true);
    start(async () => {
      try {
        const r = await perguntarAnalista(pergunta);
        setMsgs((m) => [...m, { de: "ai", texto: r.resposta, hora: r.hora }]);
      } catch {
        setMsgs((m) => [
          ...m,
          { de: "ai", texto: "Não consegui consultar o banco agora — tente de novo em instantes." },
        ]);
      } finally {
        setPensando(false);
      }
    });
  }

  return (
    <div className="card overflow-hidden">
      {/* cabeçalho */}
      <div className="flex items-center gap-3 px-5 py-4 hairline-b bg-[var(--soft)]">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#ff77bd] to-[#b70f6e] text-white shadow-glow">
          <Sparkles size={16} />
        </span>
        <div>
          <div className="font-display text-[1.05rem] leading-tight">Analista da Operação</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.66rem] text-ink-3">
            <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse-dot" />
            conectado ao banco em tempo real
          </div>
        </div>
      </div>

      {/* conversa */}
      <div className="max-h-[520px] min-h-[360px] overflow-y-auto px-4 sm:px-5 py-5 space-y-4">
        {msgs.map((m, i) =>
          m.de === "ai" ? (
            <div key={i} className="flex gap-2.5 pr-2 sm:pr-10">
              <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#ff77bd] to-[#b70f6e] text-white">
                <Sparkles size={11} />
              </span>
              <div className="min-w-0 max-w-[46rem] rounded-2xl rounded-tl-md border border-[var(--hairline)] bg-[var(--bg-overlay)] px-4 py-3 text-[0.82rem] leading-relaxed whitespace-pre-wrap">
                <WaTexto texto={m.texto} />
                {m.hora && (
                  <div className="mt-2 text-right font-mono text-[0.6rem] text-ink-3">{m.hora}</div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end pl-10 sm:pl-24">
              <div className="max-w-[32rem] rounded-2xl rounded-tr-md bg-gradient-to-br from-[#ff77bd] to-[#ed1e8f] px-4 py-2.5 text-[0.82rem] font-medium text-white">
                {m.texto}
              </div>
            </div>
          )
        )}
        {pensando && (
          <div className="flex items-center gap-2.5 pl-9 text-[0.72rem] text-ink-3">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-dot" />
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-dot" style={{ animationDelay: "180ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-dot" style={{ animationDelay: "360ms" }} />
            consultando o banco…
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {/* perguntas rápidas + campo */}
      <div className="px-4 sm:px-5 pb-4 pt-1 space-y-3 border-t border-[var(--hairline)] bg-[var(--soft)]">
        <div className="flex flex-wrap gap-1.5 pt-3">
          {CHIPS.map((c) => (
            <button
              key={c}
              className="rounded-full border border-brand/35 bg-brand-faint px-3 py-1.5 text-[0.7rem] text-brand hover:bg-brand/15 transition-colors disabled:opacity-50"
              onClick={() => perguntar(c)}
              disabled={pensando}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="field flex-1"
            placeholder="Pergunte qualquer coisa sobre a operação…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && perguntar(texto)}
          />
          <button
            className="btn-brand !px-3.5 !py-2.5"
            onClick={() => perguntar(texto)}
            disabled={!texto.trim() || pensando}
            aria-label="Enviar pergunta"
          >
            <SendHorizonal size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
