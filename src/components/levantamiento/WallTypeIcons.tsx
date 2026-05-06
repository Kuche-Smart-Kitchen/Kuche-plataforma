"use client";

import type { SVGProps } from "react";
import type { WallDimensionSegment } from "@/lib/levantamiento-catalog";
import {
  getWallMeasureDimensionLines,
  getWallMeasureFieldDefs,
  wallMeasureLetter,
} from "@/lib/levantamiento-catalog";

/** Alzado compartido (viewBox 120×120): rect exterior del muro en vista frontal. */
export const WALL_ICON_ELEVATION = { x: 12, y: 22, w: 96, h: 74 } as const;

const COTA_STROKE = "#8B1C1C";
const COTA_FILL = "#8B1C1C";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

const svgProps = (props: IconProps): IconProps => ({
  viewBox: "0 0 120 120",
  preserveAspectRatio: "xMidYMid meet",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  ...props,
  className: props.className,
});

const wallGeom = { stroke: "currentColor", strokeWidth: 2 as number };

/** Separa cotas interiores del trazo del muro. */
function nudgeInteriorCota(
  index: number,
  wallId: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x1: number; y1: number; x2: number; y2: number } {
  if (index === 0) return { x1, y1, x2, y2 };
  const cx = 60;
  const cy = 56;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const gap = 2.2;
  const horiz = Math.abs(y2 - y1) < 0.35;
  const vert = Math.abs(x2 - x1) < 0.35;

  if (horiz) {
    const dir = my >= cy ? -1 : 1;
    const o = dir * gap;
    return { x1, y1: y1 + o, x2, y2: y2 + o };
  }
  if (vert) {
    const dir = mx >= cx ? 1 : -1;
    const o = dir * gap;
    return { x1: x1 + o, y1, x2: x2 + o, y2 };
  }
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  let nx = -(y2 - y1) / len;
  let ny = (x2 - x1) / len;
  if (nx * (mx - cx) + ny * (my - cy) < 0) {
    nx = -nx;
    ny = -ny;
  }
  return {
    x1: x1 + nx * gap,
    y1: y1 + ny * gap,
    x2: x2 + nx * gap,
    y2: y2 + ny * gap,
  };
}

