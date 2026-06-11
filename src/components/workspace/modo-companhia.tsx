"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Users, Copy, Check, LogOut, Send, Play, Pause, RotateCcw, Timer, Bookmark, BookmarkCheck, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface PresenceUser {
  userId: string;
  name: string;
  avatar: string;
  materia: string;
  onlineSince: number;
}

interface ChatMsg {
  id: string;
  userId: string;
  name: string;
  text: string;
  ts: number;
}

interface TimerState {
  running: boolean;
  remaining: number; // segundos
  mode: "work" | "break";
  startedAt: number | null;
  ownerId: string;
}

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

function genRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getAvatar(name: string) {
  const AVATARS = ["🐯","🦊","🐺","🦁","🐻","🐼","🐸","🦝","🦔","🐧","🦉","🐙","🦋","🐳","🦄"];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATARS[h % AVATARS.length];
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  userId: string;
  userName: string;
  subjects: { id: string; name: string; slug: string }[];
}

// ── Tipos para grupos salvos ──────────────────────────────────────────────────
interface GrupoSalvo {
  id: string;
  nome: string;
  code: string;
  criadoEm: string;
  ultimaSessao: string | null;
  membros: number;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (diff < 60000) return "agora mesmo";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
  if (h < 24) return `${h}h atrás`;
  if (d === 1) return "ontem";
  return `${d} dias atrás`;
}

