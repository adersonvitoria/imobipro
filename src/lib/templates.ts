/** Substitui {{chaves}} do template pelas variáveis */
export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
}

/** Placeholders disponíveis por regra — exibidos na tela de régua */
export const PLACEHOLDERS: Record<string, string[]> = {
  ENTREGA_VESPERA: ["nome", "imovel", "data", "hora", "responsavel", "loja", "horario_loja"],
  ENTREGA_DIA: ["nome", "imovel", "hora", "responsavel", "loja", "horario_loja"],
  VISTORIA_LEMBRETE: ["nome", "imovel", "data", "hora"],
  BOLETO_D3: ["nome", "imovel", "vencimento", "valor"],
  REPASSE_PROPRIETARIO: ["proprietario", "imovel", "imobiliaria"],
  AGENDA_EQUIPE: ["nome", "data", "lista", "imobiliaria"],
  ETAPA_FICHA: ["nome", "imovel", "imobiliaria", "corretor"],
  ETAPA_CONTRATO: ["nome", "imovel"],
  ETAPA_VISTORIA: ["nome", "imovel", "data", "hora"],
  ETAPA_CHAVES_PRONTAS: ["nome", "imovel", "data", "hora", "responsavel", "loja"],
  ETAPA_ATIVO: ["nome", "imovel", "imobiliaria"],
  ETAPA_ATIVO_PROP: ["proprietario", "imovel", "nome", "repasse"],
  ETAPA_DESOCUPACAO: ["proprietario", "imovel", "imobiliaria"],
};
