"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, SendHorizonal } from "lucide-react";
import { consultarCobranca, consultarSinistro, criarChamado } from "@/app/actions";
import { Celular, WaBolha } from "@/components/wa";

type Msg = { de: "bot" | "user"; texto: string; hora: string };
type Fase = "menu" | "nome" | "detalhe" | "faq" | "fim";

const FAQS = [
  {
    q: "Como troco o titular do contrato?",
    a: "É simples! Alterações de contrato são com a *Paola*. Me confirma o número do contrato (ou seu nome completo) que eu já abro a solicitação — o aditivo chega pra você assinar digitalmente, sem precisar vir na loja. 📝",
  },
  {
    q: "Quando cai o repasse do proprietário?",
    a: "O repasse é processado todo *dia 5* e cai em conta em até 1 dia útil. Se o aluguel do mês atrasar, você recebe automaticamente o status da cobrança — sem precisar perguntar. 💰",
  },
  {
    q: "Como abro chamado de manutenção?",
    a: "Direto por aqui! Escolhe *Manutenção / reparo* no menu, descreve o problema em uma frase e a *Aline* recebe o chamado na hora, com retorno ainda hoje. 🔧",
  },
  {
    q: "Qual o prazo do caução?",
    a: "Após a vistoria de saída aprovada, a devolução do caução acontece em até *30 dias*, com correção. Você acompanha cada etapa por aqui. 🤝",
  },
  {
    q: "Como envio meus documentos?",
    a: "Manda a *foto aqui mesmo* que eu anexo na sua pasta digital na hora ✅ RG, CPF, comprovantes — tudo fica guardado no seu contrato, com confirmação automática e sem grupo de WhatsApp. 📎",
  },
];

const OPCOES = [
  { chave: "boleto", rotulo: "💳 2ª via de boleto" },
  { chave: "manutencao", rotulo: "🔧 Manutenção / reparo" },
  { chave: "desocupacao", rotulo: "📦 Desocupação" },
  { chave: "sinistro", rotulo: "🛡 Status de sinistro (seguro-fiança)" },
  { chave: "repasse", rotulo: "💰 Sou proprietário — repasse" },
  { chave: "chaves", rotulo: "🔑 Entrega de chaves" },
  { chave: "faq", rotulo: "❓ Dúvidas rápidas" },
] as const;

const SAUDACAO =
  "Oi! Eu sou a recepção digital da *VeraBrokers* 🏠✨\nRespondo na hora, 24h. Me diz o que você precisa:";

