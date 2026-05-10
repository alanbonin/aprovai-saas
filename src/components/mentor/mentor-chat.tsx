"use client";
import { useState, useRef, useEffect } from "react";
import { Brain, Send, AlertCircle, Lock, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Agent {
  id: string; name: string; description: string;
  categoria: string | null; banca: string | null;
  color: string; isPremium: boolean; avatar: string | null;
}
interface Message { role: "user" | "assistant"; content: string; }

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

export function MentorChat({ agents, categorias, bancas, aiCreditsLeft, aiCreditsTotal, maxAgents, activeAgentIds: initialActiveIds }: Props) {
  const [activeIds, setActiveIds] = useState<string[]>(initialActiveIds);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(aiCreditsLeft);
  const [error, setError] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterBanca, setFilterBanca] = useState("");
  const [showSelector, setShowSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const isUnlimited = maxAgents >= 999;
  const activeAgents = agents.filter(a => activeIds.includes(a.id));
  const filtered = agents.filter(a =>
    (!filterArea || a.categoria === filterArea) &&
    (!filterBanca || a.banca === filterBanca)
  );

  async function toggleAgent(agent: Agent) {
    const isActive = activeIds.includes(agent.id);
    if (!isActive && !isUnlimited && activeIds.length >= maxAgents) return;

    setSaving(true);
    const newIds = isActive ? activeIds.filter(id => id !== agent.id) : [...activeIds, agent.id];

    await fetch("/api/mentor/agentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent.id, action: isActive ? "remove" : "add" }),
    });

    setActiveIds(newIds);
    if (isActive && selectedAgent?.id === agent.id) setSelectedAgent(null);
    setSaving(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedAgent || loading || credits <= 0) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, agentId: selectedAgent.id, history: messages.slice(-10) }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(data.message);
        setLoading(false);
        return;
      }

      setCredits(c => Math.max(0, c - 1));
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
    } catch {
      setError("Erro ao conectar com o mentor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen text-white">
      {/* Sidebar agentes ativos */}
      <div className="w-72 border-r border-white/5 flex flex-col bg-[#0d1117]">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-sm text-gray-300">Meus Mentores</h2>
            <button
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {isUnlimited ? "Todos" : `${activeIds.length}/${maxAgents}`}
            </button>
          </div>
          {!isUnlimited && (
            <div className="h-1 rounded-full bg-white/10 mt-2">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.min(100, (activeIds.length / maxAgents) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Lista de agentes ativos */}
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
          {activeAgents.map(agent => (
            <button
              key={agent.id}
              onClick={() => { setSelectedAgent(agent); setMessages([]); setError(""); }}
              className={cn(
                "w-full text-left px-3 py-3 rounded-lg transition-colors group",
                selectedAgent?.id === agent.id
                  ? "bg-indigo-600/20 border border-indigo-500/30"
                  : "hover:bg-white/5"
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
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </button>
          ))}
        </div>

        {/* Cota */}
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

      {/* Modal seletor de agentes */}
      {showSelector && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowSelector(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div>
                <h3 className="font-semibold">Escolher Mentores</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isUnlimited ? "Seu plano permite agentes ilimitados" : `Seu plano permite até ${maxAgents} mentor${maxAgents > 1 ? "es" : ""}`}
                </p>
              </div>
              <button onClick={() => setShowSelector(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

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

            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-2">
              {filtered.map(agent => {
                const isActive = activeIds.includes(agent.id);
                const canAdd = isUnlimited || activeIds.length < maxAgents;
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
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {!selectedAgent ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Brain className="w-16 h-16 text-indigo-500/30 mx-auto mb-4" />
              <p className="text-gray-400 text-lg font-medium">
                {activeAgents.length === 0 ? "Adicione um mentor para começar" : "Selecione um mentor"}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {activeAgents.length === 0
                  ? "Clique em \"+\" para escolher seu especialista"
                  : "Clique em um mentor na lista à esquerda"}
              </p>
              {activeAgents.length === 0 && (
                <button onClick={() => setShowSelector(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                  Escolher mentor
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-[#0d1117]">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
                style={{ backgroundColor: selectedAgent.color + "33", color: selectedAgent.color }}>
                {selectedAgent.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{selectedAgent.name}</p>
                <p className="text-xs text-gray-500">{selectedAgent.description}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">Olá! Como posso te ajudar com <strong>{selectedAgent.name}</strong>?</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white/5 border border-white/5 text-gray-200 rounded-bl-sm"
                  )}>
                    {msg.content || <span className="animate-pulse text-gray-500">Pensando...</span>}
                  </div>
                </div>
              ))}
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
                placeholder={credits <= 0 ? "Limite atingido. Faça upgrade!" : `Pergunte para ${selectedAgent.name}...`}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }}
              />
              <Button type="submit" disabled={loading || !input.trim() || credits <= 0} size="icon" className="w-12 h-12 rounded-xl">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
