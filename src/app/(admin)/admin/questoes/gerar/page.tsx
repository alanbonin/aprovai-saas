"use client";
import { useEffect, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject { id: string; name: string; }

interface GeneratedQuestion {
  id: number;
  statement: string;
  optionA: string; optionB: string; optionC: string; optionD: string; optionE?: string;
  answer: string;
  explanation: string | null;
  level: string;
  banca: string | null;
  subjectId: string;
}

const BANCAS = ["CESPE/CEBRASPE","FCC","VUNESP","ESAF","FGV","IDECAN","IBFC","IADES","QUADRIX","NC-UFPR","FUNDATEC","AOCP","FEPESE","OBJETIVA"];
const LEVELS = [{ v: "facil", label: "Fácil" }, { v: "medio", label: "Médio" }, { v: "dificil", label: "Difícil" }];
const LETTER_COLORS: Record<string, string> = {
  A: "text-blue-400",  B: "text-purple-400",
  C: "text-emerald-400", D: "text-amber-400", E: "text-rose-400",
};

function QuestionCard({ q, idx }: { q: GeneratedQuestion; idx: number }) {
  const [expanded, setExpanded] = useState(idx === 0);
  const opts = [
    { l: "A", v: q.optionA }, { l: "B", v: q.optionB },
    { l: "C", v: q.optionC }, { l: "D", v: q.optionD },
    ...(q.optionE ? [{ l: "E", v: q.optionE }] : []),
  ];

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="w-6 h-6 rounded-lg bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0 mt-0.5">
          {idx + 1}
        </span>
        <p className="flex-1 text-sm text-gray-200 line-clamp-2">{q.statement}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-medium",
            q.level === "facil" ? "bg-green-500/15 text-green-400" :
            q.level === "medio" ? "bg-yellow-500/15 text-yellow-400" :
            "bg-red-500/15 text-red-400"
          )}>
            {LEVELS.find(l => l.v === q.level)?.label ?? q.level}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.04]">
          <p className="text-sm text-gray-300 mt-3 mb-3 leading-relaxed">{q.statement}</p>

          <div className="space-y-1.5 mb-4">
            {opts.map(o => (
              <div
                key={o.l}
                className={cn(
                  "flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm",
                  o.l === q.answer
                    ? "bg-emerald-500/10 border border-emerald-500/25"
                    : "bg-white/[0.02] border border-white/[0.04]"
                )}
              >
                <span className={cn("font-bold text-xs w-4 flex-shrink-0 mt-0.5", LETTER_COLORS[o.l])}>
                  {o.l})
                </span>
                <span className={cn("flex-1", o.l === q.answer ? "text-emerald-300" : "text-gray-400")}>
                  {o.v}
                </span>
                {o.l === q.answer && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>

          {q.explanation && (
            <div className="rounded-lg bg-indigo-500/[0.06] border border-indigo-500/15 p-3">
              <p className="text-[10px] text-indigo-400 font-semibold mb-1">Justificativa</p>
              <p className="text-xs text-gray-400 leading-relaxed">{q.explanation}</p>
            </div>
          )}

          <p className="text-[10px] text-gray-700 mt-2">ID: #{q.id} · Banca: {q.banca ?? "—"}</p>
        </div>
      )}
    </div>
  );
}

export default function GerarQuestoesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [form, setForm] = useState({
    subjectId: "",
    banca: "",
    level: "medio",
    count: 5,
    extraContext: "",
  });

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ count: number; questions: GeneratedQuestion[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subjects").then(r => r.ok ? r.json() : null).then(d => {
      if (d) setSubjects(d.subjects ?? d ?? []);
    });
  }, []);

  async function generate() {
    if (!form.subjectId) { setError("Selecione uma matéria."); return; }
    setGenerating(true);
    setResult(null);
    setError(null);

    const res = await fetch("/api/admin/questoes/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: form.subjectId,
        banca: form.banca || undefined,
        level: form.level,
        count: form.count,
        extraContext: form.extraContext || undefined,
      }),
    });

    if (res.ok) {
      const d = await res.json();
      setResult(d);
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Erro ao gerar questões");
    }
    setGenerating(false);
  }

  return (
    <div className="p-8 text-white max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          Gerar Questões com IA
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          As questões são geradas pelo modelo Claude Haiku e inseridas diretamente no banco.
        </p>
      </div>

      {/* Config form */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Matéria */}
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1.5 block">Matéria *</label>
            <select
              value={form.subjectId}
              onChange={e => setForm(p => ({ ...p, subjectId: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">Selecione...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Banca */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Banca (opcional)</label>
            <select
              value={form.banca}
              onChange={e => setForm(p => ({ ...p, banca: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">Qualquer banca</option>
              {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Nível */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Nível</label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button
                  key={l.v}
                  onClick={() => setForm(p => ({ ...p, level: l.v }))}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all",
                    form.level === l.v
                      ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                      : "border-white/[0.06] text-gray-500 hover:border-white/15"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantidade */}
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1.5 block">
              Quantidade: <span className="text-white font-bold">{form.count} questões</span>
            </label>
            <input
              type="range" min={1} max={20} value={form.count}
              onChange={e => setForm(p => ({ ...p, count: Number(e.target.value) }))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>1</span><span>20</span>
            </div>
          </div>

          {/* Contexto extra */}
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1.5 block">Contexto extra (opcional)</label>
            <textarea
              value={form.extraContext}
              onChange={e => setForm(p => ({ ...p, extraContext: e.target.value }))}
              placeholder="Ex: Focar em jurisprudência recente, questões sobre licitações…"
              rows={2}
              maxLength={400}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>
        </div>

        <button
          onClick={generate}
          disabled={generating || !form.subjectId}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando questões... pode levar 20–40s
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Gerar {form.count} questão{form.count !== 1 ? "ões" : ""}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              {result.count} questão{result.count !== 1 ? "ões" : ""} gerada{result.count !== 1 ? "s" : ""} e salva{result.count !== 1 ? "s" : ""} com sucesso
            </h2>
            <button
              onClick={generate}
              disabled={generating}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              + Gerar mais
            </button>
          </div>
          <div className="space-y-3">
            {result.questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} idx={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
