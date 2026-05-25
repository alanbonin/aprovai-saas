"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Users, MessageSquare, Zap, Timer, Send, ArrowLeft,
  Crown, Circle, Check, X, Trophy, Clock, Play, Pause, RotateCcw, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Membro {
  userId: string;
  name: string;
  inicial: string;
  color: string;
  status: "estudando" | "pausa" | "batalha";
  isHost: boolean;
}

interface ChatMsg {
  id: string;
  userId: string;
  name: string;
  inicial: string;
  text: string;
  ts: number;
}

interface Questao {
  id: number;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  answer: string;
  subjectName?: string;
}

interface Resposta {
  userId: string;
  name: string;
  answer: string;
  correct: boolean;
  ts: number;
}

type BatalhaFase = "idle" | "loading" | "respondendo" | "resultado";

interface BatalhaState {
  fase: BatalhaFase;
  questao: Questao | null;
  respostas: Resposta[];
  timer: number;
  minhaResposta: string | null;
  placar: Record<string, number>; // userId → pontos
}

type Aba = "presenca" | "chat" | "batalha" | "pomodoro";

const CORES = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4"];
const TIMER_QUESTAO = 30; // segundos para responder
const POMODORO_FOCO = 25 * 60;
const POMODORO_PAUSA = 5 * 60;

function getInicial(name: string) { return name.trim()[0]?.toUpperCase() ?? "?"; }
function getColor(userId: string) { return CORES[userId.charCodeAt(0) % CORES.length]; }

