"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  FileSignature,
  KeyRound,
  MessagesSquare,
  Sparkles,
  Sun,
  Users,
  Zap,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Hoje", icon: Sun },
  { href: "/contratos", label: "Contratos", icon: FileSignature },
  { href: "/mensagens", label: "Mensagens", icon: MessagesSquare },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/regras", label: "Régua", icon: Zap },
  { href: "/recepcao", label: "Recepção IA", icon: Bot },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-[var(--hairline)] bg-[rgba(14,10,17,0.7)] backdrop-blur-xl fixed inset-y-0 z-20">
        <div className="px-6 pt-7 pb-6 hairline-b">
          <Link href="/" className="block group">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#ff77bd] to-[#b70f6e] text-[#ffffff] shadow-glow">
                <KeyRound size={17} strokeWidth={2.2} />
              </span>
              <div>
                <div className="font-display text-[1.35rem] leading-none tracking-tight">
                  Imobi<span className="text-brand">PRO</span>
                </div>
                <div className="mt-1 text-[0.62rem] uppercase tracking-[0.18em] text-ink-3">
                  VeraBrokers · Gravataí
                </div>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const ativo = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.86rem] transition-colors ${
                  ativo
                    ? "text-ink bg-brand-faint"
                    : "text-ink-2 hover:text-ink hover:bg-white/[0.03]"
                }`}
              >
                {ativo && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2.5px] rounded-full bg-brand" />
                )}
                <Icon size={16} strokeWidth={2} className={ativo ? "text-brand" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-5 hairline-b border-t border-[var(--hairline)] text-[0.68rem] text-ink-3 leading-relaxed">
          <div className="flex items-center gap-1.5 text-brand/80 mb-1">
            <Sparkles size={11} />
            <span className="uppercase tracking-[0.15em]">Demonstração</span>
          </div>
          Preparado pela <span className="text-ink-2">P2A Tech</span> para a equipe
          VeraBrokers.
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 lg:pl-60 w-full">
        <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pt-6 pb-28 lg:pb-14">
          {children}
        </main>
      </div>

      {/* Nav mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--hairline)] bg-[rgba(14,10,17,0.88)] backdrop-blur-xl">
        <div className="grid grid-cols-6">
          {NAV.map(({ href, label, icon: Icon }) => {
            const ativo = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[0.58rem] ${
                  ativo ? "text-brand" : "text-ink-3"
                }`}
              >
                <Icon size={17} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
