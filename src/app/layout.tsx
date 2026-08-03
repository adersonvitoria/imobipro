import type { Metadata } from "next";
import { Archivo, Fraunces, Spline_Sans_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Shell from "@/components/shell";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});
const sans = Archivo({ subsets: ["latin"], variable: "--font-sans" });
const mono = Spline_Sans_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "VeraBrokers — Central Inteligente de Locação",
  description:
    "Locação no piloto automático: entregas de chave, boletos, repasses, cobranças, documentos e a agenda da equipe — tudo disparado sozinho, todos os dias.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('imobipro-tema')==='claro')document.documentElement.classList.add('claro')}catch(e){}",
          }}
        />
      </head>
      <body className="font-sans min-h-screen">
        <div className="bg-atmo" aria-hidden />
        <div className="bg-grain" aria-hidden />
        <Shell>{children}</Shell>
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--bg-overlay)",
              border: "1px solid var(--hairline)",
              color: "var(--ink)",
            },
          }}
        />
      </body>
    </html>
  );
}
