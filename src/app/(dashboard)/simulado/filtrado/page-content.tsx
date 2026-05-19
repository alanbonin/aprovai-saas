"use client";
import { useState, useEffect, useCallback } from "react";
import { SlidersHorizontal, Play, ChevronRight, CheckCircle2, XCircle, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject { id: string; name: string; }

interface Question {
  id: number;
  subjectId: string;
  banca: string | null;
  year: number | null;
  level: string;
  statement: string;
  optionA: string; optionB: string;
  optionC: string | null; optionD: string | null; optionE: string | null;
  answer: string;
  explanation: string | null;
}

const OPTS = ["A", "B", "C", "D", "E"] as const;
const BANCAS = [
  "CESPE/CEBRASPE","FGV","VUNESP","AOCP","IADES","FCC",
  "IBFC","IDECAN","NC-UFPR","QUADRIX","FUNCAB","Outras",
];
const LEVELS = [
  { id: "facil",   label: "Fácil",   color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" },
  { id: "medio",   label: "Médio",   color: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10" },
  { id: "dificil", label: "Difícil", color: "border-red-500/40 text-red-400 bg-red-500/10" },
];
const TOTALS = [10, 15, 20, 25, 30];

type Phase = "config" | "running" | "result";

export function SimuladoFiltradoInner() {
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [selSubjects, setSelSubjects] = useState<string[]>([]);
  const [banca, setBanca]           = useState("");
  const [level, setLevel]           = useState("");
  const [total, setTotal]           = useState(15);
  const [phase, setPhase]           = useState<Phase>("config");
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  // Running state
  const [current, setCurrent]       = useState(0);
  const [selected, setSelected]     = useState<Record<number, string>>({});
  const [showExp, setShowExp]       = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/workspace/materias")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSubjects(d.subjects ?? []); })
      .catch(() => {});
  }, []);

  function toggleSubject(id: string) {
    setSelSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  async function startSimulado() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/simulado/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        total,
        subjectIds: selSubjects.length > 0 ? selSubjects : undefined,
        banca: banca || undefined,
        level: level || undefined,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const qs = d.questions ?? [];
      if (qs.length === 0) {
        setError("Nenhuma questão disponível com esses filtros. Tente combinações diferentes.");
        setLoading(false);
        return;
      }
      setQuestions(qs);
      setCurrent(0);
      setSelected({});
      setShowExp({});
      setPhase("running");
    } else {
      const d = await res.json();
      setError(d.error ?? "Erro ao gerar simulado");
    }
    setLoading(false);
  }

  function answer(idx: number, opt: string) {
    if (selected[idx]) return;
    setSelected(p => ({ ...p, [idx]: opt }));
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      setPhase("result");
    }
  }

  const q          = questions[current];
  const sel        = q ? selected[current] : undefined;
  const answered   = sel !== undefined;
  const correctCount = questions.filter((qq, i) => selected[i] === qq.answer).length;
  const accuracy     = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  // ─── CONFIG ───────────────────────────────────────────────────────────────
  if (phase === "config") {
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-indigo-400" />
            Simulado com Filtros
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Monte um simulado personalizado por matéria, banca e dificuldade
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 mb-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Matérias */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Matérias</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelSubjects(subjects.map(s => s.id))}
                  className="text-[10px] text-gray-600 hover:text-indigo-400 transition-colors"
                >Todas</button>
                <span className="text-gray-700">·</span>
                <button
                  onClick={() => setSelSubjects([])}
                  className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                >Limpar</button>
              </div>
            </div>
            {subjects.length === 0 ? (
              <p className="text-xs text-gray-600">Nenhuma matéria configurada. Configure em Perfil → Matérias.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {subjects.map(s => {
                  const sel2 = selSubjects.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSubject(s.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs border transition-all",
                        sel2
                          ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                          : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:border-white/20 hover:text-gray-300"
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-gray-600 mt-2">
              {selSubjects.length === 0 ? "Nenhuma selecionada — usará todas as suas matérias" : `${selSubjects.length} matéria${selSubjects.length !== 1 ? "s" : ""} selecionada${selSubjects.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Banca */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <p className="text-sm font-semibold mb-3">Banca</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setBanca("")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs border transition-all",
                  !banca
                    ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                    : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:border-white/20 hover:text-gray-300"
                )}
              >
                Todas
              </button>
              {BANCAS.map(b => (
                <button
                  key={b}
                  onClick={() => setBanca(b === banca ? "" : b)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs border transition-all",
                    banca === b
                      ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                      : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:border-white/20 hover:text-gray-300"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Nível */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <p className="text-sm font-semibold mb-3">Dificuldade</p>
            <div className="flex gap-2">
              <button
                onClick={() => setLevel("")}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all",
                  !level
                    ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                    : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:text-gray-300"
                )}
              >
                Misto
              </button>
              {LEVELS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id === level ? "" : l.id)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all",
                    level === l.id
                      ? l.color
                      : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:text-gray-300"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <p className="text-sm font-semibold mb-3">
              Número de questões: <span className="text-indigo-300">{total}</span>
            </p>
            <div className="flex gap-2">
              {TOTALS.map(t => (
                <button
                  key={t}
                  onClick={() => setTotal(t)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all",
                    total === t
                      ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                      : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:text-gray-300"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSimulado}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {loading ? "Gerando simulado..." : `Iniciar simulado (${total} questões)`}
          </button>
        </div>
      </div>
    );
  }

  // ─── RESULT ───────────────────────────────────────────────────────────────
  if (phase === "result") {
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
        <div className="text-center py-10">
          <div className="text-5xl mb-4">
            {accuracy >= 80 ? "🏆" : accuracy >= 60 ? "📈" : "💪"}
          </div>
          <h2 className="text-2xl font-black mb-1">{correctCount}/{questions.length} corretas</h2>
          <p className={cn(
            "text-5xl font-black mb-4",
            accuracy >= 80 ? "text-emerald-400" : accuracy >= 60 ? "text-yellow-400" : "text-rose-400"
          )}>
            {accuracy}%
          </p>
          <p className="text-gray-400 text-sm mb-8">
            {accuracy >= 80
              ? "Excelente! Você domina esse conteúdo."
              : accuracy >= 60
              ? "Bom resultado! Continue praticando."
              : "Ainda há espaço para melhorar. Não desista!"}
          </p>

          {/* Summary chips */}
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {banca && (
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {banca}
              </span>
            )}
            {level && (
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                {LEVELS.find(l => l.id === level)?.label ?? level}
              </span>
            )}
            <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
              {questions.length} questões
            </span>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setPhase("config"); setQuestions([]); setError(""); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Novo filtro
            </button>
            <button
              onClick={() => {
                setCurrent(0); setSelected({}); setShowExp({}); setPhase("running");
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Repetir
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RUNNING ──────────────────────────────────────────────────────────────
  if (!q) return null;
  const opts = OPTS.map(l => ({ l, v: q[`option${l}` as keyof Question] as string | null })).filter(o => o.v);

  return (
    <div className="min-h-screen text-white p-4 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{current + 1} / {questions.length}</span>
          <span>{correctCount} corretas</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {q.banca && <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/[0.08] text-gray-500">{q.banca}</span>}
        {q.year && <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/[0.08] text-gray-500">{q.year}</span>}
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full border",
          q.level === "facil"   ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
          q.level === "medio"   ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                                  "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          {LEVELS.find(l => l.id === q.level)?.label ?? q.level}
        </span>
      </div>

      {/* Statement */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-4">
        <p className="text-sm text-gray-200 leading-relaxed">{q.statement}</p>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {opts.map(o => {
          const isCorrect  = o.l === q.answer;
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
                (!answered || (!isCorrect && !isSelected)) && "bg-white/[0.02] border-white/[0.06]"
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
            <><ChevronRight className="w-4 h-4" /> Próxima</>
          ) : (
            <><Trophy className="w-4 h-4" /> Ver resultado</>
          )}
        </button>
      )}
    </div>
  );
}
