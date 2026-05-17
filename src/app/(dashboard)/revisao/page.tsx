"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, ChevronRight, RotateCcw, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
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
  subjectId: string | null;
}

interface Subject { id: string; name: string; }

const QUALITY_OPTS = [
  { id: "errei",   label: "Errei de novo",  color: "border-red-500/60 bg-red-500/10 text-red-400 hover:bg-red-500/20" },
  { id: "dificil", label: "Difícil",         color: "border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" },
  { id: "ok",      label: "Entendi",         color: "border-blue-500/60 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" },
  { id: "facil",   label: "Dominei!",        color: "border-green-500/60 bg-green-500/10 text-green-400 hover:bg-green-500/20" },
];

export default function RevisaoPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [total, setTotal]         = useState(0);
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<string | null>(null);
  const [quality, setQuality]     = useState<string | null>(null);
  const [showExp, setShowExp]     = useState(false);
  const [filterSubject, setFilterSubject] = useState("");
  const [loading, setLoading]     = useState(true);
  const [done, setDone]           = useState(false);
  const [score, setScore]         = useState({ correct: 0, total: 0, xp: 0 });
  const [xpFlash, setXpFlash]     = useState(false);

  useEffect(() => {
    fetch("/api/workspace/materias")
      .then(r => r.json())
      .then(d => setSubjects(d.subjects ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(async (subjectId?: string) => {
    setLoading(true);
    setDone(false);
    const params = new URLSearchParams({ limit: "20" });
    if (subjectId) params.set("subjectId", subjectId);
    const res = await fetch(`/api/questoes/revisao?${params}`);
    const d = await res.json();
    setQuestions(d.questions ?? []);
    setTotal(d.total ?? 0);
    setCurrent(0);
    setSelected(null);
    setQuality(null);
    setShowExp(false);
    setScore({ correct: 0, total: 0, xp: 0 });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const q = questions[current];
  const options = q ? [
    { key: "A", text: q.optionA }, { key: "B", text: q.optionB },
    { key: "C", text: q.optionC }, { key: "D", text: q.optionD },
    { key: "E", text: q.optionE },
  ].filter(o => o.text) : [];

  function handleSelect(key: string) {
    if (selected) return;
    setSelected(key);
    const isCorrect = key === q.answer;
    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1, xp: s.xp + (isCorrect ? 2 : 0) }));
    if (isCorrect) { setXpFlash(true); setTimeout(() => setXpFlash(false), 1500); }
  }

  async function handleQuality(qual: string) {
    setQuality(qual);
    const isCorrect = selected === q.answer;
    await fetch("/api/questoes/progresso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, correct: isCorrect, quality: qual }),
    }).catch(() => {});
    setTimeout(next, 300);
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setQuality(null);
      setShowExp(false);
    } else {
      setDone(true);
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen text-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400">Carregando questões para revisão…</p>
      </div>
    </div>
  );

  if (done) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="min-h-screen text-white p-6 max-w-lg mx-auto flex flex-col items-center justify-center">
        <div className="text-5xl mb-4">{pct >= 70 ? "🎉" : pct >= 50 ? "💪" : "📚"}</div>
        <h2 className="text-2xl font-bold mb-1">Revisão concluída!</h2>
        <p className="text-gray-400 text-sm mb-6">Continue revisando para dominar o conteúdo</p>
        <div className="w-full grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className="text-2xl font-black text-white">{score.correct}/{score.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Corretas</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className={cn("text-2xl font-black", pct >= 70 ? "text-green-400" : pct >= 50 ? "text-amber-400" : "text-red-400")}>
              {pct}%
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Aproveitamento</p>
          </div>
          <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 text-center">
            <p className="text-2xl font-black text-indigo-400">+{score.xp}</p>
            <p className="text-xs text-gray-500 mt-0.5">XP ganho</p>
          </div>
        </div>
        <button onClick={() => load(filterSubject || undefined)}
          className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-medium transition-colors">
          <RotateCcw className="w-4 h-4 inline mr-2" />
          Revisar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* XP flash */}
      {xpFlash && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-lg animate-bounce pointer-events-none">
          <Zap className="w-4 h-4" />+2 XP
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h1 className="text-2xl font-bold">Revisão de Erros</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {total > 0
              ? `${total} questão(ões) para revisar${score.total > 0 ? ` · ${score.correct}/${score.total} corretas` : ""}`
              : "Nenhuma questão para revisar"}
          </p>
        </div>
        <select
          value={filterSubject}
          onChange={e => { setFilterSubject(e.target.value); load(e.target.value || undefined); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-red-500"
        >
          <option value="">Todas as matérias</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <div className="text-center py-20">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhum erro para revisar!</h2>
          <p className="text-gray-400 text-sm">Continue respondendo questões para ter erros para revisar aqui.</p>
        </div>
      )}

      {/* Progress bar */}
      {questions.length > 0 && !done && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Questão {current + 1} de {questions.length}</span>
            {q?.banca && <span className="text-red-400">{q.banca}{q.year ? ` · ${q.year}` : ""}</span>}
          </div>
          <div className="h-1.5 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Question card */}
      {q && !done && (
        <div className="rounded-2xl bg-white/3 border border-red-500/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              Você errou esta questão
            </span>
            <span className="text-xs text-gray-600 capitalize">
              {q.level === "facil" ? "Fácil" : q.level === "medio" ? "Médio" : "Difícil"}
            </span>
          </div>

          <p className="text-gray-200 leading-relaxed mb-6 text-sm">{q.statement}</p>

          <div className="space-y-2.5">
            {options.map(({ key, text }) => {
              const isSelected = selected === key;
              const isCorrect  = key === q.answer;
              let style = "border-white/10 bg-white/3 hover:bg-white/5 text-gray-300";
              if (selected) {
                if (isCorrect)        style = "border-green-500/50 bg-green-500/10 text-green-300";
                else if (isSelected)  style = "border-red-500/50 bg-red-500/10 text-red-300";
                else                  style = "border-white/5 bg-white/2 text-gray-600";
              }
              return (
                <button key={key} onClick={() => handleSelect(key)} disabled={!!selected}
                  className={cn("w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all text-sm", style, !selected && "cursor-pointer")}>
                  <span className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                    selected && isCorrect  ? "bg-green-500 border-green-500 text-white" :
                    selected && isSelected ? "bg-red-500 border-red-500 text-white" : "border-current"
                  )}>{key}</span>
                  <span className="flex-1">{text}</span>
                  {selected && isCorrect  && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                  {selected && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="mt-5 space-y-3">
              {q.explanation && (
                <div onClick={() => setShowExp(v => !v)} className="cursor-pointer">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5 hover:text-gray-400">
                    <span>{showExp ? "Ocultar" : "Ver"} explicação</span>
                    <ChevronRight className={cn("w-3 h-3 transition-transform", showExp && "rotate-90")} />
                  </div>
                  {showExp && <p className="text-xs text-gray-400 leading-relaxed p-3 rounded-lg bg-white/5 border border-white/5">{q.explanation}</p>}
                </div>
              )}

              {!quality && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Como foi desta vez?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {QUALITY_OPTS.map(opt => (
                      <button key={opt.id} onClick={() => handleQuality(opt.id)}
                        className={cn("py-2 rounded-lg border text-xs font-medium transition-colors", opt.color)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {quality && (
                <button onClick={next}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-medium transition-colors">
                  {current < questions.length - 1 ? "Próxima →" : "Ver resultado"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
