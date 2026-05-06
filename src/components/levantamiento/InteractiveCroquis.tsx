"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowUp, FlipHorizontal, RotateCw } from "lucide-react";

/**
 * Croquis top-down alineado a los pictogramas de cantidad de paredes (viewBox 24×24).
 * Cada trazo = una pared del proyecto (índice 0…wallCount−1).
 *
 * Selección: no dependemos de hitboxes SVG (strokes transparentes / opacidad suelen fallar en hit-test).
 * Un rectángulo casi invisible captura puntero; resolvemos qué pared es por distancia punto→segmento en
 * coordenadas del viewBox.
 */
export const CROQUIS_WALL_SEGMENTS: Record<number, Array<[number, number, number, number]>> = {
  1: [[4, 12, 20, 12]],
  2: [
    [6, 6, 6, 18],
    [6, 18, 18, 18],
  ],
  3: [
    [6, 5, 6, 19],
    [6, 19, 18, 19],
    [18, 19, 18, 5],
  ],
  4: [
    [6, 6, 18, 6],
    [18, 6, 18, 18],
    [18, 18, 6, 18],
    [6, 18, 6, 6],
  ],
  5: [
    [5, 5, 5, 19],
    [5, 19, 19, 19],
    [19, 19, 19, 10],
    [19, 10, 13, 10],
    [13, 10, 13, 5],
  ],
  6: [
    [4, 4, 4, 9],
    [4, 9, 4, 13],
    [4, 13, 12, 13],
    [12, 13, 12, 8],
    [12, 8, 20, 8],
    [20, 8, 20, 18],
  ],
  7: [
    [3, 6, 3, 18],
    [3, 18, 11, 18],
    [11, 18, 11, 10],
    [11, 10, 17, 10],
    [17, 10, 17, 18],
    [17, 18, 21, 18],
    [21, 18, 21, 6],
  ],
  8: [
    [3, 5, 3, 16],
    [3, 16, 9, 16],
    [9, 16, 9, 9],
    [9, 9, 15, 9],
    [15, 9, 15, 17],
    [15, 17, 21, 17],
    [21, 17, 21, 8],
    [21, 8, 14, 8],
  ],
};

/** Trazo visible: más grueso si está activa para coincidir con la referencia visual. */
const VISIBLE_STROKE = { active: 6, default: 4 } as const;

/** Distancia máxima (unidades viewBox 24×24) del clic al segmento para contar como “sobre la pared”. */
const PICK_RADIUS = 3.2;

function clientToSvgUser(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/** Distancia mínima del punto (px,py) al segmento (x1,y1)-(x2,y2). */
function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return Math.hypot(px - nx, py - ny);
}

function pickWallIndex(
  px: number,
  py: number,
  segments: Array<[number, number, number, number]>,
): number {
  let bestIdx = -1;
  let bestD = Infinity;
  for (let i = 0; i < segments.length; i++) {
    const [x1, y1, x2, y2] = segments[i];
    const d = distPointToSegment(px, py, x1, y1, x2, y2);
    if (d < bestD - 1e-9) {
      bestD = d;
      bestIdx = i;
    } else if (Math.abs(d - bestD) < 1e-9 && i < bestIdx) {
      bestIdx = i;
    }
  }
  if (bestIdx < 0 || bestD > PICK_RADIUS) return -1;
  return bestIdx;
}

export type InteractiveCroquisProps = {
  wallCount: number;
  activeWallIndex: number;
  onSelectWall: (index: number) => void;
  isWallComplete: (index: number) => boolean;
  className?: string;
};

const STROKE = {
  pending: "#E4E4E7",
  complete: "#10B981",
  active: "#8B1C1C",
} as const;

export function InteractiveCroquis({
  wallCount,
  activeWallIndex,
  onSelectWall,
  isWallComplete,
  className,
}: InteractiveCroquisProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const segments = CROQUIS_WALL_SEGMENTS[wallCount] ?? CROQUIS_WALL_SEGMENTS[1]!;

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const p = clientToSvgUser(svg, clientX, clientY);
      if (!p) return;
      const idx = pickWallIndex(p.x, p.y, segments);
      if (idx >= 0) onSelectWall(idx);
    },
    [onSelectWall, segments],
  );

  return (
    <div className={className}>
      <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] px-4 py-4 shadow-inner backdrop-blur-sm">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-white/90 text-primary shadow-sm transition hover:border-[#8B1C1C]/35 hover:bg-white"
            aria-label="Girar el croquis 90 grados"
            title="Girar 90°"
          >
            <RotateCw className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setIsFlipped((f) => !f)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-white/90 text-primary shadow-sm transition hover:border-[#8B1C1C]/35 hover:bg-white"
            aria-label="Espejo horizontal del croquis"
            title="Espejo horizontal"
          >
            <FlipHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="inline-block origin-center transition-transform duration-300 ease-out will-change-transform"
            style={{
              transform: `rotate(${rotation}deg) scaleX(${isFlipped ? -1 : 1})`,
            }}
          >
            <svg
              ref={svgRef}
              viewBox="0 0 24 24"
              className="mx-auto block h-auto w-full max-w-[min(22rem,100%)] cursor-crosshair [touch-action:manipulation]"
              fill="none"
              role="img"
              aria-label={`Croquis de ${wallCount} paredes; selecciona un trazo para editar sus medidas.`}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                handlePointer(e.clientX, e.clientY);
              }}
            >
              <title>Croquis interactivo</title>

              {/* Capa inferior: recibe el puntero (trazos encima tienen pointer-events none → el clic llega aquí). */}
              <rect
                x={0}
                y={0}
                width={24}
                height={24}
                fill="#ffffff"
                fillOpacity={0.02}
                pointerEvents="all"
              />

              {segments.map((seg, wallIdx) => {
                const [x1, y1, x2, y2] = seg;
                const complete = isWallComplete(wallIdx);
                const active = wallIdx === activeWallIndex;
                const stroke = active ? STROKE.active : complete ? STROKE.complete : STROKE.pending;
                const sw = active ? VISIBLE_STROKE.active : VISIBLE_STROKE.default;
                return (
                  <line
                    key={`croquis-vis-${wallIdx}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                );
              })}
            </svg>
          </div>

          <div className="mt-4 flex max-w-md items-center justify-center gap-2 border-t border-primary/10 pt-3 text-center text-[11px] font-semibold leading-snug text-secondary">
            <ArrowUp className="h-4 w-4 shrink-0 text-[#8B1C1C]" aria-hidden />
            <span>Acceso / Tú estás aquí</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-secondary">
        Cada trazo es una pared. Clic cerca de la línea para seleccionar; rojo = activa, verde = completa, gris = pendiente.
      </p>
    </div>
  );
}
