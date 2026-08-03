// Validações da ficha digital — usadas no cliente (tempo real) e no servidor.

export function soDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

/** CPF com dígitos verificadores de verdade */
export function validarCPF(cpf: string): boolean {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(d[i]) * (10 - i);
  let dv1 = (soma * 10) % 11;
  if (dv1 === 10) dv1 = 0;
  if (dv1 !== parseInt(d[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(d[i]) * (11 - i);
  let dv2 = (soma * 10) % 11;
  if (dv2 === 10) dv2 = 0;
  return dv2 === parseInt(d[10]);
}

export function validarEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
}

export function validarTelefone(t: string): boolean {
  const d = soDigitos(t);
  return d.length === 10 || d.length === 11;
}

/** Data no formato YYYY-MM-DD (input date) — precisa ter 18+ */
export function maiorDe18(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const nasc = new Date(`${iso}T12:00:00Z`);
  if (isNaN(nasc.getTime())) return false;
  const hoje = new Date();
  const idade =
    (hoje.getTime() - nasc.getTime()) / (365.25 * 24 * 3600 * 1000);
  return idade >= 18 && idade < 120;
}

export function fmtCPF(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function fmtTelefone(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export type FichaDados = {
  locNome: string; locCpf: string; locRg: string; locNascimento: string;
  locTelefone: string; locEmail: string; locEstadoCivil: string; locProfissao: string; locEndereco: string;
  propNome: string; propCpf: string; propRg: string; propNascimento: string;
  propTelefone: string; propEmail: string; propEstadoCivil: string; propProfissao: string; propEndereco: string;
  recebimento: "PIX" | "TRANSFERENCIA";
  pixChave: string; banco: string; agencia: string; conta: string;
  imovelEndereco: string; imovelBairro: string; valor: number; diaVencimento: number;
  matricula: string; temCondominio: boolean; condominioValor: number;
  docs: {
    locRg: string; locResidencia: string;
    propRg: string; propResidencia: string;
    matricula: string; iptu: string; luz: string; condominio: string;
  };
};
