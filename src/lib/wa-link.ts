/** Link wa.me para abrir a conversa (usável no cliente) */
export function linkWa(zap: string, texto?: string): string {
  const d = zap.replace(/\D/g, "");
  const numero = d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
  const q = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${numero}${q}`;
}
