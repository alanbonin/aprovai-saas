"use client";
import { useState, useEffect } from "react";
import { Brain, ChevronRight, CheckCircle2, XCircle, RotateCcw, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface QuestaoAdaptativa {
  id: number;
  subjectId: string;
  subjectName: string;
  level: string;
  statement: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  answer: string;
  explanation: string | null;
  banca: string | null;
  year: number | null;
  tipo: "vencida" | "nova" | "reforco";
  progresso: { interval: number; easeFactor: number } | null;
}

interface SessionStats {
  vencidas: number;
  novas: number;
  reforco: number;
}

interface Props {
  subjectId?: string;
  subjectName?: string;
  onClose?: () => void;
}

const MODO_CONFIG = {
  revisao_urgente: { label: "Revisão urgente",  color: "text-red-400",    icon: "🔴", desc: "Questões com revisão atrasada" },
  aprendizado:     { label: "Aprendizado",       color: "text-indigo-400", icon: "✨", desc: "Conteúdo novo para você" },
  reforco:         { label: "Reforço",           color: "text-amber-400",  icon: "💪", desc: "Praticando pontos difíceis" },
  sem_questoes:    { label: "Sem questões",      color: "text-gray-400",   icon: "🔍", desc: "Nenhuma questão disponível" },
};

const TIPO_BADGE: Record<string, string> = {
  vencida: "🔴 Revisão atrasada",
  nova:    "✨ Nova questão",
  reforco: "💪 Reforço",
};

const LEVEL_BADGE: Record<string, string> = {
  facil:   "🟢 Fácil",
  medio:   "🟡 Médio",
  dificil: "🔴 Difícil",
};

function OptionsButton({ letra, text, selected, correct, answered, onClick }: {
  letra: string; text: string; selected: boolean; correct: boolean; answered: boolean; onClick: () => void;
}) {
  let cls = "border-white/10 bg-white/3 text-gray-200 hover:border-indigo-500/40 hover:bg-indigo-500/5";
  if (answered && correct) cls = "border-green-500/40 bg-green-500/10 text-green-300";
  else if (answered && selected && !correct) cls = "border-red-500/40 bg-red-500/10 text-red-300";
  else if (answered) cls = "border-white/5 bg-white/2 text-gray-500";

  return (
    <button onClick={onClick} disabled={answered}
      className={cn("w-full flex items-start gap-3 p-3.5 rounded-xl border text-sm text-left transition-all", cls)}>
      <span className={cn("w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5",
        answered && correct ? "border-green-500/60 text-green-400" :
        answered && selected ? "border-red-500/60 text-red-400" : "border-white/20 text-gray-400"
      )}>{letra}</span>
      <span className="leading-relaxed">{text}</span>
      {answered && correct && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5 ml-auto" />}
      {answered && selected && !correct && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5 ml-auto" />}
    </button>
  );
}

export function QuestoesAdaptativas({ subjectId, subjectName, onClose }: Props) {
  const [step, setStep] = useState<"loading" | "sessao" | "resultado" | "vazio">("loading");
  const [questoes, setQuestoes] = useState<QuestaoAdaptativa[]>([]);
  const [stats, setStats] = useState<SessionStats>({ vencidas: 0, novas: 0, reforco: 0 });
  const [modo, setModo] = useState<string>("aprendizado");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ correct: boolean; id: number }[]>([]);
  const [saving, setSaving] = useState(false);

  // Carrega questões adaptativas
  useEffect(() => {
    const url = `/api/questoes/adaptativa?qtd=10${subjectId ? `&subjectId=${subjectId}` : ""}`;
    fetch(url).then(r => r.json()).then(d => {
      if (!d.questoes?.length || d.modo === "sem_questoes") {
        setStep("vazio");
      } else {
        setQuestoes(d.questoes);
        setStats(d.stats ?? { vencidas: 0, novas: 0, reforco: 0 });
        setModo(d.modo ?? "aprendizado");
        setStep("sessao");
      }
    }).catch(() => setStep("vazio"));
  }, [subjectId]);

  const q = questoes[current];

  async function answer(letra: string) {
    if (answered || !q) return;
    setSelected(letra);
    setAnswered(true);
    const isCorrect = letra === q.answer;
    setResults(prev => [...prev, { correct: isCorrect, id: q.id }]);

    // Salva progresso SM-2 via endpoint de questões
    setSaving(true);
    await fetch("/api/questoes/progresso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: q.id,
        correct: isCorrect,
        quality: isCorrect ? "lembrei" : "nao-lembrei",
      }),
    }).catch(() => {});
    setSaving(false);
  }

  function next() {
    if (current + 1 >= questoes.length) {
      setStep("resultado");
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  if (step === "loading") return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      <p className="text-sm text-gray-400">Selecionando suas questões prioritárias...</p>
    </div>
  );

  if (step === "vazio") return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
      <Brain className="w-10 h-10 text-gray-700" />
      <p className="text-gray-400 font-medium">Nenhuma questão disponível</p>
      <p className="text-sm text-gray-600">
        {subjectName ? `Não há questões em ${subjectName} ainda.` : "Adicione matérias ao seu plano primeiro."}
      </p>
      {onClose && (
        <button onClick={onClose} className="mt-2 text-sm text-indigo-400 hover:text-indigo-300">Voltar</button>
      )}
    </div>
  );

  if (step === "resultado") {
    const correct = results.filter(r => r.correct).length;
    const total = results.length;
    const pct = Math.round((correct / total) * 100);
    const color = pct >= 70 ? "text-green-400" : pct >= 50 ? "text-amber-400" : "text-red-400";

    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center">
        <div className="text-5xl mb-4">{pct >= 70 ? "🎉" : pct >= 50 ? "💪" : "📚"}</div>
        <h2 className="text-xl font-bold text-white mb-1">Sessão concluída!</h2>
        <p className={cn("text-4xl font-black my-4", color)}>{pct}%</p>
        <p className="text-sm text-gray-400 mb-6">
          {correct} de {total} questões corretas
        </p>
        <div className="flex gap-3 flex-wrap justify-center text-xs text-gray-500 mb-8">
          <span className="px-2 py-1 rounded-full bg-red-500/10 border border-red-500/15">🔴 {stats.vencidas} revisões</span>
          <span className="px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/15">✨ {stats.novas} novas</span>
          <span className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/15">💪 {stats.reforco} reforço</span>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => {
            setStep("loading");
            setCurrent(0); setSelected(null); setAnswered(false); setResults([]);
            // Re-fetch
            const url = `/api/questoes/adaptativa?qtd=10${subjectId ? `&subjectId=${subjectId}` : ""}`;
            fetch(url).then(r => r.json()).then(d => {
              setQuestoes(d.questoes ?? []);
              setStats(d.stats ?? { vencidas: 0, novas: 0, reforco: 0 });
              setModo(d.modo ?? "aprendizado");
              setStep(d.questoes?.length ? "sessao" : "vazio");
            });
          }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
            <RotateCcw className="w-4 h-4" /> Nova sessão
          </button>
          {onClose && (
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Sessão em andamento
  const options = (["A","B","C","D","E"] as const)
    .map(k => ({ key: k, text: (q as unknown as Record<string, string | null>)[`option${k}`] }))
    .filter(o => o.text);

  const modoCfg = MODO_CONFIG[modo as keyof typeof MODO_CONFIG] ?? MODO_CONFIG.aprendizado;
  const isCorrect = selected === q.answer;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header da sessão */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-400" />
          <span className={cn("text-xs font-semibold", modoCfg.color)}>{modoCfg.icon} {modoCfg.label}</span>
          <span className="text-xs text-gray-600">{modoCfg.desc}</span>
        </div>
        <span className="text-xs text-gray-500 tabular-nums">{current + 1}/{questoes.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/8 mb-5 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${((current + (answered ? 1 : 0)) / questoes.length) * 100}%` }} />
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-gray-500">
          {TIPO_BADGE[q.tipo] ?? q.tipo}
        </span>
        {q.level && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-gray-500">
            {LEVEL_BADGE[q.level] ?? q.level}
          </span>
        )}
        <span className="text-xs text-gray-600">{q.subjectName}</span>
        {q.banca && <span className="text-xs text-gray-600">· {q.banca}</span>}
        {q.year && <span className="text-xs text-gray-600">· {q.year}</span>}
      </div>

      {/* Enunciado */}
      <div className="mb-5">
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{q.statement}</p>
      </div>

      {/* Opções */}
      <div className="space-y-2.5 mb-5">
        {options.map(({ key, text }) => (
          <OptionsButton
            key={key} letra={key} text={text!}
            selected={selected === key}
            correct={q.answer === key}
            answered={answered}
            onClick={() => answer(key)}
          />
        ))}
      </div>

      {/* Resultado + Explicação */}
      {answered && (
        <div className={cn(
          "rounded-xl border p-4 mb-5",
          isCorrect ? "bg-emerald-950/50 border-emerald-500/40" : "bg-red-950/50 border-red-500/40"
        )}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect
              ? <><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-sm font-semibold text-green-400">Correto!</span></>
              : <><XCircle className="w-4 h-4 text-red-400" /><span className="text-sm font-semibold text-red-400">Incorreto — resposta: {q.answer}</span></>
            }
            {saving && <Loader2 className="w-3 h-3 text-gray-600 animate-spin ml-auto" />}
          </div>
          {q.explanation && (
            <p className="text-gray-200 text-xs leading-relaxed mt-2 border-t border-white/8 pt-2">
              {q.explanation}
            </p>
          )}
        </div>
      )}

      {/* Botão avançar */}
      {answered && (
        <button onClick={next}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors">
          {current + 1 >= questoes.length ? "Ver resultado" : "Próxima questão"}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Score em tempo real */}
      {results.length > 0 && (
        <div className="flex items-center gap-3 mt-4 text-xs text-gray-600">
          <span>{results.filter(r => r.correct).length} ✓</span>
          <span>{results.filter(r => !r.correct).length} ✗</span>
          <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full bg-green-500 transition-all"
              style={{ width: `${(results.filter(r => r.correct).length / results.length) * 100}%` }} />
          </div>
          <span>{Math.round((results.filter(r => r.correct).length / results.length) * 100)}%</span>
        </div>
      )}
    </div>
  );
}
