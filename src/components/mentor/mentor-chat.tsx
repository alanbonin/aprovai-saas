"use client";
import { useState, useRef, useEffect } from "react";
import { Send, AlertCircle, Lock, Plus, X, Check, Users, BookMarked, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DOMPurify from "isomorphic-dompurify";

// ── Mapa de action cards [[IR:X]] ────────────────────────────────────────────
const ACTION_MAP: Record<string, { label: string; icon: string; nav: string; color: string }> = {
  questoes:   { label: "Resolver Questões",   icon: "🎯", nav: "estudar",   color: "#6366f1" },
  flashcards: { label: "Revisão Flashcards",  icon: "🃏", nav: "flash",     color: "#0ab5bd" },
  simulado:   { label: "Fazer Simulado",      icon: "🎮", nav: "simulado",  color: "#f59e0b" },
  redacao:    { label: "Treinar Redação",      icon: "✍️", nav: "redacao",   color: "#ec4899" },
  relatorio:  { label: "Ver Desempenho",       icon: "📊", nav: "relatorio", color: "#10b981" },
  plano:      { label: "Meu Plano de Estudos", icon: "🗺️", nav: "estrategia",color: "#8b5cf6" },
  edital:     { label: "Analisar Edital",      icon: "📄", nav: "edital",    color: "#f97316" },
  desafio:    { label: "Desafio Diário",       icon: "⚡", nav: "estudar",   color: "#eab308" },
  revisao:    { label: "Revisão Espaçada",     icon: "🔄", nav: "flash",     color: "#0ab5bd" },
};

// Barra de atalhos rápidos (sticky dentro do chat)
const QUICK_ACTIONS = [
  { key: "questoes",   label: "Questões",   icon: "🎯" },
  { key: "flashcards", label: "Flashcards", icon: "🃏" },
  { key: "simulado",   label: "Simulado",   icon: "🎮" },
  { key: "redacao",    label: "Redação",    icon: "✍️" },
  { key: "relatorio",  label: "Relatório",  icon: "📊" },
  { key: "plano",      label: "Plano",      icon: "🗺️" },
];

function navigate(key: string) {
  const action = ACTION_MAP[key];
  if (!action) return;
  window.dispatchEvent(new CustomEvent("aprovai:navigate", { detail: { nav: action.nav } }));
}

// ── Parser simples de Markdown ────────────────────────────────────────────────
function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1 rounded text-sm font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n/g, '<br/>');
}

// ── Renderiza texto com [[IR:X]] convertidos em action cards inline ───────────
function renderWithActions(text: string) {
  // Divide o texto pelos marcadores [[IR:X]]
  const parts = text.split(/(\[\[IR:[a-z-]+\]\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[\[IR:([a-z-]+)\]\]$/);
    if (!match) return <span key={i}>{part}</span>;
    const key = match[1];
    const action = ACTION_MAP[key];
    if (!action) return null;
    return (
      <button
        key={i}
        onClick={() => navigate(key)}
        className="inline-flex items-center gap-1.5 mx-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95"
        style={{
          background: `${action.color}18`,
          border: `1px solid ${action.color}44`,
          color: action.color,
          verticalAlign: "middle",
        }}
      >
        <span>{action.icon}</span>
        {action.label}
        <ExternalLink size={9} style={{ opacity: 0.7 }} />
      </button>
    );
  });
}
import { MentorAvatar, getPersonaName, getPersonaGreeting } from "@/components/mentor/mentor-avatar";

interface Agent {
  id: string; name: string; description: string;
  area: string | null; categoria: string | null; banca: string | null;
  color: string; isPremium: boolean; avatar: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  agentId?: string;
  combined?: boolean;
}

interface Props {
  agents: Agent[];
  categorias: { id: string; label: string }[];
  aiCreditsLeft: number;
  aiCreditsTotal: number;
  userId: string;
  maxAgents: number;
  activeAgentIds: string[];
}

type ChatMode = "idle" | `single:${string}` | "combined";

