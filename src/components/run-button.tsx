"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { rodarAgora } from "@/app/actions";

export default function RunButton() {
  const [pendente, start] = useTransition();
  const router = useRouter();

  return (
    <button
      className="btn-brand"
      disabled={pendente}
      onClick={() =>
        start(async () => {
          const r = await rodarAgora();
          if (r.criadas > 0) {
            toast.success(`⚡ ${r.criadas} mensagens disparadas agora`, {
              description:
                r.puladas > 0
                  ? `${r.puladas} já haviam sido enviadas hoje (nada duplica).`
                  : "Entregas, lembretes, repasses e agendas — tudo sem ninguém digitar.",
            });
          } else {
            toast.info("Tudo em dia por aqui ✓", {
              description: `Os ${r.puladas} disparos de hoje já foram feitos — o sistema nunca duplica.`,
            });
          }
          router.refresh();
        })
      }
    >
      <Zap size={15} strokeWidth={2.4} className={pendente ? "animate-pulse-dot" : ""} />
      {pendente ? "Disparando…" : "Rodar disparos de hoje"}
    </button>
  );
}