// ── Tela de entrada ───────────────────────────────────────────────────────────
function LobbyView({
  userName, onJoin,
}: {
  userName: string;
  onJoin: (code: string, materia: string, nomeGrupo?: string) => void;
}) {
  const [mode, setMode] = useState<"create" | "join" | "grupos">("create");
  const [code] = useState(() => genRoomCode());
  const [joinCode, setJoinCode] = useState("");
  const [materia, setMateria] = useState("Estudando...");
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [salvarGrupo, setSalvarGrupo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [grupos, setGrupos] = useState<GrupoSalvo[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  useEffect(() => {
    if (mode !== "grupos") return;
    setLoadingGrupos(true);
    fetch("/api/workspace/grupos").then(r => r.json())
      .then(d => setGrupos(d.grupos ?? []))
      .catch(() => {})
      .finally(() => setLoadingGrupos(false));
  }, [mode]);

  async function removeGrupo(id: string) {
    await fetch("/api/workspace/grupos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", id }),
    });
    setGrupos(g => g.filter(x => x.id !== id));
  }

  function copy() {
    const doFallback = () => {
      try {
        const el = document.createElement("textarea");
        el.value = code; el.style.position = "fixed"; el.style.opacity = "0";
        document.body.appendChild(el); el.focus(); el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } catch { /* silent */ }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(doFallback);
    } else {
      doFallback();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-2xl">👥</div>
        <h2 className="text-lg font-bold text-white mb-0.5">Modo Companhia</h2>
        <p className="text-sm text-gray-400">Estude em grupo com Pomodoro sincronizado e chat</p>
      </div>

      {/* Status */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">O que você está estudando</label>
        <input value={materia} onChange={e => setMateria(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          placeholder="Ex: Direito Administrativo" maxLength={40} />
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-5 gap-1">
        {(["create","join","grupos"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={cn("flex-1 py-2 rounded-lg text-xs font-medium transition-colors",
              mode === m ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white")}>
            {m === "create" ? "Criar" : m === "join" ? "Entrar" : "Meus Grupos"}
          </button>
        ))}
      </div>

      {mode === "create" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/3 border border-white/10 p-4">
            <p className="text-xs text-gray-500 mb-2">Código da sala — compartilhe com seus colegas</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-white tracking-widest flex-1">{code}</span>
              <button onClick={copy} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Opção de salvar grupo */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={salvarGrupo} onChange={e => setSalvarGrupo(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500" />
              <span className="text-sm text-gray-400">Salvar como grupo fixo</span>
            </label>
            {salvarGrupo && (
              <input value={nomeGrupo} onChange={e => setNomeGrupo(e.target.value)}
                placeholder="Nome do grupo (ex: Turma TCU 2026)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                maxLength={40} />
            )}
          </div>

          <button onClick={() => onJoin(code, materia, salvarGrupo && nomeGrupo ? nomeGrupo : undefined)}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors">
            Criar e entrar na sala →
          </button>
        </div>
      )}

      {mode === "join" && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Código da sala (6 caracteres)</label>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="Ex: AB12CD"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 tracking-widest text-lg font-bold text-center" />
          </div>
          <button onClick={() => joinCode.length === 6 && onJoin(joinCode, materia)}
            disabled={joinCode.length !== 6}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors">
            Entrar na sala →
          </button>
        </div>
      )}

      {mode === "grupos" && (
        <div>
          {loadingGrupos ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : grupos.length === 0 ? (
            <div className="text-center py-8">
              <BookmarkCheck className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhum grupo salvo</p>
              <p className="text-xs text-gray-600 mt-1">Crie uma sala e marque "Salvar como grupo fixo"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {grupos.map(g => (
                <div key={g.id}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-3 hover:bg-white/5 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{g.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 font-mono">{g.code}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {fmtRelative(g.ultimaSessao)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => onJoin(g.code, materia)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors flex-shrink-0">
                    Entrar
                  </button>
                  <button onClick={() => removeGrupo(g.id)}
                    className="p-1.5 text-gray-700 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-700 mt-5">{userName}</p>
    </div>
  );
}

// ── Sala ──────────────────────────────────────────────────────────────────────
function RoomView({
  roomCode, userId, userName, materia, onLeave,
}: {
  roomCode: string;
  userId: string;
  userName: string;
  materia: string;
  onLeave: () => void;
}) {
  const [members, setMembers] = useState<PresenceUser[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [timer, setTimer] = useState<TimerState>({
    running: false,
    remaining: WORK_SECS,
    mode: "work",
    startedAt: null,
    ownerId: userId,
  });
  const [localRemaining, setLocalRemaining] = useState(WORK_SECS);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const avatar = getAvatar(userName);
  const isOwner = timer.ownerId === userId || members[0]?.userId === userId;

  // ── Supabase Realtime ──────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`companhia:${roomCode}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    // Presence
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      const list = Object.values(state).flat().sort((a, b) => a.onlineSince - b.onlineSince);
      setMembers(list);
    });

    // Broadcast: chat
    channel.on("broadcast", { event: "chat" }, ({ payload }) => {
      setMsgs(prev => [...prev, payload as ChatMsg].slice(-100));
    });

    // Broadcast: timer
    channel.on("broadcast", { event: "timer" }, ({ payload }) => {
      const ts = payload as TimerState;
      setTimer(ts);
      if (!ts.running && ts.startedAt === null) {
        setLocalRemaining(ts.remaining);
      }
    });

    channel.subscribe(async status => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId,
          name: userName,
          avatar,
          materia,
          onlineSince: Date.now(),
        } satisfies PresenceUser);
      }
    });

    return () => {
      channel.untrack().then(() => supabase.removeChannel(channel));
    };
  }, [roomCode, userId, userName, materia, avatar]);

  // ── Tick local do timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (!timer.running || timer.startedAt === null) return;
    const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
    const remaining = Math.max(0, timer.remaining - elapsed);
    setLocalRemaining(remaining);

    const interval = setInterval(() => {
      const e = Math.floor((Date.now() - timer.startedAt!) / 1000);
      const r = Math.max(0, timer.remaining - e);
      setLocalRemaining(r);
      if (r === 0) clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
  }, [timer]);

  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // ── Timer controls ─────────────────────────────────────────────────────────
  const broadcastTimer = useCallback((update: TimerState) => {
    channelRef.current?.send({ type: "broadcast", event: "timer", payload: update });
  }, []);

  function toggleTimer() {
    if (!isOwner) return;
    const next: TimerState = timer.running
      ? { ...timer, running: false, startedAt: null }
      : { ...timer, running: true, startedAt: Date.now() };
    setTimer(next);
    broadcastTimer(next);
  }

  function resetTimer() {
    if (!isOwner) return;
    const next: TimerState = {
      running: false,
      remaining: timer.mode === "work" ? WORK_SECS : BREAK_SECS,
      mode: timer.mode,
      startedAt: null,
      ownerId: userId,
    };
    setTimer(next);
    setLocalRemaining(next.remaining);
    broadcastTimer(next);
  }

  function switchMode() {
    if (!isOwner) return;
    const nextMode: "work" | "break" = timer.mode === "work" ? "break" : "work";
    const next: TimerState = {
      running: false,
      remaining: nextMode === "work" ? WORK_SECS : BREAK_SECS,
      mode: nextMode,
      startedAt: null,
      ownerId: userId,
    };
    setTimer(next);
    setLocalRemaining(next.remaining);
    broadcastTimer(next);
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  function sendMsg() {
    if (!draft.trim()) return;
    const msg: ChatMsg = {
      id: Math.random().toString(36).slice(2),
      userId,
      name: userName,
      text: draft.trim(),
      ts: Date.now(),
    };
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
    setMsgs(prev => [...prev, msg].slice(-100));
    setDraft("");
  }

  const pct = timer.mode === "work"
    ? (localRemaining / WORK_SECS) * 100
    : (localRemaining / BREAK_SECS) * 100;

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">{roomCode}</span>
          <span className="text-xs text-gray-500">{members.length} na sala</span>
        </div>
        <button onClick={onLeave}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>

      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left: Pomodoro + Members */}
        <div className="w-56 flex-shrink-0 border-r border-white/8 flex flex-col">
          {/* Pomodoro */}
          <div className="p-4 border-b border-white/8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1">
                <button onClick={switchMode}
                  className={cn("text-xs px-2 py-0.5 rounded-full border transition-colors",
                    timer.mode === "work"
                      ? "bg-indigo-500/15 border-indigo-500/20 text-indigo-400"
                      : "bg-green-500/15 border-green-500/20 text-green-400"
                  )}>
                  {timer.mode === "work" ? "🍅 Foco" : "☕ Pausa"}
                </button>
              </div>
              {!isOwner && <span className="text-xs text-gray-600">sincronizado</span>}
            </div>

            {/* Timer ring */}
            <div className="relative flex items-center justify-center mb-3">
              <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle cx="50" cy="50" r="44" fill="none"
                  stroke={timer.mode === "work" ? "#6366f1" : "#10b981"}
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <span className="absolute text-2xl font-black text-white font-mono tabular-nums">
                {fmt(localRemaining)}
              </span>
            </div>

            {isOwner ? (
              <div className="flex gap-2">
                <button onClick={toggleTimer}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors",
                    timer.running
                      ? "bg-amber-500/15 border border-amber-500/20 text-amber-400 hover:bg-amber-500/25"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  )}>
                  {timer.running ? <><Pause className="w-3.5 h-3.5"/>Pausar</> : <><Play className="w-3.5 h-3.5"/>Iniciar</>}
                </button>
                <button onClick={resetTimer}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-gray-600">
                {timer.running ? "⏱ Em andamento" : "⏸ Pausado"}
              </p>
            )}
          </div>

          {/* Members */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Participantes</p>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.userId} className={cn(
                  "flex items-center gap-2 rounded-lg p-2 transition-colors",
                  m.userId === userId ? "bg-indigo-500/10 border border-indigo-500/15" : "bg-white/3"
                )}>
                  <span className="text-xl flex-shrink-0">{m.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {m.name}{m.userId === userId && " (você)"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{m.materia}</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 ml-auto animate-pulse" />
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">Conectando...</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="text-4xl mb-3">💬</span>
                <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
                <p className="text-xs text-gray-600 mt-1">Diga olá para seus colegas!</p>
              </div>
            )}
            {msgs.map(m => {
              const isMe = m.userId === userId;
              return (
                <div key={m.id} className={cn("flex gap-2", isMe && "flex-row-reverse")}>
                  <span className="text-lg flex-shrink-0 self-end">{getAvatar(m.name)}</span>
                  <div className={cn("max-w-[75%]", isMe && "items-end flex flex-col")}>
                    {!isMe && (
                      <p className="text-xs text-gray-500 mb-0.5 ml-1">{m.name}</p>
                    )}
                    <div className={cn(
                      "px-3 py-2 rounded-2xl text-sm",
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-md"
                        : "bg-white/8 border border-white/10 text-gray-200 rounded-bl-md"
                    )}>
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/8">
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                placeholder="Mensagem para a sala..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                maxLength={300}
              />
              <button onClick={sendMsg} disabled={!draft.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function ModoCompanhia({ userId, userName, subjects }: Props) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [materia, setMateria] = useState("Estudando...");

  async function handleJoin(code: string, mat: string, nomeGrupo?: string) {
    setMateria(mat);
    setRoomCode(code);
    // Salva grupo se tiver nome, ou atualiza ultimaSessao se já existir
    if (nomeGrupo) {
      await fetch("/api/workspace/grupos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", nome: nomeGrupo, code }),
      }).catch(() => {});
    } else {
      // Atualiza última sessão de grupo existente
      await fetch("/api/workspace/grupos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "touch", code }),
      }).catch(() => {});
    }
  }

  if (!roomCode) {
    return <LobbyView userName={userName} onJoin={handleJoin} />;
  }

  return (
    <RoomView
      roomCode={roomCode}
      userId={userId}
      userName={userName}
      materia={materia}
      onLeave={() => setRoomCode(null)}
    />
  );
}
