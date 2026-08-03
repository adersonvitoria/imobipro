"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function aplicar(claro: boolean) {
  document.documentElement.classList.toggle("claro", claro);
  try {
    localStorage.setItem("imobipro-tema", claro ? "claro" : "escuro");
  } catch {}
}

export default function ThemeToggle({ variante = "completo" }: { variante?: "completo" | "icone" }) {
  const [claro, setClaro] = useState<boolean | null>(null);

  useEffect(() => {
    setClaro(document.documentElement.classList.contains("claro"));
  }, []);

  function alternar() {
    const novo = !claro;
    setClaro(novo);
    aplicar(novo);
  }

  const Icone = claro ? Moon : Sun;

  if (variante === "icone") {
    return (
      <button
        onClick={alternar}
        aria-label={claro ? "Mudar para tema escuro" : "Mudar para tema claro"}
        className="grid h-10 w-10 place-items-center rounded-full border border-[var(--hairline)] bg-[var(--shell-2)] backdrop-blur-xl text-ink-2 hover:text-brand transition-colors shadow-card"
      >
        <Icone size={16} />
      </button>
    );
  }

  return (
    <button onClick={alternar} className="btn-ghost w-full justify-center !text-[0.74rem]">
      <Icone size={13} />
      {claro === null ? "Tema" : claro ? "Tema escuro" : "Tema claro"}
    </button>
  );
}