export function MentorChat({
  agents, categorias, aiCreditsLeft, aiCreditsTotal, maxAgents,
  activeAgentIds: initialActiveIds,
}: Props) {
  const [activeIds, setActiveIds]     = useState<string[]>(initialActiveIds);
  const [chatMode, setChatMode]       = useState<ChatMode>("idle");
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [credits, setCredits]         = useState(aiCreditsLeft);
  const [error, setError]             = useState("");
  const [filterArea, setFilterArea]   = useState("");
  const [showSelector, setShowSelector] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [memorySaved, setMemorySaved] = useState(false);
  // Mobile: 'list' mostra a lista de mentores, 'chat' mostra o chat
  const [mobileView, setMobileView]   = useState<'list' | 'chat'>('list');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const effectiveMax   = Math.max(maxAgents, 2);
  const isUnlimited    = maxAgents >= 999;
  const activeAgents   = agents.filter(a => activeIds.includes(a.id));
  const filtered       = agents.filter(a =>
    (!filterArea  || a.area === filterArea  || a.categoria === filterArea)
  );

  const singleAgent = chatMode.startsWith("single:")
    ? agents.find(a => a.id === chatMode.slice(7)) ?? null
    : null;
  const isCombined = chatMode === "combined";
  const isIdle     = chatMode === "idle";

  function openSingle(agent: Agent) {
    if (chatMode !== `single:${agent.id}`) {
      setChatMode(`single:${agent.id}`);
      setMessages([]);
      setError("");
      setMemorySaved(false);
    }
    setMobileView('chat'); // no mobile, muda para a tela de chat
  }

  function openCombined() {
    if (chatMode !== "combined") {
      setChatMode("combined");
      setMessages([]);
      setError("");
      setMemorySaved(false);
    }
    setMobileView('chat'); // no mobile, muda para a tela de chat
  }

  async function saveMemory() {
    if (messages.length < 4 || savingMemory) return;
    const agentId   = singleAgent?.id ?? (isCombined ? activeIds[0] : null);
    const agentName = singleAgent ? getPersonaName(singleAgent) : (isCombined ? activeAgents.map(a => getPersonaName(a)).join(" + ") : "Mentor");
    if (!agentId) return;
    setSavingMemory(true);
    try {
      await fetch("/api/workspace/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, agentName, messages }),
      });
      setMemorySaved(true);
    } catch { /* silently ignore */ }
    finally { setSavingMemory(false); }
  }

  useEffect(() => {
    if (messages.length === 10 && !memorySaved && !savingMemory) {
      saveMemory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  async function toggleAgent(agent: Agent) {
    const isActive = activeIds.includes(agent.id);
    if (!isActive && !isUnlimited && activeIds.length >= effectiveMax) return;

    setSaving(true);
    const newIds = isActive ? activeIds.filter(id => id !== agent.id) : [...activeIds, agent.id];

    await fetch("/api/mentor/agentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent.id, action: isActive ? "remove" : "add" }),
    });

    setActiveIds(newIds);
    if (isActive && chatMode === `single:${agent.id}`) { setChatMode("idle"); setMessages([]); }
    if (chatMode === "combined" && newIds.length < 2)  { setChatMode("idle"); setMessages([]); }
    setSaving(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || credits <= 0 || isIdle) return;

    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      let res: Response;

      if (isCombined) {
        res = await fetch("/api/workspace/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, agentIds: activeIds, history: messages.slice(-10) }),
        });
      } else {
        res = await fetch("/api/mentor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, agentId: singleAgent!.id, history: messages.slice(-10) }),
        });
      }

      if (res.status === 429) {
        const data = await res.json();
        setError(data.message ?? "Limite de mensagens atingido.");
        setLoading(false);
        return;
      }

      setCredits(c => Math.max(0, c - 1));
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages(prev => [...prev, {
        role: "assistant", content: "", combined: isCombined, agentId: singleAgent?.id,
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: assistantText };
          return updated;
        });
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Placeholder ── */
  function ChatPlaceholder() {
    if (activeAgents.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            <p className="text-white font-semibold text-lg mb-1">Escolha seu mentor</p>
            <p className="text-gray-500 text-sm mb-4">Cada mentor tem nome, personalidade e especialidade própria</p>
            <button onClick={() => setShowSelector(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-colors">
              Conhecer os mentores
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs px-6">
          <div className="flex justify-center -space-x-2 mb-4">
            {activeAgents.slice(0, 3).map(a => (
              <MentorAvatar key={a.id} agent={a} size={44} showRing />
            ))}
          </div>
          <p className="text-gray-300 font-medium mb-1">
            {activeAgents.length === 1
              ? `${getPersonaName(activeAgents[0])} está pronto(a)`
              : `${activeAgents.length} mentores disponíveis`}
          </p>
          <p className="text-gray-600 text-sm">
            Clique em um mentor ao lado para conversar
            {activeAgents.length >= 2 && <span> ou em <strong className="text-indigo-400">Modo combinado</strong></span>}
          </p>
        </div>
      </div>
    );
  }

  /* ── Header do chat ── */
  function ChatHeader() {
    if (isCombined) {
      return (
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 bg-[#0d1117]">
          <div className="flex -space-x-2.5">
            {activeAgents.map(a => <MentorAvatar key={a.id} agent={a} size={36} showRing />)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-tight">
              {activeAgents.map(a => getPersonaName(a)).join(" + ")}
            </p>
            <p className="text-xs text-indigo-400 mt-0.5">● Modo combinado — respondendo juntos</p>
          </div>
          <HeaderActions />
        </div>
      );
    }
    if (singleAgent) {
      const name = getPersonaName(singleAgent);
      return (
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 bg-[#0d1117]">
          <MentorAvatar agent={singleAgent} size={40} showRing />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">{name}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{singleAgent.description}</p>
          </div>
          <HeaderActions />
        </div>
      );
    }
    return null;
  }

  function HeaderActions() {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        {messages.length >= 4 && (
          <button onClick={saveMemory} disabled={savingMemory || memorySaved}
            className={cn("flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
              memorySaved
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
            )}>
            {savingMemory ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookMarked className="w-3 h-3" />}
            {memorySaved ? "Salvo" : "Salvar"}
          </button>
        )}
        {!isUnlimited && (
          <span className="text-xs text-gray-600 font-mono">{credits}/{aiCreditsTotal}</span>
        )}
      </div>
    );
  }

  const placeholderText = isCombined
    ? `Pergunte para ${activeAgents.map(a => getPersonaName(a)).join(" e ")}...`
    : singleAgent
      ? `Pergunte para ${getPersonaName(singleAgent)}...`
      : "";

  return (
    <div className="flex h-full text-white overflow-hidden">

      {/* ── Painel esquerdo: lista de mentores ── */}
      <div className={`w-full md:w-72 border-r border-white/5 flex flex-col bg-[#0d1117] flex-shrink-0 ${mobileView === 'list' ? 'flex' : 'hidden'} md:flex`}>
        {/* Header sidebar */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-sm text-gray-300">Meus Mentores</h2>
            <button onClick={() => setShowSelector(true)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              <Plus className="w-3 h-3" />
              {isUnlimited ? "Todos" : `${activeIds.length}/${effectiveMax}`}
            </button>
          </div>
          {!isUnlimited && (
            <div className="h-1 rounded-full bg-white/10 mt-2">
              <div className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.min(100, (activeIds.length / effectiveMax) * 100)}%` }} />
            </div>
          )}
        </div>

        {/* Lista de mentores */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeAgents.length === 0 && (
            <div className="text-center py-8 px-4">
              <Sparkles className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Nenhum mentor selecionado</p>
              <button onClick={() => setShowSelector(true)} className="text-indigo-400 text-xs mt-1 hover:underline">
                Conhecer mentores →
              </button>
            </div>
          )}

          {/* Modo combinado */}
          {activeAgents.length >= 2 && (
            <button
              onClick={openCombined}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all mb-2",
                isCombined
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "border-indigo-500/20 bg-indigo-600/5 text-indigo-400 hover:bg-indigo-600/10 hover:border-indigo-500/30"
              )}
            >
              <div className="flex -space-x-1.5 flex-shrink-0">
                {activeAgents.slice(0, 3).map(a => (
                  <MentorAvatar key={a.id} agent={a} size={20} />
                ))}
              </div>
              <span className="flex-1 text-left text-xs">Modo combinado ({activeAgents.length})</span>
              <Users className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            </button>
          )}

          {/* Cards individuais */}
          {activeAgents.map(agent => {
            const name = getPersonaName(agent);
            const isActive = chatMode === `single:${agent.id}`;
            return (
              <div
                key={agent.id}
                role="button" tabIndex={0}
                onClick={() => openSingle(agent)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openSingle(agent); }}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-xl transition-all group cursor-pointer border",
                  isActive
                    ? "border-white/10 bg-white/[0.06]"
                    : "border-transparent hover:bg-white/[0.04] hover:border-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-shrink-0">
                    <MentorAvatar agent={agent} size={36} />
                    {isActive && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#0d1117]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate leading-tight" style={{ color: isActive ? agent.color : "white" }}>
                      {name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{agent.description}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); toggleAgent(agent); }}
                    disabled={saving}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quota */}
        <div className="px-3 pb-3">
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/5">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Mensagens esta semana</span>
              <span className="font-mono">{isUnlimited ? "∞" : `${credits}/${aiCreditsTotal}`}</span>
            </div>
            {!isUnlimited && (
              <div className="h-1 rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (credits / aiCreditsTotal) * 100)}%`,
                    background: credits < 5 ? "#ef4444" : credits < 15 ? "#f59e0b" : "#6366f1",
                  }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal seletor ── */}
      {showSelector && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSelector(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h3 className="font-bold text-lg">Escolher Mentores</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isUnlimited
                    ? "Agentes ilimitados no seu plano"
                    : `Selecione até ${effectiveMax} — combine área + banca para melhor resultado`}
                </p>
              </div>
              <button onClick={() => setShowSelector(false)} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 p-4 border-b border-white/5">
              <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none">
                <option value="">Todas as categorias</option>
                {categorias.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>

            {activeIds.length === 1 && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                Adicione mais 1 para habilitar o modo combinado — ideal: 2 especialistas diferentes
              </div>
            )}

            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-2">
              {filtered.map(agent => {
                const isActive = activeIds.includes(agent.id);
                const canAdd = isUnlimited || activeIds.length < effectiveMax;
                const name = getPersonaName(agent);
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent)}
                    disabled={!isActive && !canAdd}
                    className={cn(
                      "text-left p-3.5 rounded-xl border transition-all",
                      isActive
                        ? "border-white/20 bg-white/[0.06]"
                        : canAdd
                          ? "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
                          : "border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <MentorAvatar agent={agent} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm font-semibold truncate"
                            style={{ color: isActive ? agent.color : "white" }}>
                            {name}
                          </p>
                          {isActive && <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                          {!isActive && !canAdd && <Lock className="w-3 h-3 text-gray-600 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{agent.description}</p>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {agent.categoria && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 font-medium">área</span>
                          )}
                          {agent.banca && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-600/20 text-amber-400 font-medium">banca</span>
                          )}
                          {agent.isPremium && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-600/20 text-purple-400 font-medium">premium</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Área do chat ── */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex`}>
        {/* Botão voltar — só aparece no mobile quando está no chat */}
        <button
          onClick={() => setMobileView('list')}
          className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-white/5 text-sm text-gray-400 hover:text-white transition-colors bg-[#0d1117] flex-shrink-0"
        >
          <span>←</span>
          <span>Mentores</span>
        </button>

        {isIdle ? (
          <ChatPlaceholder />
        ) : (
          <>
            <ChatHeader />

            {/* ── Barra de atalhos rápidos (sticky, sempre visível) ── */}
            <div className="flex-shrink-0 px-4 py-2 border-b border-white/5 overflow-x-auto"
              style={{ background: "rgba(13,17,23,0.95)", scrollbarWidth: "none" }}>
              <div className="flex gap-1.5 min-w-max">
                <span className="text-[10px] text-gray-600 self-center mr-0.5 flex-shrink-0 font-medium uppercase tracking-wide">Ir para:</span>
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.key}
                    onClick={() => navigate(a.key)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white border border-white/6 hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.07] transition-all flex-shrink-0"
                  >
                    <span>{a.icon}</span>
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* Mensagem de boas-vindas */}
              {messages.length === 0 && singleAgent && (
                <div className="flex items-end gap-2.5">
                  <MentorAvatar agent={singleAgent} size={36} className="mb-1" />
                  <div className="max-w-lg w-full">
                    <p className="text-xs text-gray-500 mb-1 ml-1">{getPersonaName(singleAgent)}</p>
                    <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/[0.07] text-sm text-gray-200 leading-relaxed">
                      {getPersonaGreeting(singleAgent)}
                    </div>
                    {/* Sugestões de perguntas iniciais */}
                    <div className="mt-3 flex flex-wrap gap-2 ml-1">
                      {[
                        "Quais são os tópicos mais cobrados?",
                        "Me explique o conteúdo prioritário",
                        "Como devo organizar meus estudos?",
                        "Crie um plano de revisão para mim",
                      ].map(sugestao => (
                        <button
                          key={sugestao}
                          onClick={() => { setInput(sugestao); }}
                          className="text-xs px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                        >
                          {sugestao}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.length === 0 && isCombined && (
                <div className="flex items-end gap-2.5">
                  <div className="flex -space-x-2 mb-1">
                    {activeAgents.slice(0, 2).map(a => <MentorAvatar key={a.id} agent={a} size={28} />)}
                  </div>
                  <div className="max-w-lg">
                    <p className="text-xs text-gray-500 mb-1 ml-1">
                      {activeAgents.map(a => getPersonaName(a)).join(" + ")}
                    </p>
                    <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/[0.07] text-sm text-gray-200 leading-relaxed">
                      Olá! Estamos juntos para te ajudar com perspectivas complementares. O que quer estudar hoje?
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagens da conversa */}
              {messages.map((msg, i) => {
                const respAgent = msg.combined
                  ? null
                  : agents.find(a => a.id === (msg.agentId ?? singleAgent?.id));

                if (msg.role === "user") {
                  return (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-2xl px-4 py-3 rounded-2xl rounded-br-sm bg-indigo-600 text-white text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                // Mensagem do assistente
                const isLast = i === messages.length - 1;
                const isTyping = isLast && loading && !msg.content;

                return (
                  <div key={i} className="flex items-end gap-2.5">
                    {/* Avatar */}
                    <div className="flex-shrink-0 mb-1">
                      {msg.combined ? (
                        <div className="flex -space-x-2">
                          {activeAgents.slice(0, 2).map(a => <MentorAvatar key={a.id} agent={a} size={28} />)}
                        </div>
                      ) : (
                        respAgent
                          ? <MentorAvatar agent={respAgent} size={36} />
                          : <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-indigo-400" />
                            </div>
                      )}
                    </div>

                    {/* Balão */}
                    <div className="max-w-2xl flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1 ml-1">
                        {msg.combined
                          ? activeAgents.map(a => getPersonaName(a)).join(" + ")
                          : respAgent ? getPersonaName(respAgent) : "Mentor"}
                      </p>
                      <div className={cn(
                        "px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed",
                        "bg-white/[0.06] border border-white/[0.07] text-gray-200",
                      )}>
                        {isTyping ? (
                          <span className="flex items-center gap-1 text-gray-500">
                            <span className="flex gap-0.5">
                              {[0, 1, 2].map(j => (
                                <span key={j} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                                  style={{ animationDelay: `${j * 150}ms` }} />
                              ))}
                            </span>
                            digitando...
                          </span>
                        ) : (
                          msg.content
                            ? <span
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(
                                  // Remove [[IR:X]] markers before rendering markdown,
                                  // then append action cards below
                                  msg.content.replace(/\[\[IR:[a-z-]+\]\]/g, "")
                                )) }}
                              />
                            : <span className="text-gray-600">...</span>
                        )}
                        {/* Action cards rendered separately after markdown body */}
                        {msg.content && (() => {
                          const actionMatches = [...msg.content.matchAll(/\[\[IR:([a-z-]+)\]\]/g)];
                          if (!actionMatches.length) return null;
                          return (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {actionMatches.map((m, idx) => {
                                const key = m[1];
                                const action = ACTION_MAP[key];
                                if (!action) return null;
                                return (
                                  <button key={idx} onClick={() => navigate(key)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                                    style={{ background: `${action.color}18`, border: `1px solid ${action.color}44`, color: action.color }}>
                                    <span>{action.icon}</span>
                                    {action.label}
                                    <ExternalLink size={9} style={{ opacity: 0.7 }} />
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>

            {error && (
              <div className="mx-5 mb-2 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p>{error}</p>
                  {(error.toLowerCase().includes("limite") || error.toLowerCase().includes("crédito") || credits <= 0) && (
                    <a href="/planos" className="inline-block mt-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200 underline underline-offset-2">
                      ⚡ Ver planos e fazer upgrade →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Banner créditos esgotados */}
            {credits <= 0 && !error && (
              <div className="mx-5 mb-2 flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                <span className="text-xs">Limite semanal de mensagens atingido.</span>
                <a href="/planos" className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white transition-colors">
                  ⚡ Upgrade
                </a>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/5">
              <form onSubmit={sendMessage} className="flex gap-2.5">
                {/* Mini avatar do mentor ativo */}
                {singleAgent && !isCombined && (
                  <div className="flex-shrink-0 self-end mb-0.5">
                    <MentorAvatar agent={singleAgent} size={32} />
                  </div>
                )}
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={loading || credits <= 0}
                  placeholder={
                    credits <= 0
                      ? "Limite semanal atingido. Faça upgrade!"
                      : placeholderText
                  }
                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm disabled:opacity-50"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e as React.KeyboardEvent<HTMLInputElement> & React.FormEvent);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={loading || !input.trim() || credits <= 0}
                  size="icon"
                  className="w-11 h-11 rounded-xl flex-shrink-0 self-end"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
