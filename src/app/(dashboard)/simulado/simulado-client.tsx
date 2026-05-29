"use client";
import { useState, useEffect, useCallback } from "react";
import { Trophy, Clock, CheckCircle2, XCircle, RotateCcw, Play, ChevronRight, BookOpen, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  subjectId: string;
  banca: string | null;
  year: number | null;
  level: string;
  statement: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  answer: string;
  explanation: string | null;
}

interface HistoryItem {
  id: number;
  total: number;
  correct: number;
  timeSecs: number;
  createdAt: string;
}

interface Props {
  history: HistoryItem[];
  userId: string;
  modalidade?: string;
}

// ── Presets por modalidade ──────────────────────────────────────────────────
interface Preset {
  label: string;
  icon: string;
  totalQ: number;
  timeMins: number;
  passThreshold: number | null; // % mínimo para "aprovado" (null = sem threshold)
  minCorrect: number | null;    // nº absoluto mínimo (ex: OAB = 40/80)
  desc: string;
}

const MODALIDADE_PRESETS: Record<string, Preset[]> = {
  ENEM: [
    { label: "Caderno ENEM — 1 Área", icon: "📋", totalQ: 45, timeMins: 300, passThreshold: null, minCorrect: null, desc: "45 questões · 5h (estilo ENEM)" },
    { label: "Mini-ENEM", icon: "⚡", totalQ: 20, timeMins: 60, passThreshold: null, minCorrect: null, desc: "20 questões · 1h (treino rápido)" },
  ],
  OAB: [
    { label: "Simulado OAB — Oficial", icon: "⚖️", totalQ: 80, timeMins: 300, passThreshold: 50, minCorrect: 40, desc: "80 questões · 5h · mínimo 40 acertos (50%)" },
    { label: "Treino OAB — Rápido", icon: "⚡", totalQ: 20, timeMins: 60, passThreshold: 50, minCorrect: 10, desc: "20 questões · 1h · mínimo 50%" },
  ],
  CONCURSO_PUBLICO: [
    { label: "Simulado Padrão", icon: "🏛️", totalQ: 20, timeMins: 60, passThreshold: null, minCorrect: null, desc: "20 questões · 1h" },
    { label: "Simulado Longo", icon: "📋", totalQ: 30, timeMins: 90, passThreshold: null, minCorrect: null, desc: "30 questões · 1h30" },
  ],
};

type Phase = "menu" | "config" | "running" | "result" | "gabarito";

