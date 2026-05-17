"use client";
import { useState, useRef, useEffect } from "react";
import { Send, FileText, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent  { id: string; name: string; color: string; description?: string; categoria?: string | null; banca?: string | null; systemPrompt?: string; }
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

type Caminho = "sei-concurso" | "stand-by" | "duvida" | "catalogo" | null;

// ── Concursos populares para o catálogo ──────────────────────────────────────
const CONCURSOS_POPULARES = [
  { emoji: "🔵", cargo: "Agente Federal de Polícia", orgao: "Polícia Federal", banca: "CESPE/CEBRASPE" },
  { emoji: "🟢", cargo: "Auditor-Fiscal da Receita Federal", orgao: "Receita Federal do Brasil", banca: "CESPE/CEBRASPE" },
  { emoji: "🟡", cargo: "Analista Judiciário", orgao: "STF / STJ / TRT", banca: "FCC / CESPE" },
  { emoji: "🔴", cargo: "Técnico do INSS", orgao: "INSS", banca: "CESPE/CEBRASPE" },
  { emoji: "🟠", cargo: "Analista de Controle Externo", orgao: "TCU", banca: "CESPE/CEBRASPE" },
  { emoji: "🟣", cargo: "Delegado de Polícia Civil", orgao: "Polícia Civil (Estadual)", banca: "VUNESP / CESPE" },
  { emoji: "⚫", cargo: "Procurador Federal", orgao: "AGU", banca: "CESPE/CEBRASPE" },
  { emoji: "🩵", cargo: "Técnico Judiciário", orgao: "TRF / TRE", banca: "FCC / AOCP" },
  { emoji: "🟤", cargo: "Analista Administrativo", orgao: "Ministérios Federais", banca: "FGV / CESPE" },
  { emoji: "🌿", cargo: "Policial Rodoviário Federal", orgao: "PRF", banca: "CESPE/CEBRASPE" },
];

// ── Renderiza markdown simples ────────────────────────────────────────────────
function renderContent(content: string) {
  return content.split("\n").map((line, i, arr) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

// ── Escolha do caminho ────────────────────────────────────────────────────────
function CaminhoSelector({ onSelect }: { onSelect: (c: Caminho) => void }) {
  const opcoes: { id: Caminho; emoji: string; titulo: string; desc: string; cor: string }[] = [
    {
      id: "sei-concurso",
      emoji: "🎯",
      titulo: "Já sei qual concurso vou prestar",
      desc: "Tenho cargo, órgão e banca definidos. Quero montar meu plano agora.",
      cor: "border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10",
    },
    {
      id: "stand-by",
      emoji: "⏳",
      titulo: "Sei o órgão, mas o edital não saiu",
      desc: "Quero me preparar com antecedência para um concurso que vai abrir.",
      cor: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10",
    },
    {
      id: "duvida",
      emoji: "🔍",
      titulo: "Estou em dúvida sobre qual concurso prestar",
      desc: "Não sei bem por onde começar. Quero uma orientação personalizada.",
      cor: "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10",
    },
    {
      id: "catalogo",
      emoji: "📋",
      titulo: "Quero explorar os concursos disponíveis",
      desc: "Deixa eu ver os concursos mais populares e escolher um para começar.",
      cor: "border-green-500/30 bg-green-500/5 hover:bg-green-500/10",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto flex flex-col justify-center px-5 py-8 max-w-xl mx-auto w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center mx-auto mb-4 text-3xl">🎯</div>
        <h1 className="text-xl font-bold text-white mb-2">Bem-vindo à Aprovai!</h1>
        <p className="text-gray-400 text-sm">Vamos montar seu plano de estudos personalizado.<br/>Como você está agora?</p>
      </div>

      <div className="space-y-3">
        {opcoes.map(op => (
          <button
            key={op.id}
            onClick={() => onSelect(op.id)}
            className={cn(
              "w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all group",
              op.cor
            )}
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">{op.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white mb-0.5">{op.titulo}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{op.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-1 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Catálogo de concursos populares ──────────────────────────────────────────
function CatalogoView({ onEscolher, onVoltar }: { onEscolher: (cargo: string, orgao: string, banca: string) => void; onVoltar: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 max-w-xl mx-auto w-full">
      <button onClick={onVoltar} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </button>
      <h2 className="font-bold text-lg text-white mb-1">📋 Concursos populares</h2>
      <p className="text-gray-500 text-sm mb-5">Escolha um para começar a se preparar agora:</p>
      <div className="space-y-2">
        {CONCURSOS_POPULARES.map((c, i) => (
          <button
            key={i}
            onClick={() => onEscolher(c.cargo, c.orgao, c.banca)}
            className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl border border-white/8 bg-white/3
              hover:bg-white/6 hover:border-white/15 transition-all group"
          >
            <span className="text-xl flex-shrink-0">{c.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{c.cargo}</p>
              <p className="text-xs text-gray-500">{c.orgao} · {c.banca}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Modo Stand-by (órgão sem edital) ────────────────────────────────────────
function StandByView({ onSubmit, onVoltar, loading }: { onSubmit: (cargo: string, orgao: string) => void; onVoltar: () => void; loading: boolean }) {
  const [cargo, setCargo] = useState("");
  const [orgao, setOrgao] = useState("");

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 max-w-xl mx-auto w-full">
      <button onClick={onVoltar} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </button>
      <div className="text-center mb-7">
        <div className="text-4xl mb-3">⏳</div>
        <h2 className="font-bold text-lg text-white mb-2">Modo Stand-by</h2>
        <p className="text-gray-400 text-sm">Prepare-se com antecedência. Vamos montar um plano base para você já ir estudando enquanto o edital não sai.</p>
      </div>
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Qual cargo você quer prestar?</label>
          <input
            value={cargo}
            onChange={e => setCargo(e.target.value)}
            placeholder="Ex: Analista Judiciário, Auditor Fiscal, Delegado..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Em qual órgão / instituição?</label>
          <input
            value={orgao}
            onChange={e => setOrgao(e.target.value)}
            placeholder="Ex: TRF 1ª Região, Receita Federal, TJSP..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6 text-xs text-amber-300/80">
        <strong className="text-amber-400">Como funciona:</strong> vamos usar o histórico de editais anteriores do órgão para definir as matérias base do plano. Quando o edital oficial sair, você ajusta.
      </div>
      <button
        onClick={() => onSubmit(cargo, orgao)}
        disabled={!cargo.trim() || !orgao.trim() || loading}
        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Configurando...</>
        ) : (
          <>Montar plano Stand-by →</>
        )}
      </button>
    </div>
  );
}

// ── Modo Dúvida (quiz vocacional) ────────────────────────────────────────────
const QUIZ_PERGUNTAS = [
  {
    id: "area",
    pergunta: "Com qual área do direito / conhecimento você mais se identifica?",
    opcoes: [
      { valor: "segurança", texto: "🔒 Segurança pública e investigação" },
      { valor: "fiscal", texto: "💰 Finanças, tributos e auditoria" },
      { valor: "judiciario", texto: "⚖️ Judiciário e direito processual" },
      { valor: "saude", texto: "🏥 Saúde pública e regulação" },
      { valor: "gestao", texto: "📊 Gestão, administração e planejamento" },
      { valor: "bancario", texto: "🏦 Sistema financeiro e bancário" },
    ],
  },
  {
    id: "nivel",
    pergunta: "Qual nível de escolaridade / cargo te interessa mais?",
    opcoes: [
      { valor: "superior", texto: "🎓 Nível Superior (analista, auditor, procurador)" },
      { valor: "medio", texto: "📋 Nível Médio (técnico, agente, escrivão)" },
      { valor: "qualquer", texto: "🤷 Tanto faz, quero o melhor custo-benefício" },
    ],
  },
  {
    id: "salario",
    pergunta: "Qual faixa salarial te interessa?",
    opcoes: [
      { valor: "alto", texto: "💎 Acima de R$ 10.000 (mais competitivo)" },
      { valor: "medio", texto: "💵 R$ 4.000 – R$ 10.000 (bom equilíbrio)" },
      { valor: "rapido", texto: "⚡ Quero passar logo — qualquer concurso" },
    ],
  },
];

const SUGESTOES_QUIZ: Record<string, { cargo: string; orgao: string; banca: string }[]> = {
  "segurança-superior-alto": [
    { cargo: "Delegado de Polícia Federal", orgao: "Polícia Federal", banca: "CESPE/CEBRASPE" },
    { cargo: "Delegado de Polícia Civil", orgao: "Polícia Civil Estadual", banca: "VUNESP / CESPE" },
  ],
  "segurança-superior-medio": [
    { cargo: "Agente Federal de Polícia", orgao: "Polícia Federal", banca: "CESPE/CEBRASPE" },
    { cargo: "Policial Rodoviário Federal", orgao: "PRF", banca: "CESPE/CEBRASPE" },
  ],
  "fiscal-superior-alto": [
    { cargo: "Auditor-Fiscal da Receita Federal", orgao: "Receita Federal do Brasil", banca: "CESPE/CEBRASPE" },
    { cargo: "Analista de Controle Externo", orgao: "TCU", banca: "CESPE/CEBRASPE" },
  ],
  "judiciario-superior-alto": [
    { cargo: "Analista Judiciário", orgao: "STJ / TRF", banca: "FCC / CESPE" },
    { cargo: "Procurador Federal", orgao: "AGU", banca: "CESPE/CEBRASPE" },
  ],
  "gestao-superior-medio": [
    { cargo: "Analista Administrativo", orgao: "Ministérios Federais", banca: "FGV / CESPE" },
    { cargo: "Técnico do INSS", orgao: "INSS", banca: "CESPE/CEBRASPE" },
  ],
  "bancario-superior-alto": [
    { cargo: "Analista do Banco Central", orgao: "Banco Central do Brasil", banca: "CESPE/CEBRASPE" },
  ],
  "saude-superior-medio": [
    { cargo: "Analista em Saúde", orgao: "ANVISA / MS", banca: "FCC / CESPE" },
  ],
};

function getSugestoes(respostas: Record<string, string>) {
  const chave = `${respostas.area ?? ""}-${respostas.nivel ?? ""}-${respostas.salario ?? ""}`;
  return SUGESTOES_QUIZ[chave] ?? [
    { cargo: "Técnico Judiciário", orgao: "TRF / TRE", banca: "FCC" },
    { cargo: "Analista Administrativo", orgao: "Órgão Federal", banca: "CESPE/CEBRASPE" },
  ];
}

function DuvidaView({ onEscolher, onVoltar }: { onEscolher: (cargo: string, orgao: string, banca: string) => void; onVoltar: () => void }) {
  const [etapa, setEtapa] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  if (etapa >= QUIZ_PERGUNTAS.length) {
    const sugestoes = getSugestoes(respostas);
    return (
      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-xl mx-auto w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">✨</div>
          <h2 className="font-bold text-lg text-white mb-1">Concursos ideais para você</h2>
          <p className="text-gray-400 text-sm">Com base nas suas preferências, estes são os mais indicados:</p>
        </div>
        <div className="space-y-3 mb-6">
          {sugestoes.map((s, i) => (
            <button key={i} onClick={() => onEscolher(s.cargo, s.orgao, s.banca)}
              className="w-full text-left p-4 rounded-xl border border-indigo-500/25 bg-indigo-500/5
                hover:bg-indigo-500/10 transition-all group flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white">{s.cargo}</p>
                <p className="text-xs text-gray-500">{s.orgao} · {s.banca}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
        <button onClick={onVoltar} className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Refazer o quiz
        </button>
      </div>
    );
  }

  const pergunta = QUIZ_PERGUNTAS[etapa];
  const progresso = ((etapa) / QUIZ_PERGUNTAS.length) * 100;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 max-w-xl mx-auto w-full">
      {etapa === 0 && (
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>
      )}
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-600 mb-1.5">
          <span>Pergunta {etapa + 1} de {QUIZ_PERGUNTAS.length}</span>
          <span>{Math.round(progresso)}%</span>
        </div>
        <div className="h-1 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${progresso}%` }} />
        </div>
      </div>
      <div className="text-center mb-6">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="font-bold text-base text-white">{pergunta.pergunta}</h2>
      </div>
      <div className="space-y-2">
        {pergunta.opcoes.map(op => (
          <button key={op.valor} onClick={() => {
            setRespostas(prev => ({ ...prev, [pergunta.id]: op.valor }));
            setEtapa(e => e + 1);
          }}
            className="w-full text-left px-4 py-3.5 rounded-xl border border-white/8 bg-white/3
              hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all text-sm text-gray-300 hover:text-white">
            {op.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Chat principal (caminho "Já sei" e variantes) ────────────────────────────
type ChatStep = "cargo" | "banca" | "data" | "dificuldades";
const STEPS_LABELS: Record<ChatStep, string> = {
  cargo: "Cargo & Órgão", banca: "Banca", data: "Data da Prova", dificuldades: "Dificuldades",
};
const STEPS_ORDER: ChatStep[] = ["cargo", "banca", "data", "dificuldades"];

interface ChatOnboardingProps {
  agents: Agent[];
  userId: string;
  aiCreditsTotal: number;
  onComplete: (profile: Profile, subjects: Subject[]) => void;
  onVoltar: () => void;
  initialMsg?: string; // Preenche automaticamente o 1º cargo/órgão
}

function ChatOnboarding({ agents, userId, aiCreditsTotal, onComplete, onVoltar, initialMsg }: ChatOnboardingProps) {
  void agents; void userId; void aiCreditsTotal;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [showEditalInput, setShowEditalInput] = useState(false);
  const [editalText, setEditalText] = useState("");
  const [completing, setCompleting] = useState(false);
  const [selectedMentors, setSelectedMentors] = useState<Agent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initSent = useRef(false);

  // Mensagem inicial da IA
  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: `Olá! Sou a **Estrategista Aprovai** 🎯

Vou montar um plano de estudos 100% personalizado para o seu concurso!

Para começar: **qual cargo e órgão você quer prestar?**
*(ex: Delegado da Polícia Civil de SP, Auditor da Receita Federal, Analista do TRF)*`,
    }]);
  }, []);

  // Se veio com initialMsg (do catálogo/stand-by/quiz), dispara automaticamente
  useEffect(() => {
    if (initialMsg && messages.length === 1 && !initSent.current) {
      initSent.current = true;
      setTimeout(() => send(initialMsg), 400);
    }
  }, [messages, initialMsg]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function detectStep(msgs: Message[]) {
    const userCount = msgs.filter(m => m.role === "user").length;
    setStepIdx(Math.min(userCount, STEPS_ORDER.length - 1));
  }

  async function send(customMsg?: string) {
    const text = (customMsg ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const historyBeforeSend = messages.slice(-12);
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    detectStep(newMessages);

    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyBeforeSend }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${data.error ?? "Erro ao processar. Tente novamente."}` }]);
        return;
      }

      const responseText: string = data.text ?? "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const words = responseText.split(" ");
      let built = "";
      for (let i = 0; i < words.length; i++) {
        built += (i === 0 ? "" : " ") + words[i];
        const current = built;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: current };
          return updated;
        });
        await new Promise(r => setTimeout(r, 18));
      }

      if (data.done) {
        const { profile, subjects = [], agents: newAgents = [] } = data;
        if (newAgents.length > 0) setSelectedMentors(newAgents as Agent[]);
        setCompleting(true);
        setTimeout(() => {
          onComplete(profile ?? {}, subjects);
          window.location.replace("/workspace?welcome=1");
        }, 2500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de conexão.";
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${msg} Tente novamente.` }]);
    } finally {
      setLoading(false);
    }
  }

  async function submitEdital() {
    if (!editalText.trim()) return;
    setShowEditalInput(false);
    const msg = `Aqui está o conteúdo programático do edital:\n\n${editalText}`;
    setEditalText("");
    await send(msg);
  }

  const currentStep = STEPS_ORDER[stepIdx];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080c18", color: "#e8eaf0" }}>

      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0d14", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onVoltar}
          style={{ padding: "6px 10px", borderRadius: 8, background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          ← Voltar
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎯</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Estrategista Aprovai</div>
          <div style={{ fontSize: 11, color: "#7c84a0" }}>Configuração do plano de estudos</div>
        </div>
        <button onClick={() => setShowEditalInput(!showEditalInput)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer",
            background: showEditalInput ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${showEditalInput ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}`,
            color: showEditalInput ? "#a5b4fc" : "#7c84a0",
          }}>
          <FileText size={12} /> Colar edital
        </button>
      </div>

      {/* Steps */}
      <div style={{ padding: "10px 16px", background: "#0a0d14", display: "flex", gap: 5, alignItems: "center", overflowX: "auto" }}>
        {STEPS_ORDER.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, flex: i < STEPS_ORDER.length - 1 ? 1 : undefined }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 9px", borderRadius: 99, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
              background: i < stepIdx ? "rgba(99,102,241,0.2)" : i === stepIdx ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${i <= stepIdx ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}`,
              color: i < stepIdx ? "#a5b4fc" : i === stepIdx ? "#c7d2fe" : "#4b5280",
            }}>
              {i < stepIdx ? "✓" : i + 1} {STEPS_LABELS[s]}
            </div>
            {i < STEPS_ORDER.length - 1 && (
              <div style={{ flex: 1, height: 1, minWidth: 8, background: i < stepIdx ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Edital input */}
      {showEditalInput && (
        <div style={{ margin: "10px 14px 0", borderRadius: 12, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.06)", padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 7 }}>📄 Cole o conteúdo programático do edital</div>
          <textarea value={editalText} onChange={e => setEditalText(e.target.value)} rows={6}
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 11px", fontSize: 12, color: "#e8eaf0", outline: "none", resize: "none", boxSizing: "border-box" }}
            placeholder="Cole aqui o conteúdo programático..." />
          <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
            <button onClick={() => setShowEditalInput(false)} style={{ padding: "5px 10px", fontSize: 11, background: "none", border: "none", color: "#7c84a0", cursor: "pointer" }}>Cancelar</button>
            <button onClick={submitEdital} disabled={!editalText.trim()} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
              background: "#6366f1", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer", opacity: editalText.trim() ? 1 : 0.5,
            }}>
              <ChevronRight size={12} /> Enviar edital
            </button>
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            {msg.role === "assistant" && (
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2 }}>🎯</div>
            )}
            <div style={{
              maxWidth: "75%", padding: "9px 13px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? "linear-gradient(135deg, #6366f1, #7c3aed)" : "rgba(255,255,255,0.05)",
              border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.07)",
              fontSize: 13, lineHeight: 1.55, color: "#e8eaf0",
            }}>
              {msg.content ? renderContent(msg.content) : <span style={{ color: "#4b5280", animation: "pulse 1.4s ease-in-out infinite" }}>Analisando…</span>}
            </div>
          </div>
        ))}

        {completing && (
          <div style={{ textAlign: "center", padding: "20px 14px" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🚀</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>Montando seu plano personalizado…</div>
            {selectedMentors.length > 0 && (
              <div style={{ fontSize: 12, color: "#7c84a0", marginBottom: 14 }}>
                Seus mentores: {selectedMentors.map(m => m.name).join(" + ")}
              </div>
            )}
            <div style={{
              display: "inline-flex", gap: 5, alignItems: "center",
              background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 99, padding: "7px 14px", fontSize: 12, color: "#a5b4fc"
            }}>
              <div style={{ width: 13, height: 13, border: "2px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Configurando workspace…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!completing && (
        <div style={{ padding: "10px 14px 18px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Quick replies baseadas no step */}
          {currentStep === "data" && !loading && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {["Não tenho data", "Dentro de 3 meses", "Dentro de 6 meses", "Em mais de 1 ano"].map(r => (
                <button key={r} onClick={() => send(r)}
                  style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: "#a5b4fc", cursor: "pointer" }}>
                  {r}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Responda aqui…"
              style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13, padding: "12px 15px", color: "#e8eaf0", fontSize: 13, outline: "none", opacity: loading ? 0.6 : 1 }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button disabled={loading || !input.trim()} onClick={() => send()}
              style={{
                width: 44, height: 44, borderRadius: 13, border: "none", cursor: "pointer",
                background: loading || !input.trim() ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {loading
                ? <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                : <Send size={16} color="#fff" />
              }
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontSize: 10, color: "#4b5280" }}>
            Pressione Enter para enviar
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function OnboardingChat({ agents, userId, aiCreditsTotal, onComplete }: Props) {
  const [caminho, setCaminho] = useState<Caminho>(null);
  const [initialMsg, setInitialMsg] = useState<string | undefined>(undefined);

  function handleCaminhoSelect(c: Caminho) {
    if (c === "catalogo" || c === "duvida") {
      setCaminho(c);
    } else if (c === "stand-by") {
      setCaminho(c);
    } else {
      setCaminho("sei-concurso");
    }
  }

  function handleEscolherConcurso(cargo: string, orgao: string, banca: string) {
    const msg = `Quero prestar para ${cargo} no ${orgao}. A banca é ${banca}.`;
    setInitialMsg(msg);
    setCaminho("sei-concurso");
  }

  function handleStandBySubmit(cargo: string, orgao: string) {
    const msg = `Quero me preparar para ${cargo} no ${orgao}. O edital ainda não saiu, estou me preparando antecipadamente. Use o histórico de editais anteriores para definir as matérias.`;
    setInitialMsg(msg);
    setCaminho("sei-concurso");
  }

  // Seletor de caminho
  if (!caminho) {
    return (
      <div style={{ height: "100vh", background: "#080c18", display: "flex", flexDirection: "column" }}>
        <CaminhoSelector onSelect={handleCaminhoSelect} />
      </div>
    );
  }

  // Catálogo
  if (caminho === "catalogo") {
    return (
      <div style={{ height: "100vh", background: "#080c18", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0d14" }}>
          <p className="text-sm font-bold text-white">Aprovai</p>
        </div>
        <CatalogoView onEscolher={handleEscolherConcurso} onVoltar={() => setCaminho(null)} />
      </div>
    );
  }

  // Stand-by
  if (caminho === "stand-by" && !initialMsg) {
    return (
      <div style={{ height: "100vh", background: "#080c18", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0d14" }}>
          <p className="text-sm font-bold text-white">Aprovai</p>
        </div>
        <StandByView onSubmit={handleStandBySubmit} onVoltar={() => setCaminho(null)} loading={false} />
      </div>
    );
  }

  // Dúvida / quiz
  if (caminho === "duvida") {
    return (
      <div style={{ height: "100vh", background: "#080c18", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0d14" }}>
          <p className="text-sm font-bold text-white">Aprovai</p>
        </div>
        <DuvidaView onEscolher={handleEscolherConcurso} onVoltar={() => setCaminho(null)} />
      </div>
    );
  }

  // Chat (sei-concurso, ou após escolha em catálogo/stand-by/dúvida)
  return (
    <ChatOnboarding
      agents={agents}
      userId={userId}
      aiCreditsTotal={aiCreditsTotal}
      onComplete={onComplete}
      onVoltar={() => { setCaminho(null); setInitialMsg(undefined); }}
      initialMsg={initialMsg}
    />
  );
}