// ─── Main Component ────────────────────────────────────────────────────────────
export function SalaEstudos({ code }: { code: string }) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Me
  const [myId, setMyId]     = useState<string>("");
  const [myName, setMyName] = useState<string>("Aluno");
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(false);

  // UI
  const [aba, setAba] = useState<Aba>("presenca");

  // Presença
  const [membros, setMembros] = useState<Membro[]>([]);

  // Chat
  const [msgs, setMsgs]         = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [unreadChat, setUnreadChat] = useState(0);

  // Batalha
  const [batalha, setBatalha] = useState<BatalhaState>({
    fase: "idle", questao: null, respostas: [], timer: TIMER_QUESTAO,
    minhaResposta: null, placar: {},
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [unreadBatalha, setUnreadBatalha] = useState(0);

  // Pomodoro
  const [pomodoroAtivo, setPomodoroAtivo]     = useState(false);
  const [pomodoroTipo, setPomodoroTipo]       = useState<"foco"|"pausa">("foco");
  const [pomodoroRestante, setPomodoroRestante] = useState(POMODORO_FOCO);
  const [pomodoroEndsAt, setPomodoroEndsAt]   = useState<number | null>(null);
  const pomTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Carregar usuário ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);

      const res = await fetch("/api/workspace/grupos");
      const d = await res.json();
      const grupo = (d.grupos ?? []).find((g: { code: string }) => g.code === code);
      const nameRes = await fetch("/api/perfil/nome").catch(() => null);
      let nome = "Aluno";
      if (nameRes?.ok) {
        const nd = await nameRes.json();
        nome = nd.nome ?? user.email?.split("@")[0] ?? "Aluno";
      }
      setMyName(nome);

      // Primeiro membro que entrar vira host (simplificado)
      const isFirstOrCreator = grupo?.criadoEm && Date.now() - new Date(grupo.criadoEm).getTime() < 60000;
      setIsHost(!!isFirstOrCreator);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Conectar canal Supabase Realtime ──────────────────────────────────────
  useEffect(() => {
    if (!myId) return;

    const channel = supabase.channel(`grupo:${code}`, {
      config: { presence: { key: myId } },
    });

    // Presence
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ name: string; isHost: boolean; status: string }>();
      const lista: Membro[] = Object.entries(state).map(([uid, presences]) => {
        const p = presences[0];
        return {
          userId: uid,
          name: p.name,
          inicial: getInicial(p.name),
          color: getColor(uid),
          status: (p.status as Membro["status"]) ?? "estudando",
          isHost: p.isHost,
        };
      });
      setMembros(lista);
      // Host = primeiro da lista (menor join order)
      if (lista.length > 0) setIsHost(lista[0].userId === myId);
    });

    // Chat
    channel.on("broadcast", { event: "chat" }, ({ payload }) => {
      setMsgs(prev => [...prev.slice(-199), payload as ChatMsg]);
      setUnreadChat(n => aba === "chat" ? 0 : n + 1);
    });

    // Batalha — nova questão
    channel.on("broadcast", { event: "batalha_questao" }, ({ payload }) => {
      const { questao } = payload as { questao: Questao };
      clearTimer();
      setBatalha(prev => ({
        ...prev,
        fase: "respondendo",
        questao,
        respostas: [],
        timer: TIMER_QUESTAO,
        minhaResposta: null,
      }));
      startTimer();
      setUnreadBatalha(n => aba === "batalha" ? 0 : n + 1);
    });

    // Batalha — resposta de outro aluno
    channel.on("broadcast", { event: "batalha_resposta" }, ({ payload }) => {
      const resp = payload as Resposta;
      setBatalha(prev => ({
        ...prev,
        respostas: [...prev.respostas.filter(r => r.userId !== resp.userId), resp],
      }));
    });

    // Batalha — encerrar e mostrar resultado
    channel.on("broadcast", { event: "batalha_resultado" }, ({ payload }) => {
      const { respostas, placar } = payload as { respostas: Resposta[]; placar: Record<string, number> };
      clearTimer();
      setBatalha(prev => ({ ...prev, fase: "resultado", respostas, placar }));
    });

    // Pomodoro sync
    channel.on("broadcast", { event: "pomodoro_start" }, ({ payload }) => {
      const { endsAt, tipo } = payload as { endsAt: number; tipo: "foco"|"pausa" };
      syncPomodoro(endsAt, tipo);
    });
    channel.on("broadcast", { event: "pomodoro_stop" }, () => {
      stopPomodoro();
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ name: myName, isHost, status: "estudando" });
        setConnected(true);
      }
    });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, myName]);

  // Update presence track when isHost changes
  useEffect(() => {
    channelRef.current?.track({ name: myName, isHost, status: "estudando" });
  }, [isHost, myName]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Limpa unread ao mudar aba
  useEffect(() => {
    if (aba === "chat") setUnreadChat(0);
    if (aba === "batalha") setUnreadBatalha(0);
  }, [aba]);

  // ── Chat ─────────────────────────────────────────────────────────────────
  function enviarChat() {
    const text = chatInput.trim();
    if (!text || !connected) return;
    const msg: ChatMsg = {
      id: crypto.randomUUID(),
      userId: myId,
      name: myName,
      inicial: getInicial(myName),
      text,
      ts: Date.now(),
    };
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
    setMsgs(prev => [...prev.slice(-199), msg]);
    setChatInput("");
  }

  // ── Batalha ───────────────────────────────────────────────────────────────
  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function startTimer() {
    clearTimer();
    timerRef.current = setInterval(() => {
      setBatalha(prev => {
        if (prev.timer <= 1) {
          clearTimer();
          if (isHost) encerrarBatalha();
          return { ...prev, timer: 0 };
        }
        return { ...prev, timer: prev.timer - 1 };
      });
    }, 1000);
  }

  const encerrarBatalha = useCallback(() => {
    setBatalha(prev => {
      const placarAtualizado = { ...prev.placar };
      for (const r of prev.respostas) {
        if (r.correct) placarAtualizado[r.userId] = (placarAtualizado[r.userId] ?? 0) + 1;
      }
      channelRef.current?.send({
        type: "broadcast", event: "batalha_resultado",
        payload: { respostas: prev.respostas, placar: placarAtualizado },
      });
      return { ...prev, fase: "resultado", placar: placarAtualizado };
    });
  }, []);

  async function sortearQuestao() {
    setBatalha(prev => ({ ...prev, fase: "loading" }));
    try {
      const res = await fetch("/api/questoes?limit=1&random=1");
      const data = await res.json();
      const q: Questao = data.questions?.[0] ?? data[0];
      if (!q) { setBatalha(prev => ({ ...prev, fase: "idle" })); return; }

      channelRef.current?.send({ type: "broadcast", event: "batalha_questao", payload: { questao: q } });
      clearTimer();
      setBatalha(prev => ({
        ...prev, fase: "respondendo", questao: q,
        respostas: [], timer: TIMER_QUESTAO, minhaResposta: null,
      }));
      startTimer();
    } catch {
      setBatalha(prev => ({ ...prev, fase: "idle" }));
    }
  }

  function responder(opcao: string) {
    if (!batalha.questao || batalha.minhaResposta) return;
    const correct = opcao === batalha.questao.answer;
    const resp: Resposta = { userId: myId, name: myName, answer: opcao, correct, ts: Date.now() };
    channelRef.current?.send({ type: "broadcast", event: "batalha_resposta", payload: resp });
    setBatalha(prev => ({
      ...prev,
      minhaResposta: opcao,
      respostas: [...prev.respostas.filter(r => r.userId !== myId), resp],
    }));
  }

  function resetBatalha() {
    clearTimer();
    setBatalha(prev => ({ ...prev, fase: "idle", questao: null, respostas: [], minhaResposta: null, timer: TIMER_QUESTAO }));
  }

  // ── Pomodoro ──────────────────────────────────────────────────────────────
  function syncPomodoro(endsAt: number, tipo: "foco"|"pausa") {
    if (pomTimerRef.current) clearInterval(pomTimerRef.current);
    setPomodoroEndsAt(endsAt);
    setPomodoroTipo(tipo);
    setPomodoroAtivo(true);
    pomTimerRef.current = setInterval(() => {
      const restante = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setPomodoroRestante(restante);
      if (restante === 0) {
        if (pomTimerRef.current) clearInterval(pomTimerRef.current);
        setPomodoroAtivo(false);
      }
    }, 500);
  }

  function stopPomodoro() {
    if (pomTimerRef.current) clearInterval(pomTimerRef.current);
    setPomodoroAtivo(false);
    setPomodoroRestante(POMODORO_FOCO);
    setPomodoroTipo("foco");
  }

  function iniciarPomodoro(tipo: "foco"|"pausa") {
    const duracao = tipo === "foco" ? POMODORO_FOCO : POMODORO_PAUSA;
    const endsAt = Date.now() + duracao * 1000;
    channelRef.current?.send({ type: "broadcast", event: "pomodoro_start", payload: { endsAt, tipo } });
    syncPomodoro(endsAt, tipo);
  }

  function pararPomodoro() {
    channelRef.current?.send({ type: "broadcast", event: "pomodoro_stop", payload: {} });
    stopPomodoro();
  }

  function fmtTimer(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const OPCOES = ["A","B","C","D","E"].filter(o =>
    batalha.questao?.[`option${o}` as keyof Questao]
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0">
        <Link href="/grupos" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-white">Sala <span className="font-mono text-indigo-400">{code}</span></h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {connected ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                {membros.length} online
              </span>
            ) : "Conectando..."}
          </p>
        </div>
        {/* Avatares membros */}
        <div className="flex -space-x-2">
          {membros.slice(0, 5).map(m => (
            <div key={m.userId} title={m.name}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-[#080c18]"
              style={{ background: m.color }}>
              {m.inicial}
            </div>
          ))}
          {membros.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400 border-2 border-[#080c18]">
              +{membros.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 shrink-0">
        {([
          { id: "presenca",  icon: Users,          label: "Online",    badge: 0 },
          { id: "chat",      icon: MessageSquare,   label: "Chat",      badge: unreadChat },
          { id: "batalha",   icon: Zap,             label: "Batalha",   badge: unreadBatalha },
          { id: "pomodoro",  icon: Timer,           label: "Pomodoro",  badge: 0 },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm relative transition-colors",
              aba === t.id
                ? "text-indigo-400 border-b-2 border-indigo-500 -mb-px"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge > 0 && (
              <span className="absolute top-2 right-2 sm:static sm:ml-0.5 w-4 h-4 bg-indigo-500 rounded-full text-white text-[10px] flex items-center justify-center">
                {t.badge > 9 ? "9+" : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">

        {/* ── PRESENÇA ── */}
        {aba === "presenca" && (
          <div className="h-full overflow-y-auto p-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{membros.length} na sala</p>
            {membros.map(m => (
              <div key={m.userId} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: m.color }}>
                  {m.inicial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">
                    {m.name} {m.userId === myId && <span className="text-xs text-gray-500">(você)</span>}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{m.status}</p>
                </div>
                {m.isHost && <Crown className="w-4 h-4 text-amber-400 shrink-0" aria-label="Host" />}
                <Circle className={cn("w-2 h-2 shrink-0 fill-current",
                  m.status === "estudando" ? "text-emerald-400" :
                  m.status === "pausa" ? "text-amber-400" : "text-indigo-400"
                )} />
              </div>
            ))}
            {membros.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aguardando membros...</p>
                <p className="text-xs mt-1">Compartilhe o código <span className="font-mono text-indigo-400">{code}</span></p>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT ── */}
        {aba === "chat" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                  <p className="text-xs mt-1">Diga oi para o grupo! 👋</p>
                </div>
              )}
              {msgs.map(m => (
                <div key={m.id} className={cn("flex gap-2.5", m.userId === myId && "flex-row-reverse")}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{ background: getColor(m.userId) }}>
                    {m.inicial}
                  </div>
                  <div className={cn("max-w-[75%]", m.userId === myId && "items-end flex flex-col")}>
                    <p className="text-[10px] text-gray-500 mb-1">{m.name}</p>
                    <div className={cn(
                      "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                      m.userId === myId
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-white/[0.07] text-gray-200 rounded-tl-sm"
                    )}>
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2 shrink-0">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), enviarChat())}
                placeholder="Mensagem..."
                maxLength={500}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={enviarChat}
                disabled={!chatInput.trim() || !connected}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-white transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── BATALHA DE QUESTÕES ── */}
        {aba === "batalha" && (
          <div className="h-full overflow-y-auto p-4 space-y-4">

            {/* Placar */}
            {Object.keys(batalha.placar).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(batalha.placar)
                  .sort(([,a],[,b]) => b - a)
                  .map(([uid, pts]) => {
                    const m = membros.find(x => x.userId === uid);
                    return (
                      <div key={uid} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] rounded-full border border-white/10 text-xs">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: getColor(uid) }}>
                          {m?.inicial ?? "?"}
                        </div>
                        <span className="text-gray-300">{m?.name ?? uid.slice(0,6)}</span>
                        <span className="font-bold text-amber-400">{pts}pts</span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Idle */}
            {batalha.fase === "idle" && (
              <div className="text-center py-12">
                <Zap className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-60" />
                <p className="text-white font-semibold mb-1">Batalha de Questões</p>
                <p className="text-sm text-gray-500 mb-6">
                  {isHost ? "Sorteie uma questão para todos responderem ao mesmo tempo." : "Aguardando o host iniciar a batalha..."}
                </p>
                {isHost && (
                  <button
                    onClick={sortearQuestao}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm text-white font-medium transition-colors"
                  >
                    Sortear questão
                  </button>
                )}
              </div>
            )}

            {/* Loading */}
            {batalha.fase === "loading" && (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Sorteando questão...</p>
              </div>
            )}

            {/* Respondendo */}
            {batalha.fase === "respondendo" && batalha.questao && (
              <div className="space-y-4">
                {/* Timer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {batalha.questao.subjectName ?? "Questão"}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1.5 font-mono font-bold text-lg",
                    batalha.timer <= 10 ? "text-red-400" : "text-emerald-400"
                  )}>
                    {fmtTimer(batalha.timer)}
                  </div>
                </div>

                {/* Enunciado */}
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
                  <p className="text-sm text-gray-200 leading-relaxed">{batalha.questao.statement}</p>
                </div>

                {/* Opções */}
                <div className="space-y-2">
                  {OPCOES.map(op => {
                    const texto = batalha.questao![`option${op}` as keyof Questao] as string;
                    const selecionada = batalha.minhaResposta === op;
                    return (
                      <button
                        key={op}
                        onClick={() => responder(op)}
                        disabled={!!batalha.minhaResposta}
                        className={cn(
                          "w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-all",
                          selecionada
                            ? "bg-indigo-600/20 border-indigo-500 text-white"
                            : batalha.minhaResposta
                            ? "opacity-40 border-white/10 text-gray-400 cursor-not-allowed"
                            : "bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.07] hover:border-white/20"
                        )}
                      >
                        <span className={cn(
                          "shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold",
                          selecionada ? "border-indigo-400 text-indigo-300" : "border-white/20 text-gray-500"
                        )}>{op}</span>
                        <span className="leading-relaxed">{texto}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Quem já respondeu */}
                <div className="flex flex-wrap gap-2">
                  {batalha.respostas.map(r => (
                    <span key={r.userId} className="text-xs px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                      {r.name} ✓
                    </span>
                  ))}
                </div>

                {isHost && (
                  <button onClick={encerrarBatalha}
                    className="text-xs text-gray-500 hover:text-white underline transition-colors">
                    Encerrar e ver resultado
                  </button>
                )}
              </div>
            )}

            {/* Resultado */}
            {batalha.fase === "resultado" && batalha.questao && (
              <div className="space-y-4">
                <div className="text-center">
                  <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="font-bold text-white">Resultado</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Resposta correta: <span className="text-emerald-400 font-bold">{batalha.questao.answer}</span>
                  </p>
                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
                  {batalha.questao.statement.slice(0, 200)}{batalha.questao.statement.length > 200 ? "..." : ""}
                </div>

                <div className="space-y-2">
                  {batalha.respostas
                    .sort((a, b) => (b.correct ? 1 : 0) - (a.correct ? 1 : 0) || a.ts - b.ts)
                    .map(r => (
                      <div key={r.userId} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border",
                        r.correct ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/5 border-red-500/10"
                      )}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: getColor(r.userId) }}>
                          {getInicial(r.name)}
                        </div>
                        <span className="flex-1 text-sm text-white">{r.name} {r.userId === myId && <span className="text-gray-500">(você)</span>}</span>
                        <span className="text-sm font-bold">{r.answer}</span>
                        {r.correct
                          ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          : <X className="w-4 h-4 text-red-400 shrink-0" />}
                      </div>
                    ))}
                  {batalha.respostas.length === 0 && (
                    <p className="text-center text-sm text-gray-500 py-4">Ninguém respondeu a tempo</p>
                  )}
                </div>

                {isHost && (
                  <div className="flex gap-3 justify-center pt-2">
                    <button onClick={sortearQuestao}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm text-white font-medium transition-colors">
                      <RotateCcw className="w-4 h-4" /> Próxima questão
                    </button>
                    <button onClick={resetBatalha}
                      className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm text-gray-300 transition-colors">
                      Encerrar
                    </button>
                  </div>
                )}
                {!isHost && (
                  <p className="text-center text-xs text-gray-500">Aguardando o host sortear a próxima questão...</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── POMODORO ── */}
        {aba === "pomodoro" && (
          <div className="h-full flex flex-col items-center justify-center p-6 space-y-8">
            {/* Tipo */}
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              {(["foco","pausa"] as const).map(t => (
                <div key={t}
                  className={cn(
                    "px-5 py-2 text-sm font-medium",
                    pomodoroTipo === t
                      ? t === "foco" ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white"
                      : "text-gray-500"
                  )}
                >
                  {t === "foco" ? "🎯 Foco 25min" : "☕ Pausa 5min"}
                </div>
              ))}
            </div>

            {/* Timer display */}
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="60" cy="60" r="54" fill="none"
                  stroke={pomodoroTipo === "foco" ? "#6366f1" : "#10b981"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - pomodoroRestante / (pomodoroTipo === "foco" ? POMODORO_FOCO : POMODORO_PAUSA))}`}
                  style={{ transition: "stroke-dashoffset 0.5s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-mono font-bold text-white">{fmtTimer(pomodoroRestante)}</span>
                <span className="text-xs text-gray-500 mt-1 capitalize">{pomodoroTipo}</span>
              </div>
            </div>

            {/* Controles — só o host controla */}
            {isHost ? (
              <div className="flex flex-col items-center gap-3">
                {!pomodoroAtivo ? (
                  <div className="flex gap-3">
                    <button onClick={() => iniciarPomodoro("foco")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm text-white font-medium transition-colors">
                      <Play className="w-4 h-4" /> Iniciar Foco
                    </button>
                    <button onClick={() => iniciarPomodoro("pausa")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-sm text-white font-medium transition-colors">
                      <Play className="w-4 h-4" /> Pausa
                    </button>
                  </div>
                ) : (
                  <button onClick={pararPomodoro}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl text-sm text-white transition-colors">
                    <Pause className="w-4 h-4" /> Parar
                  </button>
                )}
                <p className="text-xs text-gray-500">Você é o host — controla o timer do grupo</p>
              </div>
            ) : (
              <div className="text-center">
                {pomodoroAtivo
                  ? <p className="text-sm text-gray-400">Timer sincronizado com o grupo 🔄</p>
                  : <p className="text-sm text-gray-500">Aguardando o host iniciar o Pomodoro...</p>}
              </div>
            )}

            {/* Membros presentes */}
            <div className="flex -space-x-2 mt-2">
              {membros.map(m => (
                <div key={m.userId} title={m.name}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-[#080c18]"
                  style={{ background: m.color }}>
                  {m.inicial}
                </div>
              ))}
            </div>
            {membros.length > 0 && (
              <p className="text-xs text-gray-600">{membros.map(m => m.name).join(", ")} estudando junto</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