function Cota({
  x1,
  y1,
  x2,
  y2,
  label,
  labelDx = 0,
  labelDy = 0,
  title: cotaTitle,
}: WallDimensionSegment & { label: string; title?: string }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const labelX = mx + labelDx;
  const labelY = my + labelDy;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const tx = (-dy / L) * 1.25;
  const ty = (dx / L) * 1.25;

  return (
    <g>
      {cotaTitle ? <title>{cotaTitle}</title> : null}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COTA_STROKE}
        strokeWidth={0.65}
        strokeLinecap="square"
      />
      <line
        x1={x1 + tx}
        y1={y1 + ty}
        x2={x1 - tx}
        y2={y1 - ty}
        stroke={COTA_STROKE}
        strokeWidth={0.5}
        strokeLinecap="square"
      />
      <line
        x1={x2 + tx}
        y1={y2 + ty}
        x2={x2 - tx}
        y2={y2 - ty}
        stroke={COTA_STROKE}
        strokeWidth={0.5}
        strokeLinecap="square"
      />
      <circle cx={labelX} cy={labelY} r={3.9} fill={COTA_FILL} stroke="#fff" strokeWidth={0.65} />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={4.6}
        fontWeight={700}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

function WallTypeCotasGroup({ wallId }: { wallId: string }) {
  const defs = getWallMeasureFieldDefs(wallId);
  const lines = getWallMeasureDimensionLines(wallId);
  if (!lines || defs.length !== lines.length) return null;

  return (
    <g className="pointer-events-none" style={{ isolation: "isolate" }}>
      {lines.map((seg, i) => {
        const d = defs[i];
        if (!d) return null;
        const n = nudgeInteriorCota(i, wallId, seg.x1, seg.y1, seg.x2, seg.y2);
        const letter = wallMeasureLetter(i);
        return (
          <Cota
            key={d.key}
            x1={n.x1}
            y1={n.y1}
            x2={n.x2}
            y2={n.y2}
            label={letter}
            labelDx={seg.labelDx}
            labelDy={seg.labelDy}
            title={`${letter}: ${d.label} (m). ${d.verifyHint ?? ""}`}
          />
        );
      })}
    </g>
  );
}

const { x: Wx, y: Wy, w: Ww, h: Wh } = WALL_ICON_ELEVATION;
const Wbottom = Wy + Wh;

export function WallIconRecta({ className, ...rest }: IconProps) {
  return (
    <svg {...svgProps({ ...rest, className: `${className ?? ""} text-primary` })} aria-hidden>
      <g className="wall-geometry">
        <rect x={Wx} y={Wy} width={Ww} height={Wh} {...wallGeom} />
      </g>
      <WallTypeCotasGroup wallId="pared-recta" />
    </svg>
  );
}

export function WallIconVentana({ className, ...rest }: IconProps) {
  const ix = 38;
  const iy = 44;
  const iw = 44;
  const ih = 26;
  return (
    <svg {...svgProps({ ...rest, className: `${className ?? ""} text-primary` })} aria-hidden>
      <g className="wall-geometry">
        <rect x={Wx} y={Wy} width={Ww} height={Wh} {...wallGeom} />
        <rect x={ix} y={iy} width={iw} height={ih} {...wallGeom} />
      </g>
      <WallTypeCotasGroup wallId="pared-ventana" />
    </svg>
  );
}

export function WallIconPuerta({ className, ...rest }: IconProps) {
  const iw = 32;
  const ix = Wx + (Ww - iw) / 2;
  const iy = 38;
  const ih = Wbottom - iy;
  return (
    <svg {...svgProps({ ...rest, className: `${className ?? ""} text-primary` })} aria-hidden>
      <g className="wall-geometry">
        <rect x={Wx} y={Wy} width={Ww} height={Wh} {...wallGeom} />
        <rect x={ix} y={iy} width={iw} height={ih} {...wallGeom} />
      </g>
      <WallTypeCotasGroup wallId="pared-puerta" />
    </svg>
  );
}

export function WallIcon2Ventanas({ className, ...rest }: IconProps) {
  const wwin = 24;
  const hwin = 24;
  const ywin = 42;
  return (
    <svg {...svgProps({ ...rest, className: `${className ?? ""} text-primary` })} aria-hidden>
      <g className="wall-geometry">
        <rect x={Wx} y={Wy} width={Ww} height={Wh} {...wallGeom} />
        <rect x={22} y={ywin} width={wwin} height={hwin} {...wallGeom} />
        <rect x={74} y={ywin} width={wwin} height={hwin} {...wallGeom} />
      </g>
      <WallTypeCotasGroup wallId="pared-2-ventanas" />
    </svg>
  );
}

/** Puerta a la izquierda, ventana a la derecha */
export function WallIconPuertaVentana({ className, ...rest }: IconProps) {
  return (
    <svg {...svgProps({ ...rest, className: `${className ?? ""} text-primary` })} aria-hidden>
      <g className="wall-geometry">
        <rect x={Wx} y={Wy} width={Ww} height={Wh} {...wallGeom} />
        <rect x={14} y={40} width={30} height={Wbottom - 40} {...wallGeom} />
        <rect x={62} y={38} width={36} height={28} {...wallGeom} />
      </g>
      <WallTypeCotasGroup wallId="pared-puerta-ventana" />
    </svg>
  );
}

/** Ventana | puerta | ventana */
export function WallIconPuerta2Ventanas({ className, ...rest }: IconProps) {
  return (
    <svg {...svgProps({ ...rest, className: `${className ?? ""} text-primary` })} aria-hidden>
      <g className="wall-geometry">
        <rect x={Wx} y={Wy} width={Ww} height={Wh} {...wallGeom} />
        <rect x={14} y={40} width={20} height={26} {...wallGeom} />
        <rect x={44} y={38} width={32} height={Wbottom - 38} {...wallGeom} />
        <rect x={86} y={40} width={20} height={26} {...wallGeom} />
      </g>
      <WallTypeCotasGroup wallId="pared-puerta-2-ventanas" />
    </svg>
  );
}

export function WallIcon2Puertas({ className, ...rest }: IconProps) {
  const pw = 28;
  const ph = Wbottom - 38;
  return (
    <svg {...svgProps({ ...rest, className: `${className ?? ""} text-primary` })} aria-hidden>
      <g className="wall-geometry">
        <rect x={Wx} y={Wy} width={Ww} height={Wh} {...wallGeom} />
        <rect x={18} y={38} width={pw} height={ph} {...wallGeom} />
        <rect x={74} y={38} width={pw} height={ph} {...wallGeom} />
      </g>
      <WallTypeCotasGroup wallId="pared-2-puertas" />
    </svg>
  );
}

const FALLBACK_KEYS = new Set(["otro", "pared-otro", ""]);

export function WallTypeIcon({ wallId, className, ...rest }: IconProps & { wallId: string }) {
  const base = `text-primary h-full w-full ${className ?? ""}`.trim();

  if (FALLBACK_KEYS.has(wallId)) {
    return (
      <svg {...svgProps({ ...rest, role: "img", className: base })}>
        <g className="wall-geometry">
          <rect
            x={12}
            y={22}
            width={96}
            height={74}
            stroke="currentColor"
            strokeWidth={2}
            opacity={0.3}
            strokeDasharray="6 6"
          />
          <text x={60} y={62} textAnchor="middle" className="fill-current text-[10px] font-semibold">
            Otro
          </text>
        </g>
      </svg>
    );
  }

  switch (wallId) {
    case "pared-recta":
      return <WallIconRecta className={base} {...rest} />;
    case "pared-ventana":
      return <WallIconVentana className={base} {...rest} />;
    case "pared-puerta":
      return <WallIconPuerta className={base} {...rest} />;
    case "pared-2-ventanas":
      return <WallIcon2Ventanas className={base} {...rest} />;
    case "pared-puerta-ventana":
      return <WallIconPuertaVentana className={base} {...rest} />;
    case "pared-puerta-2-ventanas":
      return <WallIconPuerta2Ventanas className={base} {...rest} />;
    case "pared-2-puertas":
      return <WallIcon2Puertas className={base} {...rest} />;
    default:
      return <WallIconRecta className={base} {...rest} />;
  }
}
