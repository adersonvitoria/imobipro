// Envio real via Evolution API quando configurado; caso contrário, modo demonstração.
// Este módulo só roda no servidor (lê env vars em runtime).

function evolutionConfig() {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!url || !key || !instance) return null;
  return { url: url.replace(/\/$/, ""), key, instance };
}

export function modoEnvio(): "EVOLUTION" | "SIMULADO" {
  return evolutionConfig() ? "EVOLUTION" : "SIMULADO";
}

export async function enviarWhatsApp(zap: string, texto: string): Promise<"ENVIADA" | "SIMULADA" | "ERRO"> {
  const cfg = evolutionConfig();
  if (!cfg) return "SIMULADA";
  try {
    const d = zap.replace(/\D/g, "");
    const numero = d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
    const res = await fetch(`${cfg.url}/message/sendText/${cfg.instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.key },
      body: JSON.stringify({ number: numero, text: texto }),
    });
    return res.ok ? "ENVIADA" : "ERRO";
  } catch {
    return "ERRO";
  }
}
