"use client";
import { useState, useRef, useEffect } from "react";
import { Brain, Send, ChevronDown, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Agent {
  id: string; name: string; description: string;
  area: string | null; banca: string | null;
  color: string; isPremium: boolean; avatar: string | null;
}
interface Message { role: "user" | "assistant"; content: string; }

interface Props {
  agents: Agent[];
  areas: { id: string; label: string }[];
  bancas: { id: string; label: string }[];
  aiCreditsLeft: number;
  aiCreditsTotal: number;
  userId: string;
}

export function MentorChat({ agents, areas, bancas, aiCreditsLeft, aiCreditsTotal }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(aiCreditsLeft);
  const [error, setError] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterBanca, setFilterBanca] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const filtered = agents.filter(a =>
    (!filterArea  || a.area  === filterArea) &&
    (!filterBanca || a.banca === filterBanca)
  );

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
        body: JSON.stringify({
          message: input,
          agentId: selectedAgent.id,
          history: messages.slice(-10),
        }),
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

  function selectAgent(agent: Agent) {
    setSelectedAgent(agent);
    setMessages([]);
    setError("");
  }

  return (
    <div className="flex h-screen text-white">
      {/* Sidebar de agentes */}
      <div className="w-72 border-r border-white/5 flex flex-col bg-[#0d1117]">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-sm text-gray-300 mb-3">Mentores IA</h2>
          <div className="space-y-2">
            <select
              value={filterArea}
              onChange={e => setFilterArea(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none"
            >
              <option value="">Todas as áreas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <select
              value={filterBanca}
              onChange={e => setFilterBanca(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none"
            >
              <option value="">Todas as bancas</option>
              {bancas.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">Nenhum mentor encontrado</p>
          )}
          {filtered.map(agent => (
            <button
              key={agent.id}
              onClick={() => selectAgent(agent)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-lg transition-colors",
                selectedAgent?.id === agent.id
                  ? "bg-indigo-600/20 border border-indigo-500/30"
                  : "hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: agent.color + "33", color: agent.color }}
                >
                  {agent.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    {agent.isPremium && <Lock className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{agent.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Cota */}
        <div className="p-4 border-t border-white/5">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Créditos esta semana</span>
            <span>{credits}/{aiCreditsTotal}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.min(100, (credits / aiCreditsTotal) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {!selectedAgent ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Brain className="w-16 h-16 text-indigo-500/30 mx-auto mb-4" />
              <p className="text-gray-400 text-lg font-medium">Escolha um mentor para começar</p>
              <p className="text-gray-600 text-sm mt-1">Selecione um especialista no painel à esquerda</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-[#0d1117]">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
                style={{ backgroundColor: selectedAgent.color + "33", color: selectedAgent.color }}
              >
                {selectedAgent.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{selectedAgent.name}</p>
                <p className="text-xs text-gray-500">{selectedAgent.description}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">Olá! Pode me fazer uma pergunta sobre {selectedAgent.name}.</p>
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

            {/* Input */}
            <form onSubmit={sendMessage} className="flex gap-3 p-4 border-t border-white/5">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading || credits <= 0}
                placeholder={credits <= 0 ? "Limite semanal atingido. Faça upgrade!" : "Digite sua dúvida..."}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); }}}
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
