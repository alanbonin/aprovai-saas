"use client";
import { getPersona, type MentorPersona } from "@/lib/mentor-personas";

interface AgentLike {
  id: string;
  name: string;
  categoria?: string | null;
  banca?: string | null;
  color: string;
  avatar?: string | null;
}

interface Props {
  agent: AgentLike;
  size?: number;
  className?: string;
  showRing?: boolean; // anel colorido ao redor
}

export function MentorAvatar({ agent, size = 40, className = "", showRing = false }: Props) {
  const key = agent.categoria ?? agent.banca ?? null;
  const persona = getPersona(key);

  if (agent.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={agent.avatar}
        alt={persona.personaName}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size, boxShadow: showRing ? `0 0 0 2px ${agent.color}` : undefined }}
      />
    );
  }

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {showRing && (
        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 2px ${agent.color}` }}
        />
      )}
      <svg
        viewBox="0 0 80 80"
        width={size}
        height={size}
        style={{ display: "block", borderRadius: "50%" }}
        aria-label={persona.personaName}
      >
        <FaceIllustration persona={persona} color={agent.color} />
      </svg>
    </div>
  );
}

// ── Rótulo de nome da persona ────────────────────────────────────────────────
export function PersonaName({ agent, className = "" }: { agent: AgentLike; className?: string }) {
  const key = agent.categoria ?? agent.banca ?? null;
  const persona = getPersona(key);
  return <span className={className}>{persona.personaName}</span>;
}

// ── Retorna o nome da persona dado o agente ──────────────────────────────────
export function getPersonaName(agent: AgentLike): string {
  const key = agent.categoria ?? agent.banca ?? null;
  return getPersona(key).personaName;
}

// ── Retorna a saudação inicial ───────────────────────────────────────────────
export function getPersonaGreeting(agent: AgentLike): string {
  const key = agent.categoria ?? agent.banca ?? null;
  return getPersona(key).greeting;
}

// ── SVG Face ─────────────────────────────────────────────────────────────────
function FaceIllustration({ persona, color }: { persona: MentorPersona; color: string }) {
  const { skin, hair, hairStyle, glasses } = persona;
  const shadowSkin = shadowOf(skin);
  const lipColor = lipOf(skin);

  return (
    <>
      {/* Background circle */}
      <circle cx="40" cy="40" r="40" fill="#101828" />
      <circle cx="40" cy="40" r="40" fill={color} opacity="0.18" />

      {/* Clothes / shoulders */}
      <ellipse cx="40" cy="85" rx="32" ry="16" fill={color} opacity="0.55" />
      <ellipse cx="40" cy="83" rx="24" ry="10" fill={color} opacity="0.35" />

      {/* Neck */}
      <rect x="33.5" y="62" width="13" height="12" rx="5" fill={skin} />

      {/* Hair behind */}
      <HairBack style={hairStyle} color={hair} />

      {/* Face */}
      <ellipse cx="40" cy="47" rx="18.5" ry="21" fill={skin} />

      {/* Ears */}
      <ellipse cx="21.5" cy="48" rx="3" ry="4" fill={skin} />
      <ellipse cx="58.5" cy="48" rx="3" ry="4" fill={skin} />
      <ellipse cx="21.5" cy="48" rx="1.5" ry="2.5" fill={shadowSkin} opacity="0.3" />
      <ellipse cx="58.5" cy="48" rx="1.5" ry="2.5" fill={shadowSkin} opacity="0.3" />

      {/* Eyebrows */}
      <path d="M28,39 Q32,36.5 36,38.5" stroke={darken(hair, 0.3)} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M44,38.5 Q48,36.5 52,39" stroke={darken(hair, 0.3)} strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="32" cy="43.5" rx="3.2" ry="3.6" fill="white" />
      <ellipse cx="48" cy="43.5" rx="3.2" ry="3.6" fill="white" />
      {/* Iris */}
      <circle cx="32.3" cy="43.8" r="2.1" fill="#3d2200" />
      <circle cx="48.3" cy="43.8" r="2.1" fill="#3d2200" />
      {/* Pupil */}
      <circle cx="32.3" cy="43.8" r="1" fill="#111" />
      <circle cx="48.3" cy="43.8" r="1" fill="#111" />
      {/* Highlight */}
      <circle cx="33.1" cy="42.7" r="0.75" fill="white" opacity="0.9" />
      <circle cx="49.1" cy="42.7" r="0.75" fill="white" opacity="0.9" />

      {/* Nose */}
      <path d="M38.5,46 L37,53 Q40,55 43,53 L41.5,46" fill={shadowSkin} opacity="0.28" />

      {/* Mouth */}
      <path d="M33.5,57 Q40,62 46.5,57" stroke={lipColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* Glasses */}
      {glasses && <Glasses />}

      {/* Hair front */}
      <HairFront style={hairStyle} color={hair} />

      {/* Blush */}
      <ellipse cx="24" cy="53" rx="5" ry="3" fill="#ff8080" opacity="0.12" />
      <ellipse cx="56" cy="53" rx="5" ry="3" fill="#ff8080" opacity="0.12" />
    </>
  );
}

function HairBack({ style, color }: { style: string; color: string }) {
  switch (style) {
    case "short":
      return <ellipse cx="40" cy="29" rx="19.5" ry="14" fill={color} />;
    case "formal":
      return (
        <>
          <ellipse cx="40" cy="29" rx="19.5" ry="14" fill={color} />
          <ellipse cx="22" cy="38" rx="5" ry="12" fill={color} />
          <ellipse cx="58" cy="38" rx="5" ry="12" fill={color} />
        </>
      );
    case "curly":
      return (
        <>
          <circle cx="40" cy="24" r="18" fill={color} />
          <circle cx="24" cy="32" r="9" fill={color} />
          <circle cx="56" cy="32" r="9" fill={color} />
          <circle cx="17" cy="47" r="6" fill={color} />
          <circle cx="63" cy="47" r="6" fill={color} />
        </>
      );
    case "bun":
      return (
        <>
          <ellipse cx="40" cy="30" rx="19.5" ry="13" fill={color} />
          <circle cx="40" cy="18" r="8" fill={color} />
        </>
      );
    case "medium":
      return (
        <>
          <ellipse cx="40" cy="29" rx="19.5" ry="13" fill={color} />
          <ellipse cx="22" cy="54" rx="7" ry="18" fill={color} />
          <ellipse cx="58" cy="54" rx="7" ry="18" fill={color} />
        </>
      );
    case "bald":
      return null;
    default:
      return <ellipse cx="40" cy="29" rx="19.5" ry="14" fill={color} />;
  }
}

function HairFront({ style, color }: { style: string; color: string }) {
  switch (style) {
    case "bun":
      // small strand at top
      return <ellipse cx="40" cy="29" rx="19.5" ry="5" fill={color} />;
    case "curly":
      return (
        <>
          <circle cx="22" cy="35" r="5.5" fill={color} />
          <circle cx="58" cy="35" r="5.5" fill={color} />
          <circle cx="15" cy="48" r="4.5" fill={color} />
          <circle cx="65" cy="48" r="4.5" fill={color} />
        </>
      );
    case "formal":
      // side part highlight
      return (
        <path
          d="M22,30 Q30,24 40,26 Q30,28 22,35 Z"
          fill={lighten(color, 0.25)}
          opacity="0.35"
        />
      );
    default:
      return null;
  }
}

function Glasses() {
  return (
    <g opacity="0.85">
      {/* Left lens */}
      <rect x="24.5" y="40.5" width="12" height="9" rx="3" fill="none" stroke="#c0c0c0" strokeWidth="1.3" />
      {/* Right lens */}
      <rect x="43.5" y="40.5" width="12" height="9" rx="3" fill="none" stroke="#c0c0c0" strokeWidth="1.3" />
      {/* Bridge */}
      <line x1="36.5" y1="45" x2="43.5" y2="45" stroke="#c0c0c0" strokeWidth="1.3" />
      {/* Arms */}
      <line x1="24.5" y1="45" x2="20" y2="45" stroke="#c0c0c0" strokeWidth="1.3" />
      <line x1="55.5" y1="45" x2="60" y2="45" stroke="#c0c0c0" strokeWidth="1.3" />
      {/* Lens tint */}
      <rect x="24.5" y="40.5" width="12" height="9" rx="3" fill="#88ccff" opacity="0.08" />
      <rect x="43.5" y="40.5" width="12" height="9" rx="3" fill="#88ccff" opacity="0.08" />
    </g>
  );
}

// ── Helpers de cor ────────────────────────────────────────────────────────────
function shadowOf(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 35)},${Math.max(0, b - 30)})`;
}

function lipOf(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - 55)},${Math.max(0, g - 65)},${Math.max(0, b - 50)})`;
}

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `rgb(${Math.floor(r * f)},${Math.floor(g * f)},${Math.floor(b * f)})`;
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, Math.floor(r + (255 - r) * amount))},${Math.min(255, Math.floor(g + (255 - g) * amount))},${Math.min(255, Math.floor(b + (255 - b) * amount))})`;
}