export function SimuladoClient({ history: initialHistory, userId, modalidade = "CONCURSO_PUBLICO" }: Props) {
  const [phase, setPhase] = useState<Phase>("menu");
  const [history, setHistory] = useState(initialHistory);

  // Config
  const [totalQ, setTotalQ] = useState(20);
  const [timeMins, setTimeMins] = useState(60);
  const [filterBanca, setFilterBanca] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [availableBancas, setAvailableBancas] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string; name: string }[]>([]);
  // Aprovação threshold (OAB)
  const [passThreshold, setPassThreshold] = useState<number | null>(null);
  const [minCorrect, setMinCorrect] = useState<number | null>(null);

  // Running
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ questionId: number; correct: boolean; selected: string | null }[]>([]);
  const [gabaritoExpanded, setGabaritoExpanded] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Result
  const [result, setResult] = useState<{ correct: number; total: number; timeSecs: number } | null>(null);

  const finish = useCallback(async (qs: Question[], ans: { questionId: number; correct: boolean; selected: string | null }[], timeUsed: number) => {
    const correct = ans.filter(a => a.correct).length;
    const total = qs.length;
    setResult({ correct, total, timeSecs: timeUsed });
    setPhase("result");

    // Garante que todas as questões têm resposta (pode não ter se o tempo esgotou)
    const fullAns = qs.map(q => {
      const found = ans.find(a => a.questionId === q.id);
      return found ?? { questionId: q.id, correct: false, selected: null };
    });

    await fetch("/api/simulado/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        total,
        correct,
        timeSecs: timeUsed,
        subjectIds: [...new Set(qs.map(q => q.subjectId))],
        answers: fullAns.map(a => ({ questionId: a.questionId, correct: a.correct })),
      }),
    });

    setAnswers(fullAns);

    // Atualiza histórico local
    setHistory(h => [{
      id: Date.now(),
      total,
      correct,
      timeSecs: timeUsed,
      createdAt: new Date().toISOString(),
    }, ...h]);
  }, []);

  useEffect(() => {
    if (phase !== "running" || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) {
          clearInterval(t);
          finish(questions, answers, timeMins * 60);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, questions, answers, timeMins, finish]);

  // Carrega bancas e matérias disponíveis ao montar
  useEffect(() => {
    fetch("/api/relatorio/banca")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const bancas = (d?.bancas ?? [])
          .map((b: { banca: string }) => b.banca)
          .filter((b: string) => b && b !== "Sem banca");
        setAvailableBancas(bancas);
      })
      .catch(() => {});
    fetch("/api/workspace/materias")
      .then(r => r.ok ? r.json() : null)
      .then(d => setAvailableSubjects(d?.subjects ?? []))
      .catch(() => {});
  }, []);

  async function startSimulado() {
    setLoading(true);
    setError("");
    const body: Record<string, unknown> = { total: totalQ };
    if (filterBanca)   body.banca      = filterBanca;
    if (filterLevel)   body.level      = filterLevel;
    if (filterSubject) body.subjectIds = [filterSubject];
    const res = await fetch("/api/simulado/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erro ao gerar simulado");
      return;
    }
    setQuestions(data.questions);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setTimeLeft(timeMins * 60);
    setPhase("running");
  }

  function handleSelect(key: string) {
    if (selected) return;
    setSelected(key);
    const q = questions[current];
    const isCorrect = key === q.answer;
    setAnswers(a => [...a, { questionId: q.id, correct: isCorrect, selected: key }]);
  }

  function nextQuestion() {
    const next = current + 1;
    if (next >= questions.length) {
      const timeUsed = timeMins * 60 - timeLeft;
      finish(questions, [...answers], timeUsed);
    } else {
      setCurrent(next);
      setSelected(null);
    }
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function fmtDuration(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m === 0) return `${sec}s`;
    return `${m}min ${sec}s`;
  }

  // ── TELA RESULTADO ──────────────────────────────────────────────
  if (phase === "result" && result) {
    const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;

    // Lógica de aprovação — OAB tem threshold mínimo
    const hasThreshold = passThreshold !== null || minCorrect !== null;
    const approvedByPct = passThreshold !== null ? pct >= passThreshold : true;
    const approvedByCount = minCorrect !== null ? result.correct >= minCorrect : true;
    const approved = !hasThreshold || (approvedByPct && approvedByCount);

    const color = hasThreshold
      ? (approved ? "text-green-400" : "text-red-400")
      : (pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400");

    return (
      <div className="min-h-screen bg-[#0d1117] text-white p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md text-center">
          {hasThreshold ? (
            approved
              ? <CheckCircle2 className="w-16 h-16 mx-auto mb-3 text-green-400" />
              : <XCircle className="w-16 h-16 mx-auto mb-3 text-red-400" />
          ) : (
            <CheckCircle2 className={cn("w-16 h-16 mx-auto mb-3", pct >= 60 ? "text-green-400" : "text-red-400")} />
          )}

          {hasThreshold && (
            <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-3",
              approved ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"
            )}>
              {approved ? "✅ APROVADO" : "❌ REPROVADO"}
            </div>
          )}

          <h2 className="text-2xl font-bold mb-2">Simulado concluído!</h2>
          <p className={cn("text-5xl font-bold mb-1", color)}>{pct}%</p>
          <p className="text-gray-400 text-sm mb-1">{result.correct}/{result.total} corretas</p>

          {hasThreshold && (
            <p className="text-xs mb-1">
              {passThreshold !== null && (
                <span className={approvedByPct ? "text-green-400" : "text-red-400"}>
                  Mínimo: {passThreshold}% {approvedByPct ? "✓" : "✗"}
                </span>
              )}
              {minCorrect !== null && (
                <span className={cn("ml-3", approvedByCount ? "text-green-400" : "text-red-400")}>
                  Mínimo: {minCorrect} acertos {approvedByCount ? "✓" : "✗"}
                </span>
              )}
            </p>
          )}

          <p className="text-gray-500 text-xs mb-8">Tempo: {fmtDuration(result.timeSecs)}</p>

          <div className="flex flex-col gap-3 items-center">
            <button onClick={() => { setGabaritoExpanded(null); setPhase("gabarito"); }}
              className="w-full max-w-xs px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 justify-center">
              <ClipboardList className="w-4 h-4" /> Ver gabarito completo
            </button>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setPhase("menu")}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
                Início
              </button>
              <button onClick={() => setPhase("config")}
                className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Novo simulado
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── GABARITO COMPLETO ────────────────────────────────────────────
  if (phase === "gabarito" && result) {
    const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
    return (
      <div className="min-h-screen bg-[#0d1117] text-white p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setPhase("result")}
            className="text-gray-500 hover:text-white transition-colors text-sm">← Voltar</button>
          <div className="flex-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" /> Gabarito Comentado
            </h2>
            <p className="text-xs text-gray-500">
              {result.correct}/{result.total} corretas · {pct}% de acerto · {fmtDuration(result.timeSecs)}
            </p>
          </div>
          <button onClick={() => setPhase("config")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs hover:bg-indigo-600/30">
            <RotateCcw className="w-3.5 h-3.5" /> Novo
          </button>
        </div>

        {/* Barra de acertos rápida */}
        <div className="flex flex-wrap gap-1 mb-6">
          {questions.map((q, i) => {
            const ans = answers.find(a => a.questionId === q.id);
            return (
              <button key={q.id}
                onClick={() => setGabaritoExpanded(gabaritoExpanded === i ? null : i)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all",
                  ans?.correct
                    ? "bg-green-500/20 text-green-400 border border-green-500/40"
                    : ans?.selected === null
                    ? "bg-white/5 text-gray-600 border border-white/10"
                    : "bg-red-500/20 text-red-400 border border-red-500/40"
                )}>
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Questões */}
        <div className="space-y-3">
          {questions.map((q, i) => {
            const ans = answers.find(a => a.questionId === q.id);
            const isExpanded = gabaritoExpanded === i;
            const options = (["A","B","C","D","E"] as const)
              .map(k => ({ key: k, text: (q as unknown as Record<string, string | null>)[`option${k}`] }))
              .filter(o => o.text);

            return (
              <div key={q.id}
                className={cn(
                  "rounded-xl border overflow-hidden",
                  ans?.correct ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                )}>
                {/* Cabeçalho da questão */}
                <button className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/3 transition-colors"
                  onClick={() => setGabaritoExpanded(isExpanded ? null : i)}>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5",
                    ans?.correct ? "bg-green-500/20 text-green-400" : ans?.selected ? "bg-red-500/20 text-red-400" : "bg-white/10 text-gray-500"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {ans?.correct
                        ? <span className="text-[11px] text-green-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Correta</span>
                        : ans?.selected
                        ? <span className="text-[11px] text-red-400 font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Errada</span>
                        : <span className="text-[11px] text-gray-500 font-semibold">Sem resposta</span>
                      }
                      {q.banca && <span className="text-[10px] text-gray-600">{q.banca}{q.year ? ` ${q.year}` : ""}</span>}
                    </div>
                    <p className="text-sm text-gray-200 line-clamp-2">{q.statement}</p>
                    {!isExpanded && (
                      <p className="text-xs text-gray-500 mt-1">
                        {ans?.selected
                          ? <>Sua resposta: <span className={cn("font-bold", ans.correct ? "text-green-400" : "text-red-400")}>{ans.selected}</span></>
                          : "—"
                        }
                        {" · "}Gabarito: <span className="text-green-400 font-bold">{q.answer}</span>
                      </p>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
                    : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />}
                </button>

                {/* Expandido: alternativas + explicação */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                    <p className="text-sm text-gray-200 leading-relaxed pt-3">{q.statement}</p>
                    <div className="space-y-1.5">
                      {options.map(({ key, text }) => {
                        const isCorrectOpt = key === q.answer;
                        const isSelectedOpt = ans?.selected === key;
                        let cls = "bg-white/3 border-white/5 text-gray-500";
                        if (isCorrectOpt) cls = "bg-green-500/15 border-green-500/40 text-green-200";
                        else if (isSelectedOpt && !isCorrectOpt) cls = "bg-red-500/15 border-red-500/40 text-red-300";
                        return (
                          <div key={key}
                            className={cn("flex items-start gap-2.5 p-2.5 rounded-lg border text-sm", cls)}>
                            <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 bg-white/10 mt-0.5">
                              {key}
                            </span>
                            <span className="leading-relaxed">{text}</span>
                            {isCorrectOpt && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400 ml-auto" />}
                            {isSelectedOpt && !isCorrectOpt && <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <p className="text-xs font-semibold text-gray-400 mb-1">Explicação</p>
                        <p className="text-xs text-gray-300 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── SIMULADO RODANDO ────────────────────────────────────────────
  if (phase === "running" && questions.length > 0) {
    const q = questions[current];
    const options = (["A","B","C","D","E"] as const)
      .map(k => ({ key: k, text: (q as unknown as Record<string, string | null>)[`option${k}`] }))
      .filter(o => o.text);

    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex flex-col">
        {/* Header */}
        <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-400">Questão {current + 1}/{questions.length}</span>
          <div className={cn("flex items-center gap-1.5 text-sm font-mono font-bold", timeLeft < 300 ? "text-red-400" : "text-gray-300")}>
            <Clock className="w-4 h-4" />
            {fmtTime(timeLeft)}
          </div>
          <span className="text-xs text-gray-500">{answers.filter(a => a.correct).length} corretas</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>

        {/* Question */}
        <div className="flex-1 px-6 py-6 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-4">
            {q.banca && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">{q.banca}</span>}
            {q.year && <span className="text-xs text-gray-600">{q.year}</span>}
            <span className={cn("text-xs px-2 py-0.5 rounded-full", {
              "bg-green-500/10 text-green-400": q.level === "facil",
              "bg-yellow-500/10 text-yellow-400": q.level === "medio",
              "bg-red-500/10 text-red-400": q.level === "dificil",
            })}>{q.level}</span>
          </div>

          <p className="text-sm text-gray-200 leading-relaxed mb-5">{q.statement}</p>

          <div className="space-y-2 mb-4">
            {options.map(({ key, text }) => {
              const isSelected = selected === key;
              const isCorrect = key === q.answer;
              let style = "border-white/10 bg-white/3 hover:bg-white/5 text-gray-300";
              if (selected) {
                if (isCorrect) style = "border-green-500/50 bg-green-500/10 text-green-300";
                else if (isSelected) style = "border-red-500/50 bg-red-500/10 text-red-300";
                else style = "border-white/5 text-gray-600";
              }
              return (
                <button key={key} onClick={() => handleSelect(key)} disabled={!!selected}
                  className={cn("w-full text-left flex items-center gap-2.5 p-3 rounded-lg border text-xs transition-all", style, !selected && "cursor-pointer")}>
                  <span className={cn("w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                    selected && isCorrect ? "bg-green-500 border-green-500 text-white" :
                    selected && isSelected ? "bg-red-500 border-red-500 text-white" : "border-current")}>
                    {key}
                  </span>
                  <span className="flex-1">{text}</span>
                  {selected && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                  {selected && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="space-y-3">
              {q.explanation && (
                <div className={cn(
                  "p-3 rounded-lg border text-xs leading-relaxed",
                  selected === q.answer
                    ? "bg-emerald-950/50 border-emerald-500/40"
                    : "bg-red-950/50 border-red-500/40"
                )}>
                  <p className="text-gray-200">{q.explanation}</p>
                </div>
              )}
              <button onClick={nextQuestion}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {current + 1 < questions.length ? (<>Próxima questão <ChevronRight className="w-4 h-4" /></>) : "Finalizar simulado"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CONFIGURAÇÃO ────────────────────────────────────────────────
  if (phase === "config") {
    const presets = MODALIDADE_PRESETS[modalidade] ?? MODALIDADE_PRESETS.CONCURSO_PUBLICO;

    function applyPreset(p: Preset) {
      setTotalQ(p.totalQ);
      setTimeMins(p.timeMins);
      setPassThreshold(p.passThreshold);
      setMinCorrect(p.minCorrect);
    }

    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-bold mb-6 text-center">Configurar Simulado</h2>

          {/* Presets de modalidade */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Presets rápidos</p>
            <div className="grid grid-cols-1 gap-2">
              {presets.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                    totalQ === p.totalQ && timeMins === p.timeMins
                      ? "border-indigo-500 bg-indigo-600/20"
                      : "border-white/10 bg-white/3 hover:bg-white/5"
                  )}>
                  <span className="text-xl">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{p.label}</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                  {p.passThreshold !== null && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                      Mín. {p.passThreshold}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Personalizar</p>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Número de questões</label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 80].map(n => (
                  <button key={n} onClick={() => setTotalQ(n)}
                    className={cn("py-2 rounded-lg border text-sm font-medium transition-colors", totalQ === n
                      ? "border-indigo-500 bg-indigo-600/20 text-indigo-400"
                      : "border-white/10 text-gray-400 hover:border-white/20")}>
                    {n}q
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Tempo limite</label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 300].map(m => (
                  <button key={m} onClick={() => setTimeMins(m)}
                    className={cn("py-2 rounded-lg border text-sm font-medium transition-colors", timeMins === m
                      ? "border-indigo-500 bg-indigo-600/20 text-indigo-400"
                      : "border-white/10 text-gray-400 hover:border-white/20")}>
                    {m >= 60 ? `${m / 60}h` : `${m}min`}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por matéria */}
            {availableSubjects.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Matéria (opcional)</label>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="">Todas as matérias</option>
                  {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Filtro por banca */}
            {availableBancas.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Banca (opcional)</label>
                <select value={filterBanca} onChange={e => setFilterBanca(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="">Todas as bancas</option>
                  {availableBancas.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}

            {/* Filtro por dificuldade */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Dificuldade (opcional)</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: "", label: "Todas" },
                  { v: "easy", label: "Fácil" },
                  { v: "medium", label: "Médio" },
                  { v: "hard", label: "Difícil" },
                ].map(({ v, label }) => (
                  <button key={v} onClick={() => setFilterLevel(v)}
                    className={cn("py-2 rounded-lg border text-xs font-medium transition-colors", filterLevel === v
                      ? "border-indigo-500 bg-indigo-600/20 text-indigo-400"
                      : "border-white/10 text-gray-400 hover:border-white/20")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setPhase("menu")}
              className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
              Voltar
            </button>
            <button onClick={startSimulado} disabled={loading}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando...</>
              ) : (
                <><Play className="w-4 h-4" /> Iniciar</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MENU PRINCIPAL ──────────────────────────────────────────────
  const menuPresets = MODALIDADE_PRESETS[modalidade] ?? MODALIDADE_PRESETS.CONCURSO_PUBLICO;

  function startFromPreset(p: Preset) {
    setTotalQ(p.totalQ);
    setTimeMins(p.timeMins);
    setPassThreshold(p.passThreshold);
    setMinCorrect(p.minCorrect);
    setFilterBanca("");
    setFilterLevel("");
    setFilterSubject("");
    setPhase("config");
  }

  return (
    <div className="p-6 text-white min-h-screen bg-[#0d1117]">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Simulado</h1>
            <p className="text-sm text-gray-400">Teste seus conhecimentos com tempo cronometrado</p>
          </div>
        </div>

        {/* Presets de acesso rápido por modalidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {menuPresets.map(p => (
            <button key={p.label} onClick={() => startFromPreset(p)}
              className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition-colors text-left flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">{p.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{p.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
              </div>
            </button>
          ))}
          {/* Personalizado */}
          <button onClick={() => setPhase("config")}
            className="p-4 rounded-2xl bg-white/3 border border-white/10 hover:bg-white/5 transition-colors text-left flex items-center gap-3 sm:col-span-2">
            <span className="text-2xl flex-shrink-0">⚙️</span>
            <div>
              <p className="font-semibold text-sm">Personalizado</p>
              <p className="text-xs text-gray-400 mt-0.5">Escolha número de questões, tempo e filtros</p>
            </div>
          </button>
        </div>

        {history.length > 0 ? (
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Histórico
            </h2>
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium text-xs">Data</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium text-xs">Resultado</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium text-xs">Aproveitamento</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium text-xs">Tempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.map(item => {
                    const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
                    return (
                      <tr key={item.id} className="hover:bg-white/3">
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.correct}/{item.total}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-semibold", pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400")}>
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {Math.floor(item.timeSecs / 60)}min
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-white/5 text-gray-500">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhum simulado feito ainda.</p>
            <p className="text-xs mt-1">Clique em "Novo Simulado" para começar!</p>
          </div>
        )}
      </div>
    </div>
  );
}
