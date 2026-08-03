import { TituloPagina } from "@/components/ui";
import FichaForm from "@/components/ficha-form";

export default function Ficha() {
  return (
    <div>
      <TituloPagina
        compacto
        sobre="cadastro único — adeus, 3 fichas"
        titulo={
          <>
            Ficha digital que <span className="text-brand">gera o contrato</span>
          </>
        }
      />
      <p className="-mt-2 mb-5 max-w-3xl text-[0.86rem] text-ink-2 animate-fade-up">
        Locatário, proprietário, dados de repasse e documentos do imóvel — validados em tempo real.
        Preencheu e anexou tudo? O contrato sai pronto, os documentos entram na pasta digital e a
        Paola só confere.
      </p>
      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <FichaForm />
      </div>
    </div>
  );
}
