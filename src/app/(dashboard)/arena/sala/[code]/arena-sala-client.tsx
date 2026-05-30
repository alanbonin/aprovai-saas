"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useLocalState } from "@/lib/use-session-state";
import {
  ArrowLeft, Swords, Send, Check, X, Trophy, Zap, Crown,
  MessageSquare, ChevronRight, Loader2, Circle, Flame, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Jogador {
  userId: string;
  name: string;
  inicial: string;
  color: string;
  pontos: number;
  streak: number;
  respondeu: boolean;
  ultimaCorreta: boolean | null;
  isHost: boolean;
}

interface Questao {
  id: number;
  statement: string;
  optionA: string; optionB: string; optionC: string; optionD: string; optionE?: string;
  answer: string;
  subjectId?: string;
}

interface ChatMsg {
  id: string; userId: string; name: string; text: string; ts: number;
}

interface FlashMsg { text: string; tipo: "acerto" | "erro" | "streak"; }

type Fase = "lobby" | "countdown" | "questao" | "resultado_parcial" | "fim";

interface GameState {
  fase: Fase;
  rodadaAtual: number;
  totalRodadas: number;
  questao: Questao | null;
  countdown: number;
  timerRestante: number;
  respostas: Record<string, { answer: string; pontos: number; correta: boolean; tempo: number }>;
  placar: Record<string, { pontos: number; streak: number; nome: string; cor: string }>;
}

const CORES = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4","#84cc16","#f97316"];
function getColor(uid: string) { return CORES[uid.charCodeAt(0) % CORES.length]; }
function getInicial(n: string) { return n.trim()[0]?.toUpperCase() ?? "?"; }

const TEMPO_QUESTAO = 20; // segundos
const TEMPO_RESULTADO = 5; // segundos entre questões

// ─── Arena Sala ────────────────────────────────────────────────────────────────
export function ArenaSala({ code, isHostParam, qtdQuestoes, materia, publica }: {
  code: string; isHostParam: boolean; qtdQuestoes: number; materia: string; publica: boolean;
}) {
  const supabase = createClient();
  const chRef    = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [, setSalaAtiva, clearSalaAtiva] = useLocalState<string | null>("arena:sala_ativa", null);

  const [myId, setMyId]     = useState("");
  const [myName, setMyName] = useState("Jogador");
  const [isHost, setIsHost] = useState(isHostParam);
  const [connected, setConnected] = useState(false);

  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [msgs, setMsgs]           = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]  = useState("");
  const [chatAberto, setChatAberto] = useState(true);
  const [unreadChat, setUnreadChat] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [questoes, setQuestoes]   = useState<Questao[]>([]);
  const [flash, setFlash]         = useState<FlashMsg | null>(null);
  const [minhaResposta, setMinhaResposta] = useState<string | null>(null);
  const [questaoInicio, setQuestaoInicio] = useState<number>(0);

  const [game, setGame] = useState<GameState>({
    fase: "lobby",
    rodadaAtual: 0,
    totalRodadas: qtdQuestoes,
    questao: null,
    countdown: 3,
    timerRestante: TEMPO_QUESTAO,
    respostas: {},
    placar: {},
  });

  // ── Carregar usuário ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);
      setSalaAtiva(code); // marca sala ativa no lobby
      // Busca nome real do usuário
      try {
        const { data: u } = await supabase
          .from("User")
          .select("name")
          .eq("supabaseId", user.id)
          .maybeSingle();
        if (u?.name) setMyName(u.name.trim().split(" ")[0]);
        else {
          // fallback para StudentProfile.nomePreferido
          const { data: sp } = await supabase
            .from("StudentProfile")
            .select("nomePreferido")
            .eq("userId", user.id)
            .maybeSingle();
          if (sp?.nomePreferido) setMyName(sp.nomePreferido);
          else setMyName(user.email?.split("@")[0] ?? "Jogador");
        }
      } catch { setMyName(user.email?.split("@")[0] ?? "Jogador"); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canal de jogo ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;

    const ch = supabase.channel(`arena:${code}`, {
      config: { presence: { key: myId } },
    });

    // Presença
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ name: string; isHost: boolean; pontos: number; streak: number }>();
      setJogadores(prev => {
        const novo: Jogador[] = Object.entries(state).map(([uid, ps]) => {
          const p = ps[0];
          const old = prev.find(j => j.userId === uid);
          return {
            userId: uid, name: p.name, inicial: getInicial(p.name), color: getColor(uid),
            pontos: p.pontos ?? old?.pontos ?? 0,
            streak: p.streak ?? old?.streak ?? 0,
            respondeu: old?.respondeu ?? false,
            ultimaCorreta: old?.ultimaCorreta ?? null,
            isHost: p.isHost,
          };
        });
        // Host = primeiro que entrou
        if (novo.length > 0) setIsHost(novo[0].userId === myId);
        return novo;
      });
    });

    // Chat
    ch.on("broadcast", { event: "chat" }, ({ payload }) => {
      setMsgs(prev => [...prev.slice(-199), payload as ChatMsg]);
      if (!chatAberto) setUnreadChat(n => n + 1);
    });

    // Countdown
    ch.on("broadcast", { event: "countdown" }, ({ payload }) => {
      const { n } = payload as { n: number };
      setGame(g => ({ ...g, fase: "countdown", countdown: n }));
    });

    // Nova questão
    ch.on("broadcast", { event: "questao" }, ({ payload }) => {
      const { questao, rodada, total } = payload as { questao: Questao; rodada: number; total: number };
      clearTick();
      setMinhaResposta(null);
      setQuestaoInicio(Date.now());
      setGame(g => ({
        ...g, fase: "questao", questao, rodadaAtual: rodada, totalRodadas: total,
        timerRestante: TEMPO_QUESTAO, respostas: {},
      }));
      setJogadores(prev => prev.map(j => ({ ...j, respondeu: false })));
      // Timer local visual
      let t = TEMPO_QUESTAO;
      timerRef.current = setInterval(() => {
        t--;
        setGame(g => ({ ...g, timerRestante: Math.max(0, t) }));
        if (t <= 0) clearTick();
      }, 1000);
    });

    // Resposta de outro jogador
    ch.on("broadcast", { event: "respondeu" }, ({ payload }) => {
      const { userId } = payload as { userId: string };
      setJogadores(prev => prev.map(j => j.userId === userId ? { ...j, respondeu: true } : j));
    });

    // Resultado da rodada
    ch.on("broadcast", { event: "resultado_rodada" }, ({ payload }) => {
      clearTick();
      const { respostas, placar, questao } = payload as {
        respostas: GameState["respostas"];
        placar: GameState["placar"];
        questao: Questao;
      };

      // Flash para mim
      const minha = respostas[myId];
      if (minha) {
        if (minha.correta && (placar[myId]?.streak ?? 0) >= 3) {
          showFlash({ text: `🔥 SEQUÊNCIA ${placar[myId].streak}x! +${minha.pontos}pts`, tipo: "streak" });
        } else if (minha.correta) {
          showFlash({ text: `✅ CORRETO! +${minha.pontos}pts`, tipo: "acerto" });
        } else {
          showFlash({ text: `❌ Errou! Resposta: ${questao.answer}`, tipo: "erro" });
        }
      }

      setGame(g => ({ ...g, fase: "resultado_parcial", respostas, placar }));
      setJogadores(prev => prev.map(j => ({
        ...j,
        pontos: placar[j.userId]?.pontos ?? j.pontos,
        streak: placar[j.userId]?.streak ?? j.streak,
        ultimaCorreta: respostas[j.userId]?.correta ?? null,
      })));
    });

    // Fim de jogo
    ch.on("broadcast", { event: "fim_jogo" }, ({ payload }) => {
      clearTick();
      clearSalaAtiva();
      const { placar } = payload as { placar: GameState["placar"] };
      setGame(g => ({ ...g, fase: "fim", placar }));
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ name: myName, isHost: isHostParam, pontos: 0, streak: 0 });
        setConnected(true);
      }
    });

    chRef.current = ch;
    return () => { clearTick(); supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, myName]);

  function clearTick() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function showFlash(f: FlashMsg) {
    setFlash(f);
    setTimeout(() => setFlash(null), 2500);
  }

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { if (chatAberto) setUnreadChat(0); }, [chatAberto]);

  // ── Enviar chat ─────────────────────────────────────────────────────────────
  function enviarChat() {
    const t = chatInput.trim(); if (!t) return;
    const msg: ChatMsg = { id: crypto.randomUUID(), userId: myId, name: myName, text: t, ts: Date.now() };
    chRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
    setMsgs(prev => [...prev.slice(-199), msg]);
    setChatInput("");
  }

  // ── Buscar questões (host) ──────────────────────────────────────────────────
  async function buscarQuestoes(): Promise<Questao[]> {
    const params = new URLSearchParams({ limit: String(qtdQuestoes) });
    if (materia) params.set("search", materia);
    const res = await fetch(`/api/questoes?${params}`);
    const data = await res.json();
    return (data.questions ?? []) as Questao[];
  }

  // ── Iniciar jogo (host) ─────────────────────────────────────────────────────
  const iniciarJogo = useCallback(async () => {
    const qs = await buscarQuestoes();
    if (qs.length === 0) return;
    setQuestoes(qs);

    // Countdown 3, 2, 1
    for (let n = 3; n >= 1; n--) {
      chRef.current?.send({ type: "broadcast", event: "countdown", payload: { n } });
      setGame(g => ({ ...g, fase: "countdown", countdown: n }));
      await new Promise(r => setTimeout(r, 1000));
    }

    // Primeira questão
    enviarQuestao(qs, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtdQuestoes, materia]);

  function enviarQuestao(qs: Questao[], idx: number) {
    const q = qs[idx];
    chRef.current?.send({
      type: "broadcast", event: "questao",
      payload: { questao: q, rodada: idx + 1, total: qs.length },
    });
    setMinhaResposta(null);
    setQuestaoInicio(Date.now());
    setGame(g => ({
      ...g, fase: "questao", questao: q,
      rodadaAtual: idx + 1, totalRodadas: qs.length,
      timerRestante: TEMPO_QUESTAO, respostas: {},
    }));
    setJogadores(prev => prev.map(j => ({ ...j, respondeu: false })));
    clearTick();
    let t = TEMPO_QUESTAO;
    timerRef.current = setInterval(() => {
      t--;
      setGame(g => ({ ...g, timerRestante: Math.max(0, t) }));
      if (t <= 0) {
        clearTick();
        // host encerra rodada automaticamente
        setTimeout(() => encerrarRodada(qs, idx), 300);
      }
    }, 1000);
  }

  const encerrarRodada = useCallback((qs: Questao[], idx: number) => {
    setGame(prev => {
      const q = qs[idx];
      const novosPontos = { ...prev.placar };
      const respostasAtualizadas = { ...prev.respostas };

      for (const [uid, resp] of Object.entries(prev.respostas)) {
        // Resolve nome: tenta jogadores (outros), depois myName (eu mesmo)
        const nomeResolvido = uid === myId
          ? myName
          : (jogadores.find(x => x.userId === uid)?.name ?? prev.placar[uid]?.nome ?? uid.slice(0, 6));
        const cor = uid === myId ? getColor(myId) : (jogadores.find(x => x.userId === uid)?.color ?? getColor(uid));
        const oldStreak = novosPontos[uid]?.streak ?? 0;
        const oldPts    = novosPontos[uid]?.pontos ?? 0;

        if (resp.correta) {
          const velocidade = Math.max(0, Math.round((1 - Math.min(resp.tempo, TEMPO_QUESTAO) / TEMPO_QUESTAO) * 50));
          const base = 100 + velocidade;
          const novoStreak = oldStreak + 1;
          const streakBonus = novoStreak >= 3 ? 30 : 0;
          const totalPts = base + streakBonus;
          novosPontos[uid] = { pontos: oldPts + totalPts, streak: novoStreak, nome: nomeResolvido, cor };
          respostasAtualizadas[uid] = { ...resp, pontos: totalPts };
        } else {
          novosPontos[uid] = { pontos: oldPts, streak: 0, nome: nomeResolvido, cor };
          respostasAtualizadas[uid] = { ...resp, pontos: 0 };
        }
      }

      chRef.current?.send({
        type: "broadcast", event: "resultado_rodada",
        payload: { respostas: respostasAtualizadas, placar: novosPontos, questao: q },
      });

      // Próxima questão ou fim
      const isLast = idx + 1 >= qs.length;
      setTimeout(() => {
        if (isLast) {
          chRef.current?.send({ type: "broadcast", event: "fim_jogo", payload: { placar: novosPontos } });
          clearSalaAtiva();
          setGame(g => ({ ...g, fase: "fim", placar: novosPontos }));
        } else {
          enviarQuestao(qs, idx + 1);
        }
      }, TEMPO_RESULTADO * 1000);

      return { ...prev, fase: "resultado_parcial", placar: novosPontos, respostas: respostasAtualizadas };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogadores, myId, myName]);

  // ── Responder questão ───────────────────────────────────────────────────────
  function responder(opcao: string) {
    if (!game.questao || minhaResposta) return;
    const correta = opcao === game.questao.answer;
    const tempo   = (Date.now() - questaoInicio) / 1000;

    setMinhaResposta(opcao);
    chRef.current?.send({ type: "broadcast", event: "respondeu", payload: { userId: myId } });

    setGame(prev => ({
      ...prev,
      respostas: {
        ...prev.respostas,
        [myId]: { answer: opcao, pontos: 0, correta, tempo },
      },
    }));

    if (isHost) {
      // Se todos responderam, encerra — usa updater para ler respostas atualizadas
      setGame(prev => {
        const totalJogadores = jogadores.length;
        const totalRespostas = Object.keys(prev.respostas).length; // já inclui a resposta recém-adicionada
        if (totalRespostas >= totalJogadores) {
          clearTick();
          setTimeout(() => encerrarRodada(questoes, prev.rodadaAtual - 1), 500);
        }
        return prev;
      });
    }
  }

  // ── Sorted placar ───────────────────────────────────────────────────────────
  // Para sidebar (durante jogo): usa jogadores com pontos atualizados
  const placarOrdenado = [...jogadores].sort((a, b) => b.pontos - a.pontos);
  // Para tela de fim: usa game.placar (fonte da verdade — vem do broadcast do host)
  const placarFinal = Object.entries(game.placar)
    .sort(([, a], [, b]) => b.pontos - a.pontos)
    .map(([uid, p]) => ({ userId: uid, pontos: p.pontos, streak: p.streak, nome: p.nome, cor: p.cor, inicial: getInicial(p.nome) }));
  const vencedorFinal = placarFinal[0];
  const vencedor = placarOrdenado[0];
  const OPCOES = ["A","B","C","D","E"].filter(o => game.questao?.[`option${o}` as keyof Questao]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#07091a]">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] shrink-0 bg-[#080c18]">
        <div className="flex items-center gap-3">
          <Link href="/arena" className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-white text-sm">Arena</span>
            <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{code}</span>
          </div>
        </div>

        {/* Rodada indicator */}
        {(game.fase === "questao" || game.fase === "resultado_parcial") && (
          <div className="flex items-center gap-2">
            {Array.from({ length: game.totalRodadas }).map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full transition-all",
                i < game.rodadaAtual ? "w-4 bg-indigo-500" :
                i === game.rodadaAtual - 1 ? "w-4 bg-indigo-400 animate-pulse" :
                "w-4 bg-white/10"
              )} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Circle className={cn("w-2 h-2 fill-current", connected ? "text-emerald-400" : "text-gray-600")} />
          <span className="text-xs text-gray-500">{jogadores.length} na sala</span>
        </div>
      </div>

      {/* Flash overlay */}
      {flash && (
        <div className={cn(
          "fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-bold text-white text-lg shadow-2xl animate-bounce",
          flash.tipo === "acerto"  ? "bg-emerald-600 shadow-emerald-500/30" :
          flash.tipo === "erro"    ? "bg-red-600 shadow-red-500/30" :
          "bg-amber-500 shadow-amber-500/30"
        )}>
          {flash.text}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ESQUERDA — Placar ── */}
        <div className="w-48 xl:w-56 border-r border-white/[0.07] flex flex-col shrink-0 hidden sm:flex">
          <div className="px-3 py-2 border-b border-white/[0.07]">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Placar</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
            {placarOrdenado.map((j, idx) => (
              <div key={j.userId} className={cn(
                "flex items-center gap-2 px-2 py-2 rounded-xl transition-all",
                j.userId === myId ? "bg-indigo-500/10 border border-indigo-500/20" : "hover:bg-white/[0.03]"
              )}>
                <span className={cn("text-xs font-bold w-4 text-center shrink-0",
                  idx === 0 ? "text-amber-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-orange-400" : "text-gray-600"
                )}>{idx + 1}</span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: j.color }}>{j.inicial}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{j.name}</p>
                  <p className="text-[10px] text-indigo-400 font-bold">{j.pontos}pts</p>
                </div>
                {j.streak >= 3 && <Flame className="w-3 h-3 text-amber-400 shrink-0" />}
                {j.respondeu && game.fase === "questao" && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                {game.fase === "resultado_parcial" && j.ultimaCorreta !== null && (
                  j.ultimaCorreta
                    ? <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    : <X className="w-3 h-3 text-red-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── CENTRO — Jogo ── */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* LOBBY */}
          {game.fase === "lobby" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600/30 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Swords className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Sala {code}</h2>
                <p className="text-gray-400 mt-1">{qtdQuestoes} questões {materia ? `· ${materia}` : ""}</p>
              </div>

              {/* Jogadores presentes */}
              <div className="flex flex-wrap justify-center gap-3 max-w-sm">
                {[{ userId: myId, name: myName, color: getColor(myId), inicial: getInicial(myName), isHost: isHostParam }, ...jogadores].map(j => (
                  <div key={j.userId} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative"
                      style={{ background: j.color }}>
                      {j.inicial}
                      {j.isHost && <Crown className="w-3 h-3 text-amber-400 absolute -top-1 -right-1" />}
                    </div>
                    <p className="text-xs text-gray-400">{j.name}</p>
                  </div>
                ))}
              </div>

              {isHost ? (
                <button onClick={iniciarJogo}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl font-bold text-white text-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-105">
                  <Zap className="w-5 h-5" /> Iniciar Batalha!
                </button>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aguardando o host iniciar...
                </div>
              )}
              <p className="text-xs text-gray-600">Código da sala: <span className="font-mono text-indigo-400">{code}</span></p>
            </div>
          )}

          {/* COUNTDOWN */}
          {game.fase === "countdown" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-4 uppercase tracking-widest">Preparar...</p>
                <div className="text-8xl font-black text-indigo-400 animate-ping"
                  style={{ animationDuration: "0.8s" }}>
                  {game.countdown}
                </div>
              </div>
            </div>
          )}

          {/* QUESTÃO */}
          {game.fase === "questao" && game.questao && (
            <div className="flex-1 flex flex-col p-4 md:p-6 space-y-4">
              {/* Timer bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Rodada {game.rodadaAtual}/{game.totalRodadas}</span>
                  <span className={cn("font-mono font-bold text-sm", game.timerRestante <= 5 ? "text-red-400" : "text-white")}>
                    {game.timerRestante}s
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000",
                      game.timerRestante > 10 ? "bg-indigo-500" :
                      game.timerRestante > 5  ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${(game.timerRestante / TEMPO_QUESTAO) * 100}%` }}
                  />
                </div>
              </div>

              {/* Enunciado */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-white text-sm md:text-base leading-relaxed">{game.questao.statement}</p>
              </div>

              {/* Opções */}
              <div className="grid grid-cols-1 gap-2.5">
                {OPCOES.map(op => {
                  const texto = game.questao![`option${op}` as keyof Questao] as string;
                  const selecionada = minhaResposta === op;
                  const desabilitada = !!minhaResposta;
                  return (
                    <button key={op} onClick={() => responder(op)} disabled={desabilitada}
                      className={cn(
                        "w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all",
                        selecionada
                          ? "bg-indigo-600/25 border-indigo-500 text-white scale-[0.99]"
                          : desabilitada
                          ? "opacity-40 border-white/[0.06] text-gray-500 cursor-not-allowed"
                          : "bg-white/[0.03] border-white/[0.08] text-gray-300 hover:bg-white/[0.07] hover:border-indigo-500/40 hover:text-white active:scale-[0.98]"
                      )}>
                      <span className={cn(
                        "w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0",
                        selecionada ? "border-indigo-400 bg-indigo-600/40 text-indigo-300" : "border-white/15 text-gray-600"
                      )}>{op}</span>
                      <span className="leading-relaxed">{texto}</span>
                    </button>
                  );
                })}
              </div>

              {minhaResposta && (
                <p className="text-center text-xs text-gray-500 animate-pulse">
                  Aguardando outros jogadores...
                </p>
              )}
            </div>
          )}

          {/* RESULTADO PARCIAL */}
          {game.fase === "resultado_parcial" && game.questao && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-5">
              <div className="w-full max-w-md">
                <p className="text-center text-xs text-gray-500 mb-1">Resposta correta</p>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                  <span className="text-emerald-400 font-bold text-lg">{game.questao.answer}</span>
                  <span className="text-gray-300 text-sm ml-3">
                    {game.questao[`option${game.questao.answer}` as keyof Questao] as string}
                  </span>
                </div>
              </div>

              <div className="w-full max-w-md space-y-2">
                {Object.entries(game.respostas)
                  .sort(([,a],[,b]) => (b.correta ? 1 : 0) - (a.correta ? 1 : 0))
                  .map(([uid, r]) => {
                    const j = jogadores.find(x => x.userId === uid) ?? { name: uid, color: getColor(uid), inicial: uid[0] };
                    return (
                      <div key={uid} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border",
                        r.correta ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/5 border-red-500/10"
                      )}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: j.color }}>{j.inicial}</div>
                        <span className="flex-1 text-sm text-white">{j.name}</span>
                        <span className="text-xs font-bold">{r.answer}</span>
                        {r.correta
                          ? <span className="text-xs text-emerald-400 font-bold">+{r.pontos}pts</span>
                          : <span className="text-xs text-red-400">—</span>}
                        {r.correta ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-red-400" />}
                      </div>
                    );
                  })}
              </div>

              <p className="text-xs text-gray-600 animate-pulse">
                {isHost ? "Próxima questão em breve..." : "Aguardando..."}
              </p>
            </div>
          )}

          {/* FIM */}
          {game.fase === "fim" && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 text-center">
              <Trophy className="w-16 h-16 text-amber-400" />
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Vencedor</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl"
                    style={{ background: vencedorFinal?.cor ?? "#6366f1" }}>
                    {vencedorFinal?.inicial ?? "?"}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{vencedorFinal?.nome ?? "—"}</p>
                    <p className="text-indigo-400 font-bold">{vencedorFinal?.pontos ?? 0} pontos</p>
                  </div>
                </div>
              </div>

              {/* Pódio completo */}
              <div className="w-full max-w-sm space-y-2">
                {placarFinal.map((j, i) => (
                  <div key={j.userId} className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border",
                    i === 0 ? "bg-amber-500/10 border-amber-500/30" :
                    i === 1 ? "bg-gray-400/5 border-gray-400/20" :
                    i === 2 ? "bg-orange-600/5 border-orange-600/20" :
                    "bg-white/[0.02] border-white/[0.06]"
                  )}>
                    <span className="text-lg font-black w-6 text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}º`}
                    </span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: j.cor }}>{j.inicial}</div>
                    <span className="flex-1 text-sm text-white font-medium">{j.nome}</span>
                    <span className="font-bold text-sm text-white">{j.pontos}pts</span>
                    {j.streak >= 3 && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                {isHost && (
                  <button onClick={iniciarJogo}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white transition-colors">
                    <Zap className="w-4 h-4" /> Revanche!
                  </button>
                )}
                <Link href="/arena"
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm text-gray-300 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Lobby
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR DIREITA — Chat ── */}
        <div className={cn(
          "border-l border-white/[0.07] flex flex-col shrink-0 transition-all duration-300",
          chatAberto ? "w-64 xl:w-72" : "w-10"
        )}>
          {/* Toggle */}
          <button
            onClick={() => setChatAberto(v => !v)}
            aria-label={chatAberto ? "Fechar chat" : "Abrir chat"}
            aria-expanded={chatAberto}
            className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.07] w-full hover:bg-white/[0.03] transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-gray-500 shrink-0" />
            {chatAberto && <span className="text-xs text-gray-500 flex-1 text-left">Chat</span>}
            {unreadChat > 0 && (
              <span className="w-4 h-4 bg-indigo-500 rounded-full text-[10px] text-white flex items-center justify-center shrink-0">
                {unreadChat > 9 ? "9+" : unreadChat}
              </span>
            )}
            <ChevronRight className={cn("w-3.5 h-3.5 text-gray-600 shrink-0 transition-transform", chatAberto && "rotate-180")} />
          </button>

          {chatAberto && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {msgs.length === 0 && (
                  <p className="text-xs text-gray-600 text-center pt-4">Chat da sala</p>
                )}
                {msgs.map(m => (
                  <div key={m.id} className={cn("flex gap-2", m.userId === myId && "flex-row-reverse")}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                      style={{ background: getColor(m.userId) }}>
                      {getInicial(m.name)}
                    </div>
                    <div className={cn("max-w-[80%]", m.userId === myId && "items-end flex flex-col")}>
                      <div className={cn(
                        "px-2.5 py-1.5 rounded-xl text-xs leading-relaxed",
                        m.userId === myId ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white/[0.07] text-gray-300 rounded-tl-sm"
                      )}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-2 border-t border-white/[0.07] flex gap-1.5 shrink-0">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), enviarChat())}
                  placeholder="Mensagem..."
                  maxLength={200}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 min-w-0"
                />
                <button onClick={enviarChat} disabled={!chatInput.trim()}
                  aria-label="Enviar mensagem"
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-white transition-colors shrink-0">
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
