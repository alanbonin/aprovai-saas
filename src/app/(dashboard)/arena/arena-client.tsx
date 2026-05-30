"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Swords, Wifi, WifiOff, Plus, Hash, Crown, Zap, Users, Shield, ArrowRight, Loader2, Circle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useLocalState } from "@/lib/use-session-state";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface JogadorOnline {
  userId: string;
  name: string;
  inicial: string;
  color: string;
  disponivel: boolean; // se aceita desafios públicos
  nivel: number;
}

interface SalaPublica {
  code: string;
  hostName: string;
  jogadores: number;
  maxJogadores: number;
  config: { qtdQuestoes: number; materia: string };
  status: "aguardando" | "em_jogo";
}

interface Desafio {
  de: string;
  deName: string;
  salaCode: string;
}

const CORES = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4","#84cc16","#f97316"];
function getColor(uid: string) { return CORES[uid.charCodeAt(0) % CORES.length]; }
function getInicial(name: string) { return name.trim()[0]?.toUpperCase() ?? "?"; }
function makeCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

// ─── Arena Lobby ───────────────────────────────────────────────────────────────
export function ArenaLobby() {
  const supabase  = createClient();
  const router    = useRouter();
  const lobbyRef  = useRef<RealtimeChannel | null>(null);

  const [myId, setMyId]         = useState("");
  const [myName, setMyName]     = useState("Jogador");
  const [myNivel, setMyNivel]   = useState(1);
  const [disponivel, setDisponivel] = useState(false);
  const [connected, setConnected] = useState(false);

  const [jogadores, setJogadores] = useState<JogadorOnline[]>([]);
  const [salas, setSalas]         = useState<SalaPublica[]>([]);
  const [desafio, setDesafio]     = useState<Desafio | null>(null);

  const [salaAtiva, setSalaAtiva, clearSalaAtiva] = useLocalState<string | null>("arena:sala_ativa", null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal]     = useState(false);
  const [joinCode, setJoinCode]               = useState("");
  const [config, setConfig] = useState({
    qtdQuestoes: 10,
    materia: "",
    publica: true,
    maxJogadores: 8,
  });

  // ── Carregar usuário ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);

      // Nome do perfil
      try {
        const r = await fetch("/api/perfil/nome");
        if (r.ok) { const d = await r.json(); setMyName(d.nome ?? "Jogador"); }
      } catch { /* ok */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canal de Lobby ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;

    const ch = supabase.channel("arena-lobby", {
      config: { presence: { key: myId } },
    });

    // Presença — jogadores online
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ name: string; disponivel: boolean; nivel: number }>();
      const lista: JogadorOnline[] = Object.entries(state)
        .map(([uid, ps]) => ({
          userId: uid,
          name: ps[0].name,
          inicial: getInicial(ps[0].name),
          color: getColor(uid),
          disponivel: ps[0].disponivel,
          nivel: ps[0].nivel ?? 1,
        }))
        .filter(j => j.userId !== myId);
      setJogadores(lista);
    });

    // Salas públicas abertas
    ch.on("broadcast", { event: "sala_aberta" }, ({ payload }) => {
      setSalas(prev => {
        const exists = prev.find(s => s.code === payload.code);
        if (exists) return prev.map(s => s.code === payload.code ? payload as SalaPublica : s);
        return [...prev, payload as SalaPublica];
      });
    });
    ch.on("broadcast", { event: "sala_fechada" }, ({ payload }) => {
      setSalas(prev => prev.filter(s => s.code !== (payload as { code: string }).code));
    });

    // Desafio recebido
    ch.on("broadcast", { event: `desafio:${myId}` }, ({ payload }) => {
      setDesafio(payload as Desafio);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ name: myName, disponivel, nivel: myNivel });
        setConnected(true);
      }
    });

    lobbyRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, myName]);

  // Atualiza presença quando disponibilidade muda
  useEffect(() => {
    lobbyRef.current?.track({ name: myName, disponivel, nivel: myNivel });
  }, [disponivel, myName, myNivel]);

  // ── Criar sala ──────────────────────────────────────────────────────────────
  async function criarSala() {
    const code = makeCode();
    // Anuncia no lobby se pública
    if (config.publica) {
      lobbyRef.current?.send({
        type: "broadcast", event: "sala_aberta",
        payload: {
          code, hostName: myName,
          jogadores: 1, maxJogadores: config.maxJogadores,
          config: { qtdQuestoes: config.qtdQuestoes, materia: config.materia },
          status: "aguardando",
        } satisfies SalaPublica,
      });
    }
    setSalaAtiva(code);
    router.push(`/arena/sala/${code}?host=1&qtd=${config.qtdQuestoes}&materia=${encodeURIComponent(config.materia)}&publica=${config.publica ? 1 : 0}&max=${config.maxJogadores}`);
  }

  // ── Desafiar jogador ────────────────────────────────────────────────────────
  async function desafiar(alvo: JogadorOnline) {
    const code = makeCode();
    lobbyRef.current?.send({
      type: "broadcast", event: `desafio:${alvo.userId}`,
      payload: { de: myId, deName: myName, salaCode: code } satisfies Desafio,
    });
    // Host vai para sala e aguarda
    router.push(`/arena/sala/${code}?host=1&qtd=${config.qtdQuestoes}&materia=`);
  }

  async function aceitarDesafio() {
    if (!desafio) return;
    router.push(`/arena/sala/${desafio.salaCode}`);
  }

  async function entrarSala(code: string) {
    const c = code.trim().toUpperCase();
    setSalaAtiva(c);
    router.push(`/arena/sala/${c}`);
  }

  const disponiveis = jogadores.filter(j => j.disponivel);
  const ocupados    = jogadores.filter(j => !j.disponivel);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Arena</h1>
            <p className="text-sm text-gray-400">Batalhas de questões em tempo real</p>
          </div>
        </div>

        {/* Status online */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDisponivel(v => !v)}
            role="switch"
            aria-checked={disponivel}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all",
              disponivel
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/10"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            )}
          >
            {disponivel ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {disponivel ? "Disponível" : "Offline"}
          </button>
        </div>
      </div>

      {/* Sala ativa — continuar partida */}
      {salaAtiva && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlayCircle className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="font-semibold text-white text-sm">Partida em andamento</p>
              <p className="text-xs text-indigo-300">Sala <span className="font-mono">{salaAtiva}</span> — clique para voltar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setSalaAtiva(salaAtiva); router.push(`/arena/sala/${salaAtiva}`); }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white transition-colors">
              Voltar
            </button>
            <button onClick={clearSalaAtiva}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-400 transition-colors">
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Desafio recebido */}
      {desafio && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between animate-pulse-slow">
          <div className="flex items-center gap-3">
            <Swords className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">⚔️ Desafio recebido!</p>
              <p className="text-sm text-amber-400">{desafio.deName} quer batalhar com você</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={aceitarDesafio}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded-xl text-sm font-bold text-black transition-colors">
              Aceitar
            </button>
            <button onClick={() => setDesafio(null)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-gray-400 transition-colors">
              Recusar
            </button>
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => setShowCreateModal(true)}
          className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/30 rounded-2xl hover:border-indigo-500/60 hover:from-indigo-600/30 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">Criar Sala</p>
            <p className="text-xs text-gray-500 mt-0.5">Pública ou privada</p>
          </div>
        </button>

        <button onClick={() => setShowJoinModal(true)}
          className="flex flex-col items-center gap-3 p-6 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/[0.06] transition-all group">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Hash className="w-6 h-6 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">Entrar por Código</p>
            <p className="text-xs text-gray-500 mt-0.5">Sala de amigos</p>
          </div>
        </button>

        <div className="flex flex-col items-center gap-3 p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">{connected ? jogadores.length + 1 : "—"} online</p>
            <p className="text-xs text-gray-500 mt-0.5">{disponiveis.length} disponíveis</p>
          </div>
        </div>
      </div>

      {/* Salas públicas abertas */}
      {salas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Salas abertas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {salas.filter(s => s.status === "aguardando").map(s => (
              <div key={s.code} className="flex items-center justify-between p-4 bg-white/[0.04] border border-white/10 rounded-xl">
                <div>
                  <p className="font-semibold text-white text-sm">{s.hostName} — <span className="font-mono text-indigo-400 text-xs">{s.code}</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.jogadores}/{s.maxJogadores} jogadores · {s.config.qtdQuestoes} questões
                    {s.config.materia && ` · ${s.config.materia}`}
                  </p>
                </div>
                <button onClick={() => entrarSala(s.code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white font-medium transition-colors">
                  Entrar <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jogadores disponíveis para desafio */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Jogadores online</h2>
        {!connected && (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Conectando ao lobby...
          </div>
        )}
        {connected && jogadores.length === 0 && (
          <div className="text-center py-10 text-gray-600">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Ninguém mais online agora</p>
            <p className="text-xs mt-1">Compartilhe a Arena com seus colegas!</p>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {disponiveis.map(j => (
            <div key={j.userId} className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl group hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: j.color }}>
                  {j.inicial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{j.name}</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Circle className="w-1.5 h-1.5 fill-current" /> Disponível
                  </p>
                </div>
              </div>
              <button onClick={() => desafiar(j)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px] text-white font-medium transition-colors opacity-0 group-hover:opacity-100">
                <Swords className="w-3 h-3" /> Desafiar
              </button>
            </div>
          ))}
          {ocupados.map(j => (
            <div key={j.userId} className="flex items-center gap-2.5 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl opacity-50">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: j.color }}>
                {j.inicial}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-400 truncate">{j.name}</p>
                <p className="text-[10px] text-gray-600">Ocupado</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Criar Sala */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#0f1322] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="font-bold text-white">Criar Sala</h2>
                <p className="text-xs text-gray-500">Configure a batalha</p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Quantidade de questões</label>
              <div className="grid grid-cols-4 gap-2">
                {[5,10,15,20].map(n => (
                  <button key={n} onClick={() => setConfig(c => ({ ...c, qtdQuestoes: n }))}
                    className={cn("py-2 rounded-lg text-sm font-bold border transition-all",
                      config.qtdQuestoes === n
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    )}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Máx. jogadores</label>
              <div className="grid grid-cols-4 gap-2">
                {[2,4,6,8].map(n => (
                  <button key={n} onClick={() => setConfig(c => ({ ...c, maxJogadores: n }))}
                    className={cn("py-2 rounded-lg text-sm font-bold border transition-all",
                      config.maxJogadores === n
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    )}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Matéria (opcional)</label>
              <input value={config.materia} onChange={e => setConfig(c => ({ ...c, materia: e.target.value }))}
                placeholder="Ex: Direito Constitucional"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/10">
              <div>
                <p className="text-sm font-medium text-white">Sala pública</p>
                <p className="text-xs text-gray-500">Aparece no lobby para todos entrarem</p>
              </div>
              <button onClick={() => setConfig(c => ({ ...c, publica: !c.publica }))}
                role="switch"
                aria-checked={config.publica}
                aria-label="Sala pública"
                className={cn("w-11 h-6 rounded-full transition-colors relative", config.publica ? "bg-indigo-600" : "bg-white/10")}>
                <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-transform", config.publica ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>

            <button onClick={criarSala}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2">
              <Swords className="w-4 h-4" /> Criar e Entrar
            </button>
          </div>
        </div>
      )}

      {/* Modal Entrar por código */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowJoinModal(false)}>
          <div className="bg-[#0f1322] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-white">Entrar por Código</h2>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && entrarSala(joinCode)}
              placeholder="XXXXXX"
              maxLength={6}
              aria-label="Código da sala"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl text-white font-mono text-center tracking-widest placeholder-gray-700 focus:outline-none focus:border-indigo-500" />
            <button onClick={() => entrarSala(joinCode)} disabled={joinCode.length < 4}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl font-bold text-white transition-colors">
              Entrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
