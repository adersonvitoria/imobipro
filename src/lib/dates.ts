// Datas sempre no fuso da imobiliária (America/Sao_Paulo, UTC-3 fixo desde 2019).
const TZ = "America/Sao_Paulo";

/** Data de hoje em SP no formato YYYY-MM-DD */
export function spToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Soma dias a uma data YYYY-MM-DD (aritmética em UTC-meio-dia, imune a fuso) */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayOfMonth(iso: string): number {
  return parseInt(iso.slice(8, 10), 10);
}

/** 03/08 */
export function fmtCurto(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "domingo, 3 de agosto" */
export function fmtLongo(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(d);
}

/** "dom, 03/08" */
export function fmtMedio(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(d);
  return `${semana.replace(".", "")}, ${fmtCurto(iso)}`;
}

/** Hora HH:mm de um Date, em SP */
export function fmtHora(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

/** Instante UTC da meia-noite de hoje em SP */
export function spStartOfToday(): Date {
  return new Date(`${spToday()}T00:00:00-03:00`);
}

/** Instante UTC de uma data SP + hora local */
export function spInstant(iso: string, hora: string): Date {
  return new Date(`${iso}T${hora}:00-03:00`);
}

export function saudacao(): string {
  const h = parseInt(
    new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: TZ }).format(new Date()),
    10
  );
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function primeiroNome(nome: string): string {
  return nome.replace(/^(Sr\.|Sra\.|Dr\.|Dra\.)\s+/i, "").split(" ")[0];
}

export function brl(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}
