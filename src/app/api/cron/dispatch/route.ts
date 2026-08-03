import { NextRequest, NextResponse } from "next/server";
import { rodarDisparosDiarios } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Disparo diário — chamado pelo Vercel Cron (08:00 América/São Paulo).
 * A Vercel envia Authorization: Bearer <CRON_SECRET> automaticamente.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qp = req.nextUrl.searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qp !== secret) {
      return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
    }
  }

  const r = await rodarDisparosDiarios("CRON");
  return NextResponse.json({ ok: true, ...r });
}
