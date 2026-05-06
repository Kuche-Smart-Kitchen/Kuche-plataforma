"use client";

import {
  getWallMeasureBadgePositions,
  getWallMeasureFieldDefs,
  wallMeasureLetter,
} from "@/lib/levantamiento-catalog";

type Props = { wallId: string };

function badgeTitle(letter: string, label: string, hint?: string): string {
  const base = `${letter}: ${label} (metros)`;
  return hint ? `${base}\n\nComprobar en dibujo: ${hint}` : base;
}

/** Círculo con letra (no tapa el dibujo); el detalle está en el formulario y en title al pasar el cursor. */
export default function WallMeasureBadgesOverlay({ wallId }: Props) {
  const defs = getWallMeasureFieldDefs(wallId);
  const positions = getWallMeasureBadgePositions(wallId);
  if (defs.length === 0) return null;

  return (
    <>
      {defs.map((d, i) => {
        const letter = wallMeasureLetter(i);
        const pos = positions[i] ?? { top: "10%", left: "10%" };
        return (
          <span
            key={d.key}
            className="pointer-events-none absolute z-[6] flex h-6 min-w-[1.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/95 bg-[#8B1C1C] px-1 text-[10px] font-bold tabular-nums text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            style={{ top: pos.top, left: pos.left }}
            title={badgeTitle(letter, d.label, d.verifyHint)}
          >
            {letter}
          </span>
        );
      })}
    </>
  );
}
