import React from 'react';

interface TennisCourtSVGProps {
  colorKey: 'blue' | 'clay' | 'grass' | 'teal';
  width?: number;
  height?: number;
}

const SURFACE_PALETTES = {
  blue:  { court: '#1565C0', line: '#FFFFFF', net: '#BBDEFB', out: '#0D47A1', shadow: '#0a3578' },
  clay:  { court: '#BF360C', line: '#FFFFFF', net: '#FFCCBC', out: '#8B1A00', shadow: '#6d1400' },
  grass: { court: '#2E7D32', line: '#FFFFFF', net: '#C8E6C9', out: '#1A4D1C', shadow: '#133d15' },
  teal:  { court: '#00695C', line: '#FFFFFF', net: '#B2DFDB', out: '#004D40', shadow: '#003830' },
};

export default function TennisCourtSVG({ colorKey, width = 320, height = 200 }: TennisCourtSVGProps) {
  const p = SURFACE_PALETTES[colorKey];
  const W = 320;
  const H = 200;

  // Court dimensions (top-down proportional)
  const cx = 160; // center x
  const cy = 100; // center y
  const cw = 260; // court width (doubles)
  const ch = 160; // court height
  const left = cx - cw / 2;
  const right = cx + cw / 2;
  const top = cy - ch / 2;
  const bottom = cy + ch / 2;

  // Singles sidelines (13.5ft inside from doubles)
  const singleOffset = 22;
  const sLeft = left + singleOffset;
  const sRight = right - singleOffset;

  // Service line (21ft from net = 27% of half height)
  const serviceOffset = ch * 0.27;
  const topService = cy - serviceOffset;
  const botService = cy + serviceOffset;

  // Net
  const netY = cy;

  // Center service line
  const centerX = cx;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${W} ${H}`}
      style={{ borderRadius: 12, display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background / surroundings */}
      <rect width={W} height={H} fill={p.shadow} rx={12} />

      {/* Outer court surround */}
      <rect x={left - 10} y={top - 10} width={cw + 20} height={ch + 20} fill={p.out} rx={4} />

      {/* Court surface */}
      <rect x={left} y={top} width={cw} height={ch} fill={p.court} />

      {/* Subtle court texture lines */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={`tex-${i}`}
          x1={left} y1={top + (ch / 6) * (i + 1)}
          x2={right} y2={top + (ch / 6) * (i + 1)}
          stroke={p.shadow} strokeWidth={0.4} opacity={0.3}
        />
      ))}

      {/* Doubles outer lines */}
      <rect x={left} y={top} width={cw} height={ch} fill="none" stroke={p.line} strokeWidth={2} />

      {/* Singles sidelines */}
      <line x1={sLeft} y1={top} x2={sLeft} y2={bottom} stroke={p.line} strokeWidth={1.5} />
      <line x1={sRight} y1={top} x2={sRight} y2={bottom} stroke={p.line} strokeWidth={1.5} />

      {/* Service lines */}
      <line x1={sLeft} y1={topService} x2={sRight} y2={topService} stroke={p.line} strokeWidth={1.5} />
      <line x1={sLeft} y1={botService} x2={sRight} y2={botService} stroke={p.line} strokeWidth={1.5} />

      {/* Center service line */}
      <line x1={centerX} y1={topService} x2={centerX} y2={botService} stroke={p.line} strokeWidth={1.5} />

      {/* Baseline center marks */}
      <line x1={centerX} y1={top} x2={centerX} y2={top + 8} stroke={p.line} strokeWidth={2} />
      <line x1={centerX} y1={bottom} x2={centerX} y2={bottom - 8} stroke={p.line} strokeWidth={2} />

      {/* Net posts */}
      <circle cx={left - 4} cy={netY} r={4} fill="#888" />
      <circle cx={right + 4} cy={netY} r={4} fill="#888" />

      {/* Net shadow */}
      <line x1={left - 4} y1={netY + 3} x2={right + 4} y2={netY + 3} stroke="rgba(0,0,0,0.3)" strokeWidth={6} />

      {/* Net */}
      <line x1={left - 4} y1={netY} x2={right + 4} y2={netY} stroke="#EEEEEE" strokeWidth={3} />
      {/* Net mesh lines */}
      {Array.from({ length: 13 }).map((_, i) => (
        <line
          key={`net-${i}`}
          x1={left - 4 + (cw + 8) * (i / 12)} y1={netY - 8}
          x2={left - 4 + (cw + 8) * (i / 12)} y2={netY + 8}
          stroke="#CCCCCC" strokeWidth={0.7} opacity={0.6}
        />
      ))}
      <line x1={left - 4} y1={netY - 8} x2={right + 4} y2={netY - 8} stroke="#EEEEEE" strokeWidth={1.5} />
      <line x1={left - 4} y1={netY + 8} x2={right + 4} y2={netY + 8} stroke="#EEEEEE" strokeWidth={1.5} />

      {/* Center strap */}
      <rect x={centerX - 2} y={netY - 8} width={4} height={16} fill="#AAAAAA" />

      {/* Decorative corner dots */}
      <circle cx={left} cy={top} r={3} fill={p.line} />
      <circle cx={right} cy={top} r={3} fill={p.line} />
      <circle cx={left} cy={bottom} r={3} fill={p.line} />
      <circle cx={right} cy={bottom} r={3} fill={p.line} />
    </svg>
  );
}
