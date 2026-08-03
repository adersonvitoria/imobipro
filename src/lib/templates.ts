/** Substitui {{chaves}} do template pelas variáveis */
export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
}

/** Placeholders disponíveis por regra — exibidos na tela de régua */
export const PLACEHOLDERS: Record<string, string[]> = {
  BOLETIM_GESTAO: ["nome", "data", "resumo", "imobiliaria"],
  ALERTA_DEMANDA: ["nome", "demanda", "hora", "imobiliaria"],
  ALERTA_CONTA: ["nome", "tipo", "descricao", "contraparte", "valor", "vencimento", "imobiliaria"],
  ENTREGA_VESPERA: ["nome", "imovel", "data", "hora", "responsavel", "loja", "horario_loja"],
  ENTREGA_DIA: ["nome", "imovel", "hora", "responsavel", "loja", "horario_loja"],
  VISTORIA_LEMBRETE: ["nome", "imovel", "data", "hora"],
  BOLETO_D3: ["nome", "imovel", "vencimento", "valor"],
  REPASSE_PROPRIETARIO: ["proprietario", "imovel", "imobiliaria"],
  AGENDA_EQUIPE: ["nome", "data", "lista", "imobiliaria"],
  ETAPA_FICHA: ["nome", "imovel", "imobiliaria", "corretor"],
  ETAPA_ASSINATURA_PROP: ["proprietario", "imovel", "imobiliaria"],
  ETAPA_ASSINATURA_INQ: ["nome", "imovel"],
  SINISTRO_STATUS: ["proprietario", "imovel", "seguradora", "protocolo", "status", "previsao", "imobiliaria"],
  COBRANCA_STATUS: ["proprietario", "imovel", "status", "valor", "previsao", "imobiliaria"],
  DOC_PENDENTE: ["nome", "imovel", "lista", "imobiliaria"],
  DOC_CONFIRMACAO: ["nome", "documento", "faltantes", "imobiliaria"],
  ETAPA_CONTRATO: ["nome", "imovel"],
  ETAPA_VISTORIA: ["nome", "imovel", "data", "hora"],
  ETAPA_CHAVES_PRONTAS: ["nome", "imovel", "data", "hora", "responsavel", "loja"],
  ETAPA_ATIVO: ["nome", "imovel", "imobiliaria"],
  ETAPA_ATIVO_PROP: ["proprietario", "imovel", "nome", "repasse"],
  ETAPA_DESOCUPACAO: ["proprietario", "imovel", "imobiliaria"],
};
