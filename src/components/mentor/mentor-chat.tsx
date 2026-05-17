"use client";
import { useState, useRef, useEffect } from "react";
import { Brain, Send, AlertCircle, Lock, Plus, X, Check, Users, BookMarked, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Agent {
  id: string; name: string; description: string;
  area: string | null; categoria: string | null; banca: string | null;
  color: string; isPremium: boolean; avatar: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  agentId?: string;   // quem respondeu (modo individual)
  combined?: boolean; // foi no modo combinado
}

interface Props {
  agents: Agent[];
  categorias: { id: string; label: string }[];
  bancas: { id: string; label: string }[];
  aiCreditsLeft: number;
  aiCreditsTotal: number;
  userId: string;
  maxAgents: number;
  activeAgentIds: string[];
}

// Modo de chat: "idle" | "single:<agentId>" | "combined"
type ChatMode = "idle" | `single:${string}` | "combined";

export function MentorChat({
  agents, categorias, bancas, aiCreditsLeft, aiCreditsTotal, maxAgents,
  activeAgentIds: initialActiveIds,
}: Props) {
  const [activeIds, setActiveIds] = useState<string[]>(initialActiveIds);
  const [chatMode, setChatMode] = useState<ChatMode>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(aiCreditsLeft);
  const [error, setError] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterBanca, setFilterBanca] = useState("");
  const [showSelector, setShowSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [memorySaved, setMemorySaved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Permite sempre pelo menos 2 (para combinar área + banca)
  const effectiveMax = Math.max(maxAgents, 2);
  const isUnlimited = maxAgents >= 999;
  const activeAgents = agents.filter(a => activeIds.includes(a.id));
  const filtered = agents.filter(a =>
    (!filterArea || a.area === filterArea || a.categoria === filterArea) &&
    (!filterBanca || a.banca === filterBanca)
  );

  // Agente ativo no modo individual
  const singleAgent = chatMode.startsWith("single:")
    ? agents.find(a => a.id === chatMode.slice(7)) ?? null
    : null;
  const isCombined = chatMode === "combined";
  const isIdle = chatMode === "idle";

  function openSingle(agent: Agent) {
    if (chatMode !== `single:${agent.id}`) {
      setChatMode(`single:${agent.id}`);
      setMessages([]);
      setError("");
      setMemorySaved(false);
    }
  }

  function openCombined() {
    if (chatMode !== "combined") {
      setChatMode("combined");
      setMessages([]);
      setError("");
      setMemorySaved(false);
    }
  }

  async function saveMemory() {
    if (messages.length < 4 || savingMemory) return;
    const agentId = singleAgent?.id ?? (isCombined ? activeIds[0] : null);
    const agentName = singleAgent?.name ?? (isCombined ? activeAgents.map(a => a.name).join(" + ") : "Mentor");
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

  // Auto-salva memória após 10+ mensagens
  useEffect(() => {
    if (messages.length === 10 && !memorySaved && !savingMemory) {
      saveMemory();
    }
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
    // Se remover o agente ativo no chat individual, volta para idle
    if (isActive && chatMode === `single:${agent.id}`) {
      setChatMode("idle");
      setMessages([]);
    }
    // Se sair do modo combinado por ter só 1 agente
    if (chatMode === "combined" && newIds.length < 2) {
      setChatMode("idle");
      setMessages([]);
    }
    setSaving(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || credits <= 0) return;
    if (isIdle) return;

    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      let res: Response;

      if (isCombined) {
        // Usa /api/workspace/chat com todos os agentes ativos
        res = await fetch("/api/workspace/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            agentIds: activeIds,
            history: messages.slice(-10),
          }),
        });
      } else {
        // Usa /api/mentor com agente individual
        res = await fetch("/api/mentor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            agentId: singleAgent!.id,
            history: messages.slice(-10),
          }),
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
        role: "assistant",
        content: "",
        combined: isCombined,
        agentId: singleAgent?.id,
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

  /* ── Chat placeholder ── */
  function ChatPlaceholder() {
    if (activeAgents.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Brain className="w-16 h-16 text-indigo-500/30 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">Adicione um mentor para começar</p>
            <p className="text-gray-600 text-sm mt-1">Clique em "+" para escolher seu especialista</p>
            <button onClick={() => setShowSelector(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
              Escolher mentor
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs">
          <Brain className="w-12 h-12 text-indigo-500/30 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-1">Selecione um mentor</p>
          <p className="text-gray-600 text-sm">
            Clique em um mentor à esquerda para conversar individualmente
            {activeAgents.length >= 2 && <span> ou clique em <strong className="text-indigo-400">Conversar com os 2</strong> para uma resposta combinada</span>}
          </p>
        </div>
      </div>
    );
  }

  /* ── Header do chat ativo ── */
  function ChatHeader() {
    if (isCombined) {
      return (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-[#0d1117]">
          <div className="flex -space-x-2">
            {activeAgents.map(a => (
              <div key={a.id} className="w-9 h-9 rounded-full border-2 border-[#0d1117] flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: a.color + "33", color: a.color }}>
                {a.name.charAt(0)}
              </div>
            ))}
          </div>
          <div>
            <p className="font-semibold text-sm">
              {activeAgents.map(a => a.name).join(" + ")}
            </p>
            <p className="text-xs text-indigo-400">● Modo combinado — respondendo juntos</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {messages.length >= 4 && (
              <button onClick={saveMemory} disabled={savingMemory || memorySaved}
                className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors",
                  memorySaved
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                )} title="Salvar esta conversa na memória do mentor">
                {savingMemory ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookMarked className="w-3 h-3" />}
                {memorySaved ? "Salvo" : "Salvar"}
              </button>
            )}
            <span className="text-xs text-gray-600 font-mono">{credits}/{aiCreditsTotal} msgs</span>
          </div>
        </div>
      );
    }
    if (singleAgent) {
      return (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-[#0d1117]">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
            style={{ backgroundColor: singleAgent.color + "33", color: singleAgent.color }}>
            {singleAgent.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold">{singleAgent.name}</p>
            <p className="text-xs text-gray-500">{singleAgent.description}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {messages.length >= 4 && (
              <button onClick={saveMemory} disabled={savingMemory || memorySaved}
                className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors",
                  memorySaved
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                )} title="Salvar esta conversa na memória do mentor">
                {savingMemory ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookMarked className="w-3 h-3" />}
                {memorySaved ? "Salvo" : "Salvar"}
              </button>
            )}
            <span className="text-xs text-gray-600 font-mono">{credits}/{aiCreditsTotal} msgs</span>
          </div>
        </div>
      );
    }
    return null;
  }

  const chatPlaceholderText = isCombined
    ? `Pergunte para ${activeAgents.map(a => a.name).join(" e ")}...`
    : singleAgent
      ? `Pergunte para ${singleAgent.name}...`
      : "";

  return (
    <div className="flex h-full text-white overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-72 border-r border-white/5 flex flex-col bg-[#0d1117] flex-shrink-0">
        {/* Header */}
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

        {/* Lista de mentores ativos */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeAgents.length === 0 && (
            <div className="text-center py-8 px-4">
              <Brain className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Nenhum mentor selecionado</p>
              <button onClick={() => setShowSelector(true)} className="text-indigo-400 text-xs mt-1 hover:underline">
                Escolher mentor →
              </button>
            </div>
          )}

          {/* Botão "Conversar com os 2" — aparece quando há 2+ mentores */}
          {activeAgents.length >= 2 && (
            <button
              onClick={openCombined}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all mb-1",
                isCombined
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "border-indigo-500/20 bg-indigo-600/5 text-indigo-400 hover:bg-indigo-600/10 hover:border-indigo-500/30"
              )}
            >
              <div className="flex -space-x-1.5 flex-shrink-0">
                {activeAgents.slice(0, 3).map(a => (
                  <div key={a.id} className="w-5 h-5 rounded-full border border-[#0d1117] flex items-center justify-center text-[9px] font-bold"
                    style={{ backgroundColor: a.color + "44", color: a.color }}>
                    {a.name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="flex-1 text-left text-xs">Conversar com os {activeAgents.length}</span>
              <Users className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            </button>
          )}

          {/* Cards de cada mentor */}
          {activeAgents.map(agent => (
            <div
              key={agent.id}
              role="button"
              tabIndex={0}
              onClick={() => openSingle(agent)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openSingle(agent); }}
              className={cn(
                "w-full text-left px-3 py-3 rounded-lg transition-colors group cursor-pointer",
                chatMode === `single:${agent.id}`
                  ? "bg-indigo-600/20 border border-indigo-500/30"
                  : "hover:bg-white/5 border border-transparent"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: agent.color + "33", color: agent.color }}>
                  {agent.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-gray-500 truncate">{agent.description}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); toggleAgent(agent); }}
                  disabled={saving}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1"
                  title="Remover mentor"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quota de mensagens */}
        <div className="px-4 py-3 mx-3 mb-3 rounded-lg bg-white/5 border border-white/5">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Mensagens esta semana</span>
            <span>{isUnlimited ? "∞" : `${credits}/${aiCreditsTotal}`}</span>
          </div>
          {!isUnlimited && (
            <div className="h-1.5 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.min(100, (credits / aiCreditsTotal) * 100)}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Modal seletor ── */}
      {showSelector && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowSelector(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div>
                <h3 className="font-semibold">Escolher Mentores</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isUnlimited
                    ? "Agentes ilimitados no seu plano"
                    : `Selecione até ${effectiveMax} mentores — combine área + banca para melhor resultado`}
                </p>
              </div>
              <button onClick={() => setShowSelector(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 p-4 border-b border-white/5">
              <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none">
                <option value="">Todas as categorias</option>
                {categorias.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <select value={filterBanca} onChange={e => setFilterBanca(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none">
                <option value="">Todas as bancas</option>
                {bancas.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>

            {/* Dica de combinação */}
            {activeIds.length === 1 && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                Adicione mais 1 mentor para habilitar o chat combinado — ideal: 1 de área + 1 de banca
              </div>
            )}

            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-2">
              {filtered.map(agent => {
                const isActive = activeIds.includes(agent.id);
                const canAdd = isUnlimited || activeIds.length < effectiveMax;
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent)}
                    disabled={!isActive && !canAdd}
                    className={cn(
                      "text-left p-3 rounded-xl border transition-all",
                      isActive
                        ? "border-indigo-500/50 bg-indigo-600/10"
                        : canAdd
                          ? "border-white/5 bg-white/3 hover:bg-white/5"
                          : "border-white/5 bg-white/3 opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: agent.color + "33", color: agent.color }}>
                        {agent.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium truncate">{agent.name}</p>
                          {isActive && <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />}
                          {!isActive && !canAdd && <Lock className="w-3 h-3 text-gray-600 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{agent.description}</p>
                        {/* Badge área ou banca */}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {agent.categoria && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-400">área</span>
                          )}
                          {agent.banca && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-400">banca</span>
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

      {/* ── Área de chat ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isIdle ? (
          <ChatPlaceholder />
        ) : (
          <>
            <ChatHeader />

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  {isCombined ? (
                    <div>
                      <div className="flex justify-center -space-x-3 mb-3">
                        {activeAgents.map(a => (
                          <div key={a.id} className="w-10 h-10 rounded-full border-2 border-[#080c18] flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: a.color + "33", color: a.color }}>
                            {a.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                      <p className="text-gray-400 font-medium mb-1">
                        {activeAgents.map(a => a.name).join(" + ")} prontos para responder
                      </p>
                      <p className="text-gray-600 text-sm">
                        Faça sua pergunta e os {activeAgents.length} mentores responderão juntos com perspectivas complementares
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Olá! Como posso te ajudar? Sou o <strong>{singleAgent?.name}</strong>
                    </p>
                  )}
                </div>
              )}

              {messages.map((msg, i) => {
                const respAgent = msg.combined
                  ? null
                  : agents.find(a => a.id === (msg.agentId ?? singleAgent?.id));
                return (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 mr-2 mt-0.5">
                        {msg.combined ? (
                          <div className="flex -space-x-1.5">
                            {activeAgents.slice(0, 2).map(a => (
                              <div key={a.id} className="w-6 h-6 rounded-full border border-[#080c18] flex items-center justify-center text-[9px] font-bold"
                                style={{ backgroundColor: a.color + "44", color: a.color }}>
                                {a.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: (respAgent?.color ?? "#6366f1") + "33",
                              color: respAgent?.color ?? "#6366f1",
                            }}>
                            {respAgent?.name.charAt(0) ?? "A"}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={cn(
                      "max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white/5 border border-white/5 text-gray-200 rounded-bl-sm"
                    )}>
                      {msg.content || <span className="animate-pulse text-gray-500">Pensando...</span>}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {error && (
              <div className="mx-6 mb-2 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={sendMessage} className="flex gap-3 p-4 border-t border-white/5">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading || credits <= 0}
                placeholder={
                  credits <= 0
                    ? "Limite semanal atingido. Faça upgrade!"
                    : chatPlaceholderText
                }
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as React.KeyboardEvent<HTMLInputElement> & React.FormEvent); } }}
              />
              <Button
                type="submit"
                disabled={loading || !input.trim() || credits <= 0}
                size="icon"
                className="w-12 h-12 rounded-xl flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
