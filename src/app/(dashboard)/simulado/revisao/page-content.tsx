"use client";
import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Play, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  subjectName: string | null;
  banca: string | null;
  year: number | null;
  level: string;
  statement: string;
  optionA: string | null; optionB: string | null;
  optionC: string | null; optionD: string | null; optionE: string | null;
  answer: string;
  explanation: string | null;
  _wrongCount: number;
  _accuracy: number;
  _neverRight: boolean;
}

const OPTS = ["A", "B", "C", "D", "E"] as const;
const LEVEL_MAP: Record<string, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };

type Phase = "config" | "running" | "result";

export function SimuladoRevisaoInner() {
  const [phase, setPhase]       = useState<Phase>("config");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading]   = useState(false);
  const [count, setCount]       = useState(10);
  const [message, setMessage]   = useState<string | null>(null);

  // Running state
  const [current, setCurrent]   = useState(0);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [showExp, setShowExp]   = useState<Record<number, boolean>>({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/simulado/revisao?count=${count}`);
    if (res.ok) {
      const d = await res.json();
      setQuestions(d.questions ?? []);
      setMessage(d.message ?? null);
    }
    setLoading(false);
  }

  function start() {
    setCurrent(0);
    setSelected({});
    setShowExp({});
    setPhase("running");
  }

  function answer(qIdx: number, opt: string) {
    if (selected[qIdx]) return;
    setSelected(p => ({ ...p, [qIdx]: opt }));
  }

  const finishSimulado = useCallback(() => {
    setPhase("result");
  }, []);

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      finishSimulado();
    }
  }

  const correctCount = questions.filter((q, i) => selected[i] === q.answer).length;
  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const q = questions[current];
  const sel = q ? selected[current] : undefined;
  const answered = sel !== undefined;

  if (phase === "config") {
    return (
      <div className="min-h-dvh text-white p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-rose-400" />
            Simulado de Revisão
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Pratique as questões que você mais errou para superar suas dificuldades
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 mb-4">
          <div className="flex items-center gap-4 mb-5">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
            <div>
              <p className="font-semibold text-white">Foco nos seus pontos fracos</p>
              <p className="text-xs text-gray-500 mt-0.5">
                As questões são selecionadas automaticamente com base no seu histórico de erros — as que você mais erra aparecem primeiro.
              </p>
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-2 block">
              Número de questões: <span className="text-white font-bold">{count}</span>
            </label>
            <input
              type="range" min={5} max={30} step={5} value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>5</span><span>30</span>
            </div>
          </div>

          <button
            onClick={async () => { await load(); }}
            disabled={loading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {loading ? "Carregando..." : "Montar simulado"}
          </button>
        </div>

        {/* Preview */}
        {message && !loading && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
            <p className="text-sm text-emerald-300">{message}</p>
          </div>
        )}

        {questions.length > 0 && !loading && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-sm text-gray-300 mb-3 font-medium">
              {questions.length} questões selecionadas — pré-visualização:
            </p>
            <div className="space-y-2 mb-4">
              {questions.slice(0, 3).map((q, i) => (
                <div key={q.id} className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="w-5 h-5 rounded bg-rose-500/10 flex items-center justify-center text-rose-400 font-bold flex-shrink-0">{i + 1}</span>
                  <span className="flex-1 truncate">{q.statement.slice(0, 80)}...</span>
                  <span className={cn(
                    "flex-shrink-0 font-semibold",
                    q._neverRight ? "text-red-400" : "text-amber-400"
                  )}>
                    {q._wrongCount}× errou
                  </span>
                </div>
              ))}
              {questions.length > 3 && (
                <p className="text-xs text-gray-600 pl-8">+ {questions.length - 3} mais...</p>
              )}
            </div>
            <button
              onClick={start}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Iniciar simulado de revisão
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="min-h-dvh text-white p-6 max-w-2xl mx-auto">
        <div className="text-center py-10">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-4xl">
            {accuracy >= 80 ? "🏆" : accuracy >= 60 ? "📈" : "💪"}
          </div>
          <h2 className="text-2xl font-black mb-1">
            {correctCount}/{questions.length} corretas
          </h2>
          <p className={cn(
            "text-4xl font-black mb-4",
            accuracy >= 80 ? "text-emerald-400" : accuracy >= 60 ? "text-yellow-400" : "text-rose-400"
          )}>
            {accuracy}%
          </p>
          <p className="text-gray-400 text-sm mb-6">
            {accuracy >= 80
              ? "Excelente revisão! Você está dominando os pontos fracos. 🎉"
              : accuracy >= 60
              ? "Bom progresso! Continue praticando para superar esses tópicos."
              : "Esses tópicos precisam de mais atenção. Não desista — repita a revisão!"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setPhase("config"); setQuestions([]); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Novo simulado
            </button>
            <button
              onClick={start}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <Play className="w-4 h-4" />
              Repetir
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Running
  if (!q) return null;
  const opts = OPTS.map(l => ({ l, v: q[`option${l}` as keyof Question] as string | null })).filter(o => o.v);

  return (
    <div className="min-h-dvh text-white p-4 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{current + 1} / {questions.length}</span>
          <span>{correctCount} corretas</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-rose-500/70 rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Error badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
          Errada {q._wrongCount}× · {q._accuracy}% de acerto
        </span>
        {q.subjectName && <span className="text-xs text-gray-600">{q.subjectName}</span>}
        <span className="text-xs text-gray-600">{LEVEL_MAP[q.level] ?? q.level}</span>
      </div>

      {/* Statement */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-4">
        <p className="text-sm text-gray-200 leading-relaxed">{q.statement}</p>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {opts.map(o => {
          const isCorrect = o.l === q.answer;
          const isSelected = sel === o.l;
          return (
            <button
              key={o.l}
              onClick={() => answer(current, o.l)}
              disabled={answered}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all",
                !answered && "hover:border-white/20 hover:bg-white/[0.04]",
                answered && isCorrect && "bg-emerald-500/10 border-emerald-500/30",
                answered && isSelected && !isCorrect && "bg-red-500/10 border-red-500/30",
                !answered || (!isCorrect && !isSelected) ? "bg-white/[0.02] border-white/[0.06]" : ""
              )}
            >
              <span className={cn(
                "font-bold text-xs w-5 flex-shrink-0 mt-0.5",
                answered && isCorrect ? "text-emerald-400" :
                answered && isSelected && !isCorrect ? "text-red-400" :
                "text-gray-500"
              )}>{o.l})</span>
              <span className={cn(
                "flex-1",
                answered && isCorrect ? "text-emerald-300" :
                answered && isSelected && !isCorrect ? "text-red-300" :
                "text-gray-300"
              )}>{o.v}</span>
              {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {answered && q.explanation && (
        <div className="rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 p-4 mb-4">
          <button
            onClick={() => setShowExp(p => ({ ...p, [current]: !p[current] }))}
            className="flex items-center gap-2 text-xs text-indigo-400 font-semibold w-full text-left"
          >
            {showExp[current] ? "▼" : "▶"} Justificativa
          </button>
          {showExp[current] && (
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">{q.explanation}</p>
          )}
        </div>
      )}

      {/* Next */}
      {answered && (
        <button
          onClick={next}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {current < questions.length - 1 ? (
            <><ChevronRight className="w-4 h-4" /> Próxima questão</>
          ) : (
            <><Trophy className="w-4 h-4" /> Ver resultado</>
          )}
        </button>
      )}
    </div>
  );
}
