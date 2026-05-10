"use client";
import { useState, useRef, useEffect } from "react";
import { Send, BookOpen, Target, Layers, ChevronRight, AlertCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent { id: string; name: string; description: string; color: string; }
interface Subject { id: string; name: string; slug: string; }
interface Message { role: "user" | "assistant"; content: string; agentName?: string; agentColor?: string; }
interface Profile { cargo: string | null; orgao: string | null; dataProva: string | null; onboardingDone: boolean; }

type Tab = "materiais" | "questoes" | "flashcards";

interface Props {
  agents: Agent[];
  subjects: Subject[];
  profile: Profile;
  userId: string;
  aiCreditsTotal: number;
}

export function WorkspaceMain({ agents, subjects, profile, userId, aiCreditsTotal }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(subjects[0] ?? null);
  const [activeTab, setActiveTab] = useState<Tab>("materiais");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(aiCreditsTotal);
  const [error, setError] = useState("");
  const [content, setContent] = useState<{ materiais: unknown[]; questoes: unknown[]; flashcards: unknown[] }>({ materiais: [], questoes: [], flashcards: [] });
  const [loadingContent, setLoadingContent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!selectedSubject) return;
    setLoadingContent(true);
    fetch(`/api/workspace/conteudo?subjectId=${selectedSubject.id}`)
      .then(r => r.json())
      .then(d => {
        setContent({ materiais: d.materiais ?? [], questoes: d.questoes ?? [], flashcards: d.flashcards ?? [] });
        setLoadingContent(false);
      });
  }, [selectedSubject]);

  // Saudação inicial
  useEffect(() => {
    if (agents.length === 0) return;
    const agentNames = agents.map(a => a.name).join(" e ");
    const cargo = profile.cargo ?? "seu concurso";
    setMessages([{
      role: "assistant",
      content: `Olá! Estamos aqui — ${agentNames}. 🎯\n\nSeu plano para **${cargo}** está pronto. Use o menu de matérias à esquerda para acessar materiais, questões e flashcards, ou me pergunte qualquer coisa sobre o conteúdo!`,
      agentName: agents[0].name,
      agentColor: agents[0].color,
    }]);
  }, []);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading || credits <= 0) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/workspace/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          agentIds: agents.map(a => a.id),
          subjectId: selectedSubject?.id,
          history: messages.slice(-10),
          profileContext: { cargo: profile.cargo, orgao: profile.orgao, dataProva: profile.dataProva },
        }),
      });

      if (res.status === 429) {
        const d = await res.json();
        setError(d.message);
        setLoading(false);
        return;
      }

      setCredits(c => Math.max(0, c - 1));
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";
      setMessages(prev => [...prev, { role: "assistant", content: "", agentName: agents[0].name, agentColor: agents[0].color }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: text };
          return updated;
        });
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: "materiais" as Tab, label: "Materiais", icon: BookOpen, count: content.materiais.length },
    { id: "questoes" as Tab, label: "Questões", icon: Target, count: content.questoes.length },
    { id: "flashcards" as Tab, label: "Flashcards", icon: Layers, count: content.flashcards.length },
  ];

  return (
    <div className="flex h-screen text-white overflow-hidden">
      {/* Sidebar: matérias */}
      <div className="w-56 bg-[#0d1117] border-r border-white/5 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-white/5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Matérias</p>
          {profile.cargo && (
            <p className="text-xs text-gray-600 truncate">{profile.cargo}</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSubject(s)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                selectedSubject?.id === s.id
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <ChevronRight className={cn("w-3 h-3 inline mr-1.5 transition-transform", selectedSubject?.id === s.id && "rotate-90 text-indigo-400")} />
              {s.name}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/5">
          <div className="flex -space-x-1.5 mb-2">
            {agents.map(a => (
              <div key={a.id} className="w-6 h-6 rounded-full border-2 border-[#0d1117] flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: a.color + "33", color: a.color }}>
                {a.name.charAt(0)}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600">{agents.map(a => a.name).join(" + ")}</p>
        </div>
      </div>

      {/* Conteúdo central */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
        {/* Header da matéria */}
        <div className="px-5 py-4 border-b border-white/5 bg-[#0d1117]">
          <h2 className="font-semibold">{selectedSubject?.name ?? "Selecione uma matéria"}</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-[#0d1117]">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === id
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className="text-xs bg-white/10 px-1.5 rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Conteúdo da tab */}
        <div className="flex-1 overflow-y-auto p-5">
          {!selectedSubject ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Selecione uma matéria na lista ao lado</p>
            </div>
          ) : loadingContent ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === "materiais" ? (
            <MateriaisTab items={content.materiais as Material[]} />
          ) : activeTab === "questoes" ? (
            <QuestoesTab items={content.questoes as Question[]} subjectName={selectedSubject.name} />
          ) : (
            <FlashcardsTab items={content.flashcards as Flashcard[]} />
          )}
        </div>
      </div>

      {/* Chat direito */}
      <div className="w-80 flex flex-col flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/5 bg-[#0d1117]">
          <div className="flex -space-x-1.5">
            {agents.map(a => (
              <div key={a.id} className="w-7 h-7 rounded-full border-2 border-[#0d1117] flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: a.color + "33", color: a.color }}>
                {a.name.charAt(0)}
              </div>
            ))}
          </div>
          <p className="text-sm font-medium flex-1 truncate">Chat com mentores</p>
          <span className="text-xs text-gray-600">{credits}/{aiCreditsTotal}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
              {msg.role === "assistant" && msg.agentName && (
                <p className="text-[10px] text-gray-600 mb-0.5 ml-1">{msg.agentName}</p>
              )}
              <div className={cn(
                "max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-white/5 border border-white/5 text-gray-300 rounded-bl-sm"
              )}>
                {msg.content || <span className="animate-pulse text-gray-500">...</span>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-3 mb-2 flex items-center gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t border-white/5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading || credits <= 0}
            placeholder={credits <= 0 ? "Limite atingido" : selectedSubject ? `Pergunte sobre ${selectedSubject.name}...` : "Pergunte qualquer coisa..."}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-xs disabled:opacity-50"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button type="submit" disabled={loading || !input.trim() || credits <= 0}
            className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center transition-colors flex-shrink-0">
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Sub-componentes de conteúdo
interface Material { id: string; title: string; type: string; description: string | null; fileUrl: string | null; }
interface Question { id: number; statement: string; answer: string; banca: string | null; year: number | null; }
interface Flashcard { id: string; front: string; back: string; }

function MateriaisTab({ items }: { items: Material[] }) {
  if (items.length === 0) return <EmptyState label="Nenhum material cadastrado para essa matéria ainda." />;
  return (
    <div className="space-y-2">
      {items.map(m => (
        <div key={m.id} className="rounded-xl border border-white/5 bg-white/3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm">{m.title}</p>
              {m.description && <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>}
            </div>
            <span className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400 flex-shrink-0">{m.type}</span>
          </div>
          {m.fileUrl && (
            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Acessar material →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function QuestoesTab({ items, subjectName }: { items: Question[]; subjectName: string }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  if (items.length === 0) return <EmptyState label={`Nenhuma questão cadastrada para ${subjectName} ainda.`} />;

  const q = items[current];
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-4">
        <span>Questão {current + 1}/{items.length}</span>
        {q.banca && <span className="text-indigo-400">{q.banca}{q.year ? ` · ${q.year}` : ""}</span>}
      </div>
      <p className="text-sm text-gray-200 leading-relaxed mb-4">{q.statement}</p>
      <div className="space-y-2">
        {(["A","B","C","D","E"] as const).filter(k => (q as unknown as Record<string,string>)[`option${k}`]).map(key => {
          const isSelected = selected === key;
          const isCorrect = key === q.answer;
          let style = "border-white/10 bg-white/3 hover:bg-white/5 text-gray-300";
          if (selected) {
            if (isCorrect) style = "border-green-500/50 bg-green-500/10 text-green-300";
            else if (isSelected) style = "border-red-500/50 bg-red-500/10 text-red-300";
            else style = "border-white/5 text-gray-600";
          }
          return (
            <button key={key} onClick={() => !selected && setSelected(key)}
              className={cn("w-full text-left flex items-center gap-2 p-3 rounded-lg border text-xs transition-all", style, !selected && "cursor-pointer")}>
              <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold flex-shrink-0">{key}</span>
              {(q as unknown as Record<string,string>)[`option${key}`]}
            </button>
          );
        })}
      </div>
      {selected && (
        <button onClick={() => { setCurrent(c => Math.min(c + 1, items.length - 1)); setSelected(null); }}
          className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors">
          Próxima →
        </button>
      )}
    </div>
  );
}

function FlashcardsTab({ items }: { items: Flashcard[] }) {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (items.length === 0) return <EmptyState label="Nenhum flashcard cadastrado para essa matéria ainda." />;

  const card = items[current];
  return (
    <div className="max-w-md mx-auto">
      <p className="text-xs text-gray-500 text-center mb-4">{current + 1}/{items.length}</p>
      <div
        onClick={() => setFlipped(f => !f)}
        className={cn(
          "min-h-48 rounded-2xl border p-6 flex items-center justify-center text-center cursor-pointer transition-all",
          flipped
            ? "border-indigo-500/40 bg-indigo-600/10 text-indigo-200"
            : "border-white/10 bg-white/3 text-gray-200"
        )}
      >
        <div>
          <p className="text-xs text-gray-500 mb-2">{flipped ? "Resposta" : "Pergunta"}</p>
          <p className="text-sm leading-relaxed">{flipped ? card.back : card.front}</p>
          {!flipped && <p className="text-xs text-gray-600 mt-3">Clique para ver a resposta</p>}
        </div>
      </div>
      {flipped && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false); }}
            className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white transition-colors">
            ← Anterior
          </button>
          <button onClick={() => { setCurrent(c => Math.min(c + 1, items.length - 1)); setFlipped(false); }}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs transition-colors">
            Próximo →
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <BookOpen className="w-10 h-10 text-gray-700 mb-3" />
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
  );
}
