"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Brain, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent { id: string; name: string; color: string; }
interface Message { role: "user" | "assistant"; content: string; }
interface Subject { id: string; name: string; slug: string; }
interface Profile {
  id: string; cargo: string | null; orgao: string | null;
  dataProva: string | null; dificuldades: string | null; onboardingDone: boolean;
}

interface Props {
  agents: Agent[];
  userId: string;
  aiCreditsTotal: number;
  onComplete: (profile: Profile, subjects: Subject[]) => void;
}

export function OnboardingChat({ agents, userId, aiCreditsTotal, onComplete }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEditalInput, setShowEditalInput] = useState(false);
  const [editalText, setEditalText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mensagem inicial dos agentes
    const agentNames = agents.map(a => a.name).join(" e ");
    setMessages([{
      role: "assistant",
      content: `Olá! Sou ${agentNames} — seus mentores especializados aqui na Aprovai. 🎯

Estou aqui para montar um **plano de estudos personalizado** para você. Vou te fazer algumas perguntas rápidas:

1. **Qual cargo e órgão** você quer prestar? (ex: Delegado da Polícia Civil de SP, Auditor da Receita Federal)
2. **Já tem data marcada** para a prova?
3. **Quais suas maiores dificuldades** hoje?
4. **Já saiu o edital?** Se sim, pode colar o conteúdo programático aqui que eu extraio tudo pra você.

Pode me contar tudo de uma vez ou ir respondendo por partes!`
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: [...messages, userMsg].slice(-12),
          agentIds: agents.map(a => a.id),
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Verificar se é JSON de conclusão
        if (chunk.includes("__ONBOARDING_DONE__")) {
          const jsonPart = chunk.split("__ONBOARDING_DONE__")[1];
          try {
            const { profile, subjects } = JSON.parse(jsonPart);
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: full };
              return updated;
            });
            setTimeout(() => onComplete(profile, subjects), 1500);
          } catch { /* ignora parse error */ }
          break;
        }

        full += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: full };
          return updated;
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erro de conexão. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }

  async function submitEdital() {
    if (!editalText.trim()) return;
    setShowEditalInput(false);
    setInput("");
    const msg = `Aqui está o conteúdo programático do edital:\n\n${editalText}`;
    setEditalText("");
    setInput(msg);
    setTimeout(() => send(), 100);
  }

  const mainAgent = agents[0];

  return (
    <div className="flex h-screen text-white">
      {/* Sidebar com agentes */}
      <div className="w-64 bg-[#0d1117] border-r border-white/5 flex flex-col">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-semibold text-sm text-gray-300 mb-1">Seus mentores</h2>
          <p className="text-xs text-gray-600">Configuração inicial do plano</p>
        </div>
        <div className="p-3 space-y-2">
          {agents.map(agent => (
            <div key={agent.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: agent.color + "33", color: agent.color }}>
                {agent.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{agent.name}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-lg bg-indigo-600/10 border border-indigo-500/20 p-3 text-xs text-indigo-300">
            <p className="font-medium mb-1">Configuração inicial</p>
            <p className="text-indigo-400/70">Após essa conversa, seu plano de estudos será montado automaticamente.</p>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-[#0d1117]">
          <div className="flex -space-x-2">
            {agents.slice(0, 3).map(agent => (
              <div key={agent.id} className="w-8 h-8 rounded-full border-2 border-[#0d1117] flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: agent.color + "33", color: agent.color }}>
                {agent.name.charAt(0)}
              </div>
            ))}
          </div>
          <div>
            <p className="font-semibold text-sm">Configuração do plano de estudos</p>
            <p className="text-xs text-gray-500">Responda às perguntas para personalizar sua experiência</p>
          </div>
          <button
            onClick={() => setShowEditalInput(!showEditalInput)}
            className={cn(
              "ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
              showEditalInput
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "border-white/10 text-gray-400 hover:text-white"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Colar edital
          </button>
        </div>

        {/* Área do edital */}
        {showEditalInput && (
          <div className="mx-6 mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
            <p className="text-sm font-medium text-indigo-300 mb-2">Cole o conteúdo programático do edital</p>
            <textarea
              value={editalText}
              onChange={e => setEditalText(e.target.value)}
              rows={8}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Cole aqui o conteúdo programático (pode ser o texto completo do edital)..."
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowEditalInput(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={submitEdital} disabled={!editalText.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                <ChevronRight className="w-3.5 h-3.5" />
                Enviar edital
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mr-2 mt-0.5"
                  style={{ backgroundColor: (mainAgent?.color ?? "#6366f1") + "33", color: mainAgent?.color ?? "#6366f1" }}>
                  {mainAgent?.name.charAt(0) ?? "A"}
                </div>
              )}
              <div className={cn(
                "max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-white/5 border border-white/5 text-gray-200 rounded-bl-sm"
              )}>
                {msg.content
                  ? msg.content.split("\n").map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
                  ))
                  : <span className="animate-pulse text-gray-500">Pensando...</span>
                }
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex gap-3 p-4 border-t border-white/5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            placeholder="Responda aqui..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
