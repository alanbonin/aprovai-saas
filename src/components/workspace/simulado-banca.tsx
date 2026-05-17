"use client";
import { useState } from "react";
import { ClipboardList, AlertCircle, ChevronRight, RotateCcw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const BANCAS = [
  "CESPE/CEBRASPE", "FCC", "FGV", "VUNESP", "AOCP",
  "IBFC", "IADES", "CESGRANRIO", "ESAF", "Quadrix",
];

const NIVEIS = [
  { value: "misto", label: "🎲 Misto" },
  { value: "facil", label: "🟢 Fácil" },
  { value: "medio", label: "🟡 Médio" },
  { value: "dificil", label: "🔴 Difícil" },
];

interface QuestaoGerada {
  materia: string;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  answer: string;
  explanation: string;
  level: "facil" | "medio" | "dificil";
  banca: string;
  dicaBanca: string;
}

interface Props {
  subjects: { id: string; name: string; slug: string }[];
  profile: { cargo: string | null; orgao: string | null };
}

export function SimuladoBanca({ subjects, profile }: Props) {
  const [step, setStep] = useState<"config" | "loading" | "simulado" | "resultado">("config");
  const [banca, setBanca] = useState("");
  const [materiasSelec, setMateriasSelec] = useState<string[]>([]);
  const [qtd, setQtd] = useState(10);
  const [nivel, setNivel] = useState("misto");
  const [error, setError] = useState<string | null>(null);
  const [questoes, setQuestoes] = useState<QuestaoGerada[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  // answers[i] = true (acertou) | false (errou) — para breakdown por matéria
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [simuladoId, setSimuladoId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null);

  const matNames = subjects.map(s => s.name);

  async function gerar() {
    if (!banca || materiasSelec.length === 0) return;
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/simulados/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banca, materias: materiasSelec, qtd, nivel,
          cargo: profile.cargo ?? undefined,
        }),
      });
      const data = await res.json() as { questoes?: QuestaoGerada[]; id?: string; error?: string };
      if (!res.ok || data.error) { setError(data.error ?? "Erro ao gerar simulado."); setStep("config"); return; }

      setQuestoes(data.questoes ?? []);
      setSimuladoId(data.id ?? null);
      setCurrent(0); setSelected(null); setShowExpl(false);
      setScore({ correct: 0, total: 0 });
      setAnswers([]);
      const t = Date.now(); setStartTime(t);
      const ref = setInterval(() => setElapsed(Math.floor((Date.now() - t) / 1000)), 1000);
      setTimerRef(ref);
      setStep("simulado");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de conexão");
      setStep("config");
    }
  }

  function handleSelect(key: string) {
    if (selected || !questoes[current]) return;
    setSelected(key);
    const isCorrect = key === questoes[current].answer;
    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    setAnswers(prev => {
      const next = [...prev];
      next[current] = isCorrect;
      return next;
    });
  }

  function next() {
    const isLast = current + 1 >= questoes.length;
    if (isLast) {
      if (timerRef) clearInterval(timerRef);
      setStep("resultado");
      // Salva resultado no histórico (score.correct já inclui a última resposta)
      if (simuladoId) {
        fetch(`/api/simulados/${simuladoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correct: score.correct, timeSecs: elapsed }),
        }).catch(() => {});
      }
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowExpl(false);
    }
  }

  function fmtTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // ── Configuração ─────────────────────────────────────────────────────────────
  if (step === "config") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="font-bold text-xl mb-2">Simulado Banca-Original</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            A IA gera questões no estilo exato da banca — mesmo formato, tom e dificuldade.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Banca */}
          <div>
            <label className="text-xs text-gray-500 block mb-2 font-medium">Banca organizadora</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BANCAS.map(b => (
                <button key={b} onClick={() => setBanca(b)}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-sm font-medium transition-all text-left",
                    banca === b
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                      : "bg-white/3 border-white/8 text-gray-400 hover:text-white hover:border-white/15"
                  )}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Matérias */}
          <div>
            <label className="text-xs text-gray-500 block mb-2 font-medium">
              Matérias ({materiasSelec.length} selecionadas)
            </label>
            {matNames.length === 0 ? (
              <p className="text-xs text-gray-600">Configure suas matérias no workspace primeiro.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMateriasSelec(materiasSelec.length === matNames.length ? [] : [...matNames])}
                  className="text-xs px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors">
                  {materiasSelec.length === matNames.length ? "Desmarcar todas" : "Selecionar todas"}
                </button>
                {matNames.map(m => (
                  <button key={m} onClick={() => setMateriasSelec(prev =>
                    prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                  )}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition-all",
                      materiasSelec.includes(m)
                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                        : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                    )}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantidade + Nível */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-2 font-medium">
                Questões: <strong className="text-white">{qtd}</strong>
              </label>
              <input type="range" min={5} max={30} step={5} value={qtd} onChange={e => setQtd(Number(e.target.value))}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-[10px] text-gray-700 mt-1"><span>5</span><span>30</span></div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-2 font-medium">Nível de dificuldade</label>
              <div className="space-y-1.5">
                {NIVEIS.map(n => (
                  <button key={n.value} onClick={() => setNivel(n.value)}
                    className={cn(
                      "w-full text-left text-xs px-3 py-1.5 rounded-lg border transition-all",
                      nivel === n.value
                        ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                        : "bg-white/3 border-white/8 text-gray-500 hover:text-gray-300"
                    )}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={gerar}
          disabled={!banca || materiasSelec.length === 0}
          className="w-full mt-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm
            flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-indigo-500/20 transition-all">
          <ClipboardList className="w-4 h-4" />
          Gerar simulado {banca ? `— ${banca}` : ""} ({qtd} questões)
        </button>
        <p className="text-center text-xs text-gray-700 mt-2">Leva 20-40 segundos • Powered by Claude AI</p>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="text-4xl mb-5">🧠</div>
        <p className="font-semibold text-base mb-2">Gerando simulado no estilo {banca}…</p>
        <p className="text-xs text-gray-500 mb-6 text-center max-w-xs">
          A IA está elaborando {qtd} questões seguindo o padrão exato da banca, com enunciados e distratores típicos.
        </p>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-500"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Simulado em andamento ─────────────────────────────────────────────────────
  if (step === "simulado") {
    const q = questoes[current];
    const options = (["A","B","C","D","E"] as const)
      .map(k => ({ key: k, text: (q as unknown as Record<string, string | null>)[`option${k}`] }))
      .filter(o => o.text);

    return (
      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-gray-500">
            <span className="text-indigo-400 font-semibold">{banca}</span>
            {" · "}{q.materia}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">{current+1}/{questoes.length}</span>
            <span className={cn("font-mono font-bold", elapsed > 1800 ? "text-red-400" : "text-gray-400")}>
              <Clock className="w-3 h-3 inline mr-0.5" />{fmtTime(elapsed)}
            </span>
            <span className={cn("px-2 py-0.5 rounded-full",
              q.level === "facil" ? "bg-green-500/10 text-green-400" :
              q.level === "medio" ? "bg-yellow-500/10 text-yellow-400" :
              "bg-red-500/10 text-red-400"
            )}>{q.level}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((current)/questoes.length)*100}%` }} />
        </div>

        {/* Questão */}
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
                className={cn("w-full text-left flex items-center gap-2.5 p-3 rounded-xl border text-sm transition-all", style, !selected && "cursor-pointer")}>
                <span className={cn("w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                  selected && isCorrect ? "bg-green-500 border-green-500 text-white" :
                  selected && isSelected ? "bg-red-500 border-red-500 text-white" : "border-current")}>
                  {key}
                </span>
                <span className="flex-1">{text}</span>
                {selected && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                {selected && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="space-y-3">
            {/* Explicação */}
            <div>
              <button onClick={() => setShowExpl(r => !r)} className="text-xs text-indigo-400 hover:text-indigo-300 mb-1 flex items-center gap-1">
                <ChevronRight className={cn("w-3 h-3 transition-transform", showExpl && "rotate-90")} />
                {showExpl ? "Ocultar" : "Ver"} explicação
              </button>
              {showExpl && (
                <p className="text-xs text-gray-400 leading-relaxed p-3 rounded-xl bg-white/5 border border-white/5">{q.explanation}</p>
              )}
            </div>

            {/* Dica da banca */}
            {q.dicaBanca && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15">
                <span className="text-amber-400 text-sm flex-shrink-0">⚡</span>
                <div>
                  <p className="text-[10px] font-semibold text-amber-400 mb-0.5">Padrão {banca}</p>
                  <p className="text-xs text-amber-300/80 leading-relaxed">{q.dicaBanca}</p>
                </div>
              </div>
            )}

            <button onClick={next}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
              {current + 1 < questoes.length ? "Próxima questão →" : "Ver resultado"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Resultado ─────────────────────────────────────────────────────────────────
  const pct = questoes.length > 0 ? Math.round((score.correct / questoes.length) * 100) : 0;
  const aprovado = pct >= 60;

  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <div className="text-5xl mb-4">{aprovado ? "🏆" : "📚"}</div>
      <h2 className="text-xl font-bold mb-1">{aprovado ? "Excelente resultado!" : "Continue praticando!"}</h2>
      <p className="text-gray-500 text-sm mb-5">Simulado {banca} concluído</p>

      <div className="text-6xl font-black mb-2" style={{ color: aprovado ? "#34d399" : "#f59e0b" }}>
        {pct}%
      </div>
      <p className="text-gray-400 text-sm mb-1">{score.correct}/{questoes.length} questões corretas</p>
      <p className="text-xs text-gray-600 mb-6">Tempo: {fmtTime(elapsed)}</p>

      {/* Breakdown por matéria */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 mb-6 text-left">
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Por matéria</p>
        {(() => {
          // Agrupa questões e seus resultados por matéria
          const materiaMap: Record<string, { total: number; correct: number }> = {};
          questoes.forEach((q, i) => {
            const m = q.materia || "Sem matéria";
            if (!materiaMap[m]) materiaMap[m] = { total: 0, correct: 0 };
            materiaMap[m].total++;
            if (answers[i] === true) materiaMap[m].correct++;
          });
          return Object.entries(materiaMap).map(([m, { total, correct: c }]) => {
            const pctM = total > 0 ? Math.round((c / total) * 100) : 0;
            const color = pctM >= 70 ? "#34d399" : pctM >= 50 ? "#f59e0b" : "#f87171";
            return (
              <div key={m} className="py-2 border-b border-white/5 last:border-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400 truncate flex-1 mr-2">{m}</span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color }}>{c}/{total} ({pctM}%)</span>
                </div>
                <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pctM}%`, background: color }} />
                </div>
              </div>
            );
          });
        })()}
      </div>

      <div className="flex gap-3">
        <button onClick={() => { setStep("config"); setError(null); }}
          className="flex-1 py-3 rounded-xl border border-white/10 bg-white/3 text-gray-400 text-sm hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Novo simulado
        </button>
        <button onClick={() => {
          setStep("simulado"); setCurrent(0); setSelected(null); setShowExpl(false);
          setScore({ correct: 0, total: 0 }); setAnswers([]);
          const t = Date.now(); setStartTime(t); setElapsed(0);
          const ref = setInterval(() => setElapsed(Math.floor((Date.now() - t) / 1000)), 1000);
          setTimerRef(ref);
        }}
          className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Refazer
        </button>
      </div>
    </div>
  );
}
