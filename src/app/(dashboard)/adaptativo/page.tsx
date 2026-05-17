"use client";
import { useState, useEffect, useCallback } from "react";
import { Brain, ChevronRight, RotateCcw, Trophy, Zap, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdaptQuestion {
  id: number;
  subjectId: string;
  subjectName: string;
  level: string;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  answer: string;
  explanation: string | null;
  banca: string | null;
  year: number | null;
  tipo: "vencida" | "nova" | "reforco";
}

interface AdaptResponse {
  questoes: AdaptQuestion[];
  modo: "revisao_urgente" | "aprendizado" | "reforco" | "sem_questoes";
  stats: { vencidas: number; novas: number; reforco: number };
}

type Quality = "again" | "hard" | "good" | "easy";

const QUALITY_BTNS: { q: Quality; label: string; color: string }[] = [
  { q: "again", label: "Errei",   color: "bg-red-600 hover:bg-red-700" },
  { q: "hard",  label: "Difícil", color: "bg-amber-600 hover:bg-amber-700" },
  { q: "good",  label: "Entendi", color: "bg-blue-600 hover:bg-blue-700" },
  { q: "easy",  label: "Dominei", color: "bg-green-600 hover:bg-green-700" },
];

const MODO_META: Record<string, { label: string; color: string; icon: string }> = {
  revisao_urgente: { label: "Revisão Urgente", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: "🔴" },
  aprendizado:     { label: "Aprendizado",     color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: "🟢" },
  reforco:         { label: "Reforço",          color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: "🟡" },
  sem_questoes:    { label: "Sem questões",    color: "text-gray-400 bg-white/5 border-white/10", icon: "⚪" },
};

const TIPO_CHIP: Record<string, { label: string; color: string }> = {
  vencida: { label: "⏰ Revisão vencida", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  nova:    { label: "✨ Nova questão",    color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  reforco: { label: "🔁 Reforço",         color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};

const QUALITY_MAP: Record<Quality, number> = { again: 0, hard: 1, good: 3, easy: 5 };

export default function AdaptativoPage() {
  const [data, setData]         = useState<AdaptResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [idx, setIdx]           = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [xpFlash, setXpFlash]   = useState(false);
  const [done, setDone]         = useState(false);
  const [sessionResults, setSessionResults] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setIdx(0); setSelected(null); setRevealed(false); setDone(false);
    setSessionResults({ correct: 0, total: 0 });
    const res = await fetch("/api/questoes/adaptativa?qtd=10").catch(() => null);
    if (res?.ok) {
      const d: AdaptResponse = await res.json();
      setData(d);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleQuality(q: Quality) {
    if (!data) return;
    const questao = data.questoes[idx];
    const isCorrect = selected === questao.answer || q === "good" || q === "easy";

    if (isCorrect) {
      setXpFlash(true);
      setTimeout(() => setXpFlash(false), 1500);
    }

    setSessionResults(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    await fetch("/api/questoes/progresso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: questao.id,
        correct: isCorrect,
        quality: QUALITY_MAP[q],
      }),
    }).catch(() => {});

    if (idx + 1 >= data.questoes.length) {
      setDone(true);
    } else {
      setIdx(i => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Selecionando questões ideais…</p>
      </div>
    </div>
  );

  // ── Sem questões ─────────────────────────────────────────────────────────────
  if (!data || data.modo === "sem_questoes" || data.questoes.length === 0) return (
    <div className="p-6 max-w-2xl mx-auto text-white text-center mt-20">
      <Brain className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Nenhuma questão disponível</h2>
      <p className="text-gray-400 text-sm mb-6">
        Adicione matérias ao seu perfil de estudos para receber questões adaptativas.
      </p>
      <button onClick={load} className="px-5 py-2.5 bg-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-700">
        Tentar novamente
      </button>
    </div>
  );

  // ── Sessão completa ──────────────────────────────────────────────────────────
  if (done) {
    const acc = sessionResults.total > 0
      ? Math.round((sessionResults.correct / sessionResults.total) * 100) : 0;
    return (
      <div className="p-6 max-w-2xl mx-auto text-white">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <Trophy className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-1">Sessão Concluída!</h2>
          <p className="text-gray-400 text-sm mb-6">Modo adaptativo · {data.questoes.length} questões</p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Respondidas", value: sessionResults.total, color: "text-blue-400" },
              { label: "Corretas",    value: sessionResults.correct, color: "text-green-400" },
              { label: "Acerto",      value: `${acc}%`, color: acc >= 70 ? "text-green-400" : acc >= 50 ? "text-yellow-400" : "text-red-400" },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-white/5 p-4">
                <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={load}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-700">
              <RotateCcw className="w-4 h-4" /> Nova sessão
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Questão ──────────────────────────────────────────────────────────────────
  const questao = data.questoes[idx];
  const modeMeta = MODO_META[data.modo] ?? MODO_META.aprendizado;
  const tipochip = TIPO_CHIP[questao.tipo];
  const options = [
    { letter: "A", text: questao.optionA },
    { letter: "B", text: questao.optionB },
    questao.optionC ? { letter: "C", text: questao.optionC } : null,
    questao.optionD ? { letter: "D", text: questao.optionD } : null,
    questao.optionE ? { letter: "E", text: questao.optionE } : null,
  ].filter(Boolean) as { letter: string; text: string }[];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm">Modo Adaptativo</span>
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium", modeMeta.color)}>
            {modeMeta.icon} {modeMeta.label}
          </span>
        </div>
        <span className="text-xs text-gray-500 font-mono">{idx + 1} / {data.questoes.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${((idx) / data.questoes.length) * 100}%` }} />
      </div>

      {/* Session stats mini */}
      <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
        <span>🔴 {data.stats.vencidas} vencidas</span>
        <span>🟢 {data.stats.novas} novas</span>
        <span>🔵 {data.stats.reforco} reforço</span>
      </div>

      {/* Card questão */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
        {/* Meta info */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 flex-wrap">
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium", tipochip.color)}>
            {tipochip.label}
          </span>
          <span className="text-[11px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
            {questao.subjectName}
          </span>
          {questao.banca && (
            <span className="text-[11px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
              {questao.banca}{questao.year ? ` · ${questao.year}` : ""}
            </span>
          )}
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full ml-auto",
            questao.level === "easy"   ? "text-green-400 bg-green-500/10" :
            questao.level === "hard"   ? "text-red-400 bg-red-500/10"     : "text-yellow-400 bg-yellow-500/10"
          )}>
            {questao.level === "easy" ? "Fácil" : questao.level === "hard" ? "Difícil" : "Médio"}
          </span>
        </div>

        <div className="px-4 pb-4">
          <p className="text-sm text-gray-200 leading-relaxed mb-4">{questao.statement}</p>

          {/* Alternativas */}
          <div className="space-y-2">
            {options.map(({ letter, text }) => {
              const isSelected = selected === letter;
              const isCorrect  = letter === questao.answer;
              let cls = "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10";
              if (revealed) {
                if (isCorrect) cls = "bg-green-600/20 border-green-500/50 text-green-300";
                else if (isSelected) cls = "bg-red-600/20 border-red-500/50 text-red-300";
                else cls = "bg-white/3 border-white/5 text-gray-600";
              } else if (isSelected) {
                cls = "bg-indigo-600/20 border-indigo-500/50 text-indigo-200";
              }
              return (
                <button key={letter}
                  disabled={revealed}
                  onClick={() => {
                    if (revealed) return;
                    setSelected(letter);
                    setRevealed(true);
                  }}
                  className={cn("w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all text-sm", cls)}
                >
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0
                    bg-white/10 mt-0.5">
                    {letter}
                  </span>
                  <span className="leading-relaxed">{text}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback / qualidade */}
          {revealed && (
            <div className="mt-4 space-y-3">
              {questao.explanation && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Explicação</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{questao.explanation}</p>
                </div>
              )}
              <div className="relative">
                {xpFlash && (
                  <div className="absolute -top-8 right-0 flex items-center gap-1 text-yellow-400 font-bold text-sm animate-bounce">
                    <Zap className="w-4 h-4" /> +2 XP
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 w-full mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Como foi?
                  </span>
                  {QUALITY_BTNS.map(btn => (
                    <button key={btn.q} onClick={() => handleQuality(btn.q)}
                      className={cn("flex-1 min-w-[70px] py-2 rounded-xl text-white text-xs font-bold transition-all", btn.color)}>
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pular sem responder (se não revelou) */}
          {!revealed && (
            <button
              onClick={() => setRevealed(true)}
              className="mt-3 w-full py-2 rounded-xl border border-white/10 text-gray-500 text-xs hover:text-gray-300 transition-colors flex items-center justify-center gap-1"
            >
              <ChevronRight className="w-3.5 h-3.5" /> Ver gabarito sem responder
            </button>
          )}
        </div>
      </div>

      {/* Dica */}
      <p className="text-center text-xs text-gray-600 mt-4 flex items-center justify-center gap-1">
        <Sparkles className="w-3 h-3" />
        O algoritmo prioriza questões vencidas e suas maiores dificuldades
      </p>
    </div>
  );
}
