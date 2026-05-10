"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, ChevronRight, RotateCcw, Filter } from "lucide-react";
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
}

const BANCAS = ["CESPE", "FGV", "VUNESP", "FCC", "IBFC", "CESGRANRIO", "AOCP"];
const LEVELS = [
  { id: "facil", label: "Fácil" },
  { id: "medio", label: "Médio" },
  { id: "dificil", label: "Difícil" },
];

export default function QuestoesPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filterBanca, setFilterBanca] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterBanca) params.set("banca", filterBanca);
    if (filterLevel) params.set("level", filterLevel);
    params.set("limit", "20");
    const res = await fetch(`/api/questoes?${params}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setCurrent(0);
    setSelected(null);
    setShowResult(false);
    setScore({ correct: 0, total: 0 });
    setLoading(false);
  }, [filterBanca, filterLevel]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const q = questions[current];
  const options = q ? [
    { key: "A", text: q.optionA },
    { key: "B", text: q.optionB },
    { key: "C", text: q.optionC },
    { key: "D", text: q.optionD },
    { key: "E", text: q.optionE },
  ].filter(o => o.text) : [];

  function handleSelect(key: string) {
    if (selected) return;
    setSelected(key);
    const isCorrect = key === q.answer;
    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    fetch("/api/questoes/progresso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, correct: isCorrect }),
    });
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowResult(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Carregando questões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Questões</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {score.total > 0 ? `${score.correct}/${score.total} corretas (${Math.round(score.correct / score.total * 100)}%)` : "Pratique questões de concurso"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors",
              showFilter ? "bg-indigo-600 border-indigo-500 text-white" : "border-white/10 text-gray-400 hover:text-white"
            )}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={loadQuestions}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Novas
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilter && (
        <div className="mb-5 p-4 rounded-xl bg-white/5 border border-white/10 flex flex-wrap gap-3">
          <div className="flex-1 min-w-36">
            <label className="text-xs text-gray-500 mb-1 block">Banca</label>
            <select
              value={filterBanca}
              onChange={e => setFilterBanca(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todas</option>
              {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-36">
            <label className="text-xs text-gray-500 mb-1 block">Nível</label>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todos</option>
              {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {questions.length > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Questão {current + 1} de {questions.length}</span>
            {q?.banca && <span className="text-indigo-400">{q.banca}{q.year ? ` · ${q.year}` : ""}</span>}
          </div>
          <div className="h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Question card */}
      {!q ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">Nenhuma questão encontrada</p>
          <p className="text-gray-600 text-sm mt-1">Tente mudar os filtros ou aguarde novas questões</p>
        </div>
      ) : current >= questions.length ? (
        <div className="text-center py-20">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sessão concluída!</h2>
          <p className="text-gray-400 mb-2">Você acertou <strong className="text-white">{score.correct}</strong> de <strong className="text-white">{score.total}</strong> questões</p>
          <p className="text-2xl font-black text-indigo-400">{Math.round(score.correct / score.total * 100)}%</p>
          <button onClick={loadQuestions} className="mt-6 px-6 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">
            Novo simulado
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/3 border border-white/5 p-6">
          <p className="text-gray-200 leading-relaxed mb-6 text-sm">{q.statement}</p>

          <div className="space-y-2.5">
            {options.map(({ key, text }) => {
              const isSelected = selected === key;
              const isCorrect = key === q.answer;
              let style = "border-white/10 bg-white/3 hover:bg-white/5 text-gray-300";
              if (selected) {
                if (isCorrect) style = "border-green-500/50 bg-green-500/10 text-green-300";
                else if (isSelected) style = "border-red-500/50 bg-red-500/10 text-red-300";
                else style = "border-white/5 bg-white/2 text-gray-500";
              }

              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={!!selected}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all text-sm",
                    style,
                    !selected && "cursor-pointer"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0",
                    selected && isCorrect ? "bg-green-500 border-green-500 text-white" :
                    selected && isSelected ? "bg-red-500 border-red-500 text-white" :
                    "border-current"
                  )}>{key}</span>
                  <span className="flex-1">{text}</span>
                  {selected && isCorrect && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                  {selected && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="mt-5">
              {q.explanation && (
                <div
                  onClick={() => setShowResult(r => !r)}
                  className="mb-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5 hover:text-gray-400">
                    <span>{showResult ? "Ocultar" : "Ver"} explicação</span>
                    <ChevronRight className={cn("w-3 h-3 transition-transform", showResult && "rotate-90")} />
                  </div>
                  {showResult && (
                    <p className="text-xs text-gray-400 leading-relaxed p-3 rounded-lg bg-white/5 border border-white/5">
                      {q.explanation}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={next}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors"
              >
                {current < questions.length - 1 ? "Próxima questão →" : "Ver resultado"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
