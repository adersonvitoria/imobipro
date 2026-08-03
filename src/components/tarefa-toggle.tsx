"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { alternarTarefa } from "@/app/actions";

export default function TarefaToggle({
  id,
  titulo,
  hora,
  concluida: inicial,
}: {
  id: string;
  titulo: string;
  hora: string | null;
  concluida: boolean;
}) {
  const [concluida, setConcluida] = useState(inicial);
  const [, start] = useTransition();
  const router = useRouter();

  return (
    <button
      className="group flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.03]"
      onClick={() => {
        setConcluida((v) => !v);
        start(async () => {
          await alternarTarefa(id);
          router.refresh();
        });
      }}
    >
      <span
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
          concluida
            ? "border-ok/60 bg-ok/20 text-ok"
            : "border-[var(--hairline)] text-transparent group-hover:border-brand/40"
        }`}
      >
        <Check size={10} strokeWidth={3} />
      </span>
      <span
        className={`text-[0.78rem] leading-snug ${
          concluida ? "text-ink-3 line-through" : "text-ink-2"
        }`}
      >
        {hora && <span className="font-mono text-ink-3">{hora} · </span>}
        {titulo}
      </span>
    </button>
  );
}
