# ImobiPRO — Central de Locação Automática

> **Demo preparada para a VeraBrokers (Gravataí/RS).** Entregas de chave, boletos, repasses,
> desocupação e a agenda da equipe — disparados sozinhos no WhatsApp, todos os dias.
> Ninguém mais precisa lembrar quem tem que fazer o quê.

## O problema que resolve

- O inquilino cobra **o corretor** até a chave ser entregue — mesmo não sendo ele quem entrega.
- O proprietário (o cliente mais importante) fica **sem retorno** sobre desocupação e repasse.
- A operação é centralizada: **todo mundo depende da memória de alguém**.

## O que o sistema faz

| Módulo | O que acontece |
|---|---|
| **Hoje** | Painel do dia: disparos, entregas de chave, agenda da equipe e histórico de 14 dias |
| **Contratos** | Kanban da locação — cada avanço de etapa dispara o WhatsApp certo na hora |
| **Mensagens** | Tudo que saiu, para quem, a que horas, com link direto pro WhatsApp |
| **Equipe** | Cada pessoa recebe a própria agenda às 07:30 — sem ninguém cobrar |
| **Régua** | 13 regras editáveis (liga/desliga + texto) com preview idêntico ao WhatsApp |
| **Recepção IA** | Direciona boleto/manutenção/desocupação/repasse para o setor certo e abre chamado real |

Um **cron diário na Vercel** (`0 11 * * *` UTC = 08h de Brasília) roda o motor de disparos:
véspera e dia de entrega de chaves, lembrete de vistoria, boleto D-3, repasse do mês e
agenda individual da equipe. Tudo **idempotente** — rodar duas vezes não duplica nada.

## Stack

- **Next.js 15** (App Router, Server Actions) + Tailwind
- **Prisma + PostgreSQL (Neon)**
- **Vercel Cron** para os disparos diários
- WhatsApp real plugável via **Evolution API** (sem configurar, roda em modo demonstração)

## Rodar local

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL / DIRECT_URL
npm run db:push             # cria as tabelas
npm run db:seed             # dados de demonstração (datas relativas a hoje)
npm run dev
```

## Ativar WhatsApp real

Preencha no ambiente (Vercel → Settings → Environment Variables):

```
EVOLUTION_API_URL=https://sua-evolution.com
EVOLUTION_API_KEY=xxxx
EVOLUTION_INSTANCE=verabrokers
```

Sem essas variáveis o sistema opera em **modo demonstração**: as mensagens são geradas,
registradas e exibidas (com link `wa.me`), mas não são enviadas.

## Cron

`vercel.json` agenda `GET /api/cron/dispatch` todo dia. A rota exige o header
`Authorization: Bearer $CRON_SECRET` (a Vercel envia automaticamente) ou `?secret=`.

---

Feito pela **P2A Tech** · demo com dados fictícios (nomes e telefones ilustrativos).
