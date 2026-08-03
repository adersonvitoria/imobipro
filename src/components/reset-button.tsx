"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { resetDemo } from "@/app/actions";

export default function ResetButton() {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, start] = useTransition();
  const router = useRouter();

  if (!confirmando) {
    return (
      <button className="btn-ghost" onClick={() => setConfirmando(true)} title="Restaura os dados de demonstração">
        <RotateCcw size={13} />
        Reiniciar demo
      </button>
    );
  }

  return (
    <button
      className="btn-ghost !border-warn/40 !text-warn"
      disabled={pendente}
      onClick={() =>
        start(async () => {
          await resetDemo();
          setConfirmando(false);
          toast.success("Demonstração restaurada ao estado original ✨");
          router.refresh();
        })
      }
      onBlur={() => setConfirmando(false)}
    >
      <RotateCcw size={13} className={pendente ? "animate-spin" : ""} />
      {pendente ? "Restaurando…" : "Confirmar reinício?"}
    </button>
  );
}
