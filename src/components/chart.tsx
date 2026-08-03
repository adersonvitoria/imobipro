"use client";

import { useState } from "react";

type Ponto = { dia: string; rotulo: string; total: number };

/**
 * Barras dos últimos 14 dias — série única (ouro sobre superfície escura),
 * marcas finas com ponta arredondada, tooltip no hover, rótulo direto só no pico.
 */
export default function ChartDisparos({ dados }: { dados: Ponto[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);

  const W = 560;
  const H = 168;
  const padL = 26;
  const padB = 22;
  const padT = 14;
  const plotW = W - padL - 6;
  const plotH = H - padT - padB;

  const max = Math.max(...dados.map((d) => d.total), 1);
  const teto = Math.ceil(max / 5) * 5;
  const bw = Math.min(20, (plotW / dados.length) * 0.58);
  const passo = plotW / dados.length;
  const idxMax = dados.findIndex((d) => d.total === max);

  const y = (v: number) => padT + plotH - (v / teto) * plotH;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Disparos automáticos por dia, últimos 14 dias">
        {/* linhas de grade recessivas */}
        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1={padL}
            x2={W - 4}
            y1={y(teto * f)}
            y2={y(teto * f)}
            stroke="var(--grid-line)"
            strokeWidth={1}
          />
        ))}
        {/* rótulos do eixo Y */}
        {[0.5, 1].map((f) => (
          <text key={f} x={padL - 6} y={y(teto * f) + 3} textAnchor="end" fontSize={8.5} fill="var(--ink-3)" fontFamily="var(--font-mono)">
            {Math.round(teto * f)}
          </text>
        ))}
        {/* linha de base */}
        <line x1={padL} x2={W - 4} y1={y(0)} y2={y(0)} stroke="rgba(237,30,143,0.28)" strokeWidth={1} />

        {dados.map((d, i) => {
          const x = padL + i * passo + (passo - bw) / 2;
          const alt = Math.max(2, (d.total / teto) * plotH);
          const emHover = ativo === i;
          return (
            <g key={d.dia}>
              {/* alvo de hover maior que a marca */}
              <rect
                x={padL + i * passo}
                y={padT}
                width={passo}
                height={plotH + padB}
                fill="transparent"
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
              />
              <rect
                x={x}
                y={y(0) - alt}
                width={bw}
                height={alt}
                rx={4}
                fill={emHover ? "var(--chart-bar-hover)" : "var(--chart-bar)"}
                opacity={ativo === null || emHover ? 1 : 0.45}
                style={{ transition: "opacity .15s ease, fill .15s ease", pointerEvents: "none" }}
              />
              {/* rótulo direto apenas no pico */}
              {i === idxMax && ativo === null && (
                <text x={x + bw / 2} y={y(d.total) - 5} textAnchor="middle" fontSize={9} fill="var(--ink-2)" fontFamily="var(--font-mono)">
                  {d.total}
                </text>
              )}
              {/* eixo X: um rótulo a cada dois dias */}
              {i % 2 === 0 && (
                <text x={padL + i * passo + passo / 2} y={H - 6} textAnchor="middle" fontSize={8} fill="var(--ink-3)" fontFamily="var(--font-mono)">
                  {d.rotulo}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {ativo !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-[var(--hairline)] bg-[var(--bg-overlay)] px-2.5 py-1.5 text-[0.7rem] shadow-card"
          style={{
            left: `${((padL + ativo * passo + passo / 2) / W) * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <span className="text-ink-3">{dados[ativo].rotulo}</span>{" "}
          <span className="font-medium text-ink">{dados[ativo].total} disparos</span>
        </div>
      )}

      {/* tabela acessível equivalente */}
      <table className="sr-only">
        <caption>Disparos automáticos por dia, últimos 14 dias</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Disparos</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d) => (
            <tr key={d.dia}>
              <td>{d.rotulo}</td>
              <td>{d.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