function agora(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

export default function RecepcaoChat() {
  const [msgs, setMsgs] = useState<Msg[]>([{ de: "bot", texto: SAUDACAO, hora: "" }]);
  const [fase, setFase] = useState<Fase>("menu");
  const [setor, setSetor] = useState<string>("");
  const [nome, setNome] = useState<string>("");
  const [texto, setTexto] = useState("");
  const [digitando, setDigitando] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, digitando, fase]);

  function bot(textos: string[], depois?: () => void) {
    setDigitando(true);
    let atraso = 650;
    textos.forEach((t, i) => {
      setTimeout(() => {
        setMsgs((m) => [...m, { de: "bot", texto: t, hora: agora() }]);
        if (i === textos.length - 1) {
          setDigitando(false);
          depois?.();
        }
      }, atraso);
      atraso += 900;
    });
  }

  function abrirChamado(s: string, n: string, resumo: string, resposta: string[]) {
    start(async () => {
      const r = await criarChamado(s, n, resumo);
      bot(resposta, () => setFase("fim"));
      if (r.ok) {
        toast.success("📥 Chamado real criado no sistema", {
          description: `${r.responsavel} recebeu a tarefa e a notificação — veja no painel ao lado.`,
        });
        router.refresh();
      }
    });
  }

  function escolher(chave: string, rotulo: string) {
    if (digitando) return;
    setMsgs((m) => [...m, { de: "user", texto: rotulo, hora: agora() }]);
    if (chave === "faq") {
      bot(["Claro! Escolhe uma dúvida frequente aqui embaixo: 👇"], () => setFase("faq"));
      return;
    }
    setSetor(chave);
    setFase("nome");
    bot(["Perfeito! Me diz seu *nome*, por favor? 😊"]);
  }

  function responderFaq(f: (typeof FAQS)[number]) {
    if (digitando) return;
    setMsgs((m) => [...m, { de: "user", texto: f.q, hora: agora() }]);
    bot([f.a, "Mais alguma dúvida? É só escolher 👇"], () => setFase("faq"));
  }

  function enviar() {
    const v = texto.trim();
    if (!v || digitando) return;
    setTexto("");
    setMsgs((m) => [...m, { de: "user", texto: v, hora: agora() }]);

    if (fase === "nome") {
      setNome(v);
      const primeiro = v.split(" ")[0];
      if (setor === "boleto") {
        abrirChamado("boleto", v, "2ª via de boleto solicitada", [
          `Prontinho, ${primeiro}! 📄 Localizei seu cadastro e a *2ª via do boleto* chega aqui em instantes.`,
          "Também avisei a *Claudete, do financeiro* — se precisar de negociação ou comprovante, ela já está com seu nome na tela. Algo mais?",
        ]);
      } else if (setor === "repasse") {
        const nomeV = v;
        start(async () => {
          const r = await consultarCobranca();
          if (r.ok) {
            bot(
              [
                `Verifiquei aqui, ${primeiro}. 💰 O repasse do imóvel *${r.imovel}* está aguardando a regularização do aluguel do mês.`,
                `📢 Status da cobrança: *${r.status}*\n💵 Valor em aberto: ${r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}\n⏳ Previsão: ${r.previsao}\n\nAssim que o pagamento entrar, seu repasse sai no mesmo dia — e você é avisado(a) de cada movimento. Acabei de te enviar o status completo por mensagem.`,
                "Posso ajudar com mais algo?",
              ],
              () => setFase("fim")
            );
            toast.success("📢 Status da cobrança enviado ao proprietário", {
              description: "A resposta que hoje ninguém dá — agora sai sozinha, na hora.",
            });
            router.refresh();
          } else {
            abrirChamado("repasse", nomeV, "Proprietário pediu posição do repasse", [
              `Tudo certo, ${primeiro}! 💰 Seu repasse está em dia — a *Claudete, do financeiro,* te envia o extrato em instantes.`,
              "Proprietário VeraBrokers *não fica sem resposta* 😉 Posso ajudar com mais algo?",
            ]);
          }
        });
      } else if (setor === "sinistro") {
        start(async () => {
          const r = await consultarSinistro(v);
          if (r.ok) {
            bot(
              [
                `Encontrei, ${primeiro}! 🛡 Sinistro do imóvel *${r.imovel}*:\n\n📄 Protocolo: ${r.protocolo} · ${r.seguradora}\n📌 Status: *${r.status}* (aberto há ${r.dias} dia${r.dias === 1 ? "" : "s"})\n⏳ Previsão: até ${r.previsaoDias} dias`,
                "Acabei de enviar esse status pro WhatsApp do proprietário também — e ele será avisado automaticamente a cada mudança. Posso ajudar com mais algo?",
              ],
              () => setFase("fim")
            );
            toast.success("🛡 Status consultado e enviado ao proprietário", {
              description: "Na versão final, a resposta vem direto da API da Loft/Porto Seguro.",
            });
            router.refresh();
          } else {
            bot(
              ["Boa notícia: não há nenhum sinistro em andamento por aqui ✅ Precisa acionar o seguro-fiança? A *Aline* cuida disso pra você. Algo mais?"],
              () => setFase("fim")
            );
          }
        });
      } else if (setor === "chaves") {
        abrirChamado("chaves", v, "Cliente perguntou sobre entrega de chaves", [
          `${primeiro}, suas chaves já estão *programadas*! 🔑 Você recebe aviso automático na *véspera* e no *dia da entrega*, com hora, local e com quem retirar.`,
          "Não precisa ligar pra ninguém — a gente te avisa. Mais alguma coisa?",
        ]);
      } else if (setor === "manutencao") {
        setFase("detalhe");
        bot([`Certo, ${primeiro}! 🔧 Me descreve rapidinho o problema (ex.: torneira pingando na cozinha):`]);
      } else {
        setFase("detalhe");
        bot([`Entendi, ${primeiro}. 📦 Me conta em uma frase o que você precisa sobre a desocupação:`]);
      }
      return;
    }

    if (fase === "detalhe") {
      const primeiro = nome.split(" ")[0];
      if (setor === "manutencao") {
        abrirChamado("manutencao", nome, v, [
          `Chamado aberto, ${primeiro}! 🔧 A *Aline, da manutenção,* recebeu sua solicitação agora no WhatsApp dela.`,
          "Ela te retorna *ainda hoje* com o agendamento. Posso ajudar com mais algo?",
        ]);
      } else {
        abrirChamado("desocupacao", nome, v, [
          `Anotado, ${primeiro}! A *Aline, que cuida das desocupações,* recebeu seu caso agora e te retorna hoje.`,
          "Você também vai receber o *passo a passo da desocupação* por aqui, etapa por etapa. Algo mais?",
        ]);
      }
      return;
    }

    // fase "fim" — qualquer texto volta ao menu
    bot(["Claro! É só escolher uma opção: 👇"], () => setFase("menu"));
  }

  function reiniciar() {
    setMsgs([{ de: "bot", texto: SAUDACAO, hora: agora() }]);
    setFase("menu");
    setSetor("");
    setNome("");
    setTexto("");
  }

  const mostraChips = fase === "menu" || fase === "fim";

  return (
    <div>
      <Celular titulo="VeraBrokers · Recepção">
        <div className="max-h-[380px] min-h-[300px] overflow-y-auto space-y-2 pr-1">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.de === "user" ? "justify-end pl-8" : "justify-start pr-8"}`}>
              <WaBolha texto={m.texto} hora={m.hora || agora()} direcao={m.de === "user" ? "out" : "in"} />
            </div>
          ))}
          {digitando && (
            <div className="flex justify-start pr-8">
              <div className="wa-bubble wa-in flex items-center gap-1 !py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8696a0] animate-pulse-dot" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#8696a0] animate-pulse-dot" style={{ animationDelay: "200ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#8696a0] animate-pulse-dot" style={{ animationDelay: "400ms" }} />
              </div>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {mostraChips && !digitando && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {OPCOES.map((o) => (
              <button
                key={o.chave}
                className="rounded-full border border-[#00a884]/50 bg-[#00a884]/10 px-2.5 py-1 text-[0.66rem] text-[#7fdec4] hover:bg-[#00a884]/20 transition-colors"
                onClick={() => escolher(o.chave, o.rotulo)}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
        )}

        {fase === "faq" && !digitando && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {FAQS.map((f) => (
              <button
                key={f.q}
                className="rounded-full border border-[#00a884]/50 bg-[#00a884]/10 px-2.5 py-1 text-[0.66rem] text-[#7fdec4] hover:bg-[#00a884]/20 transition-colors"
                onClick={() => responderFaq(f)}
              >
                {f.q}
              </button>
            ))}
            <button
              className="rounded-full border border-[var(--hairline)] px-2.5 py-1 text-[0.66rem] text-[#8696a0] hover:text-[#e9edef] transition-colors"
              onClick={() => {
                bot(["O que mais posso fazer por você? 👇"], () => setFase("fim"));
              }}
            >
              ⬅ menu
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1.5">
          <input
            className="flex-1 rounded-full bg-[#2a3942] px-3.5 py-2 text-[0.76rem] text-[#e9edef] placeholder:text-[#8696a0] outline-none"
            placeholder={
              fase === "nome" ? "Digite seu nome…" : fase === "detalhe" ? "Descreva rapidinho…" : "Mensagem"
            }
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
          />
          <button
            className="grid h-8 w-8 place-items-center rounded-full bg-[#00a884] text-[#0b141a] disabled:opacity-50"
            onClick={enviar}
            disabled={!texto.trim() || digitando}
          >
            <SendHorizonal size={14} />
          </button>
        </div>
      </Celular>

      <div className="mt-3 text-center">
        <button className="btn-ghost !text-[0.68rem]" onClick={reiniciar}>
          <RotateCcw size={11} />
          recomeçar conversa
        </button>
      </div>
    </div>
  );
}
