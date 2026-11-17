import type { Audience } from "@/lib/types";

type Kind = Audience["mascot"];

const PAL: Record<Kind, { body: string; dark: string; belly: string; accent: string }> = {
  owl: { body: "#b9a4f5", dark: "#8a6ee6", belly: "#f3edff", accent: "#ffb547" },
  fox: { body: "#ffa46b", dark: "#f07c3c", belly: "#fff4ea", accent: "#3b2a4d" },
  cat: { body: "#9fc7f0", dark: "#6fa3db", belly: "#eef6ff", accent: "#ff8fb1" },
  bear: { body: "#d6a77a", dark: "#b07f52", belly: "#fbeedd", accent: "#e04080" },
};

function Eyes({ y = 0, wink = false }: { y?: number; wink?: boolean }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <ellipse cx="-17" cy="0" rx="7" ry="8.5" fill="#2d2240" />
      <circle cx="-14.5" cy="-3" r="2.6" fill="#fff" />
      {wink ? (
        <path d="M 10 0 Q 17 -7 24 0" stroke="#2d2240" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <ellipse cx="17" cy="0" rx="7" ry="8.5" fill="#2d2240" />
          <circle cx="19.5" cy="-3" r="2.6" fill="#fff" />
        </>
      )}
    </g>
  );
}

function Cheeks({ y = 12 }: { y?: number }) {
  return (
    <>
      <ellipse cx="-30" cy={y} rx="7" ry="4.5" fill="#ff9fb8" opacity="0.7" />
      <ellipse cx="30" cy={y} rx="7" ry="4.5" fill="#ff9fb8" opacity="0.7" />
    </>
  );
}

function lighten(hex: string, t: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * t));
  return `rgb(${ch.join(",")})`;
}

export default function Mascot({ kind, size = 120, wink = false, className = "" }: { kind: Kind; size?: number; wink?: boolean; className?: string }) {
  const p = PAL[kind];
  const gid = `g-${kind}`;
  return (
    <svg viewBox="-70 -75 140 150" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={lighten(p.body, 0.3)} />
          <stop offset="35%" stopColor={p.body} stopOpacity="1" />
          <stop offset="100%" stopColor={p.dark} />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="70" rx="42" ry="5" fill="#2d2240" opacity="0.08" />
      {kind === "owl" && (
        <g>
          <path d="M -40 -38 L -30 -64 L -14 -44 Z" fill={p.dark} />
          <path d="M 40 -38 L 30 -64 L 14 -44 Z" fill={p.dark} />
          <ellipse cx="0" cy="8" rx="50" ry="60" fill={`url(#${gid})`} />
          <ellipse cx="-50" cy="18" rx="12" ry="26" fill={p.dark} transform="rotate(18 -50 18)" />
          <ellipse cx="50" cy="18" rx="12" ry="26" fill={p.dark} transform="rotate(-18 50 18)" />
          <ellipse cx="0" cy="34" rx="30" ry="30" fill={p.belly} />
          <path d="M -12 30 q 6 6 12 0 q 6 6 12 0" stroke={p.body} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M -12 44 q 6 6 12 0 q 6 6 12 0" stroke={p.body} strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="-18" cy="-14" r="17" fill="#fff" />
          <circle cx="18" cy="-14" r="17" fill="#fff" />
          <Eyes y={-13} wink={wink} />
          <path d="M -7 2 L 7 2 L 0 13 Z" fill={p.accent} />
          <ellipse cx="-14" cy="66" rx="9" ry="5" fill={p.accent} />
          <ellipse cx="14" cy="66" rx="9" ry="5" fill={p.accent} />
        </g>
      )}
      {kind === "fox" && (
        <g>
          <path d="M -46 -10 L -40 -66 L -8 -40 Z" fill={p.dark} />
          <path d="M 46 -10 L 40 -66 L 8 -40 Z" fill={p.dark} />
          <path d="M -36 -24 L -36 -54 L -16 -38 Z" fill="#fff4ea" />
          <path d="M 36 -24 L 36 -54 L 16 -38 Z" fill="#fff4ea" />
          <ellipse cx="0" cy="10" rx="54" ry="52" fill={`url(#${gid})`} />
          <path d="M -54 14 Q -20 18 0 58 Q 20 18 54 14 Q 40 60 0 62 Q -40 60 -54 14 Z" fill={p.belly} />
          <Eyes y={-2} wink={wink} />
          <Cheeks y={16} />
          <ellipse cx="0" cy="22" rx="7" ry="5" fill={p.accent} />
          <path d="M -7 31 Q 0 37 7 31" stroke={p.accent} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {kind === "cat" && (
        <g>
          <path d="M -48 -14 L -44 -62 L -10 -42 Z" fill={p.dark} />
          <path d="M 48 -14 L 44 -62 L 10 -42 Z" fill={p.dark} />
          <path d="M -40 -26 L -38 -50 L -20 -40 Z" fill={p.accent} opacity="0.7" />
          <path d="M 40 -26 L 38 -50 L 20 -40 Z" fill={p.accent} opacity="0.7" />
          <ellipse cx="0" cy="10" rx="56" ry="52" fill={`url(#${gid})`} />
          <ellipse cx="0" cy="30" rx="28" ry="20" fill={p.belly} />
          <Eyes y={0} wink={wink} />
          <circle cx="-17" cy="0" r="14" fill="none" stroke="#3b2a4d" strokeWidth="3" />
          <circle cx="17" cy="0" r="14" fill="none" stroke="#3b2a4d" strokeWidth="3" />
          <path d="M -3 0 L 3 0" stroke="#3b2a4d" strokeWidth="3" />
          <path d="M -5 20 L 5 20 L 0 26 Z" fill={p.accent} />
          <path d="M 0 26 Q -6 34 -12 30 M 0 26 Q 6 34 12 30" stroke="#3b2a4d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M -34 22 L -58 18 M -34 28 L -58 30 M 34 22 L 58 18 M 34 28 L 58 30" stroke="#3b2a4d" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </g>
      )}
      {kind === "bear" && (
        <g>
          <circle cx="-38" cy="-38" r="17" fill={p.dark} />
          <circle cx="38" cy="-38" r="17" fill={p.dark} />
          <circle cx="-38" cy="-38" r="8" fill={p.belly} />
          <circle cx="38" cy="-38" r="8" fill={p.belly} />
          <ellipse cx="0" cy="4" rx="54" ry="50" fill={`url(#${gid})`} />
          <ellipse cx="0" cy="22" rx="22" ry="16" fill={p.belly} />
          <Eyes y={-8} wink={wink} />
          <Cheeks y={10} />
          <ellipse cx="0" cy="15" rx="8" ry="6" fill="#3b2a4d" />
          <path d="M -7 25 Q 0 31 7 25" stroke="#3b2a4d" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M -10 52 L 10 52 L 6 60 L 0 74 L -6 60 Z" fill={p.accent} />
          <path d="M -9 50 L 9 50 L 4 58 L -4 58 Z" fill="#b8306a" />
        </g>
      )}
    </svg>
  );
}
