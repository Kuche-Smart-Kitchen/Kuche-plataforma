"use client";

import type { WallDimensionSegment } from "@/lib/levantamiento-catalog";
import {
  getWallMeasureDimensionLines,
  getWallMeasureFieldDefs,
  wallMeasureLetter,
} from "@/lib/levantamiento-catalog";
import WallMeasureBadgesOverlay from "@/components/levantamiento/WallMeasureBadgesOverlay";

type Props = { wallId: string };

function cotaTitle(letter: string, label: string, hint?: string): string {
  const base = `${letter}: ${label} (metros)`;
  return hint ? `${base}\n\nEn el dibujo: ${hint}` : base;
}

function CotaWithTicks(
  seg: WallDimensionSegment & {
    letter: string;
    label: string;
    hint?: string;
  },
) {
  const { x1, y1, x2, y2, letter, label, hint, labelDx = 0, labelDy = 0 } = seg;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const lx = mx + labelDx;
  const ly = my + labelDy;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  /* Cortas: marcan el vértice sin “ensanchar” visualmente la cota */
  const px = (-dy / L) * 1.0;
  const py = (dx / L) * 1.0;

  return (
    <g>
      <title>{cotaTitle(letter, label, hint)}</title>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(20,20,20,0.92)"
        strokeWidth={0.65}
        strokeLinecap="square"
      />
      <line
        x1={x1 + px}
        y1={y1 + py}
        x2={x1 - px}
        y2={y1 - py}
        stroke="rgba(20,20,20,0.92)"
        strokeWidth={0.5}
      />
      <line
        x1={x2 + px}
        y1={y2 + py}
        x2={x2 - px}
        y2={y2 - py}
        stroke="rgba(20,20,20,0.92)"
        strokeWidth={0.5}
      />
      <circle cx={lx} cy={ly} r={3.9} fill="#8B1C1C" stroke="#fff" strokeWidth={0.65} />
      <text
        x={lx}
        y={ly}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={4.6}
        fontWeight={700}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {letter}
      </text>
    </g>
  );
}

/**
 * Líneas de medición + marcas en extremos + letra (cotas), si hay datos en el catálogo;
 * si no, solo círculos con letra como antes.
 */
export default function WallMeasureDiagramOverlay({ wallId }: Props) {
  const defs = getWallMeasureFieldDefs(wallId);
  const lines = getWallMeasureDimensionLines(wallId);

  if (!lines || defs.length !== lines.length) {
    return <WallMeasureBadgesOverlay wallId={wallId} />;
  }

  return (
    <svg
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Cotas de medición sobre el diagrama"
    >
      {lines.map((s, i) => {
        const d = defs[i];
        if (!d) return null;
        return (
          <CotaWithTicks
            key={d.key}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            labelDx={s.labelDx}
            labelDy={s.labelDy}
            letter={wallMeasureLetter(i)}
            label={d.label}
            hint={d.verifyHint}
          />
        );
      })}
    </svg>
  );
}
