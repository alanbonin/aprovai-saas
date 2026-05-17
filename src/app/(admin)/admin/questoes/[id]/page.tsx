"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  statement: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  answer: string;
  explanation: string | null;
  level: string;
  banca: string | null;
  year: number | null;
  subjectId: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface Subject { id: string; name: string; }

const LEVELS = [
  { id: "facil",    label: "Fácil",   color: "text-emerald-400" },
  { id: "medio",    label: "Médio",   color: "text-yellow-400" },
  { id: "dificil",  label: "Difícil", color: "text-red-400" },
];
const OPTIONS = ["A", "B", "C", "D", "E"] as const;
const BANCAS = ["CESPE/CEBRASPE","FGV","VUNESP","AOCP","IADES","FCC","IBFC","IDECAN","NC-UFPR","QUADRIX","UPENET/IAUPE","CEFET-MG","FUNCAB","Outras"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminQuestaoEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [q, setQ]               = useState<Question | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");
  const [preview, setPreview]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [qRes, sRes] = await Promise.all([
      fetch(`/api/admin/questoes/${id}`),
      fetch("/api/admin/materias"),
    ]);
    if (qRes.ok) setQ(await qRes.json());
    if (sRes.ok) {
      const d = await sRes.json();
      setSubjects(d.subjects ?? d ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function patch<K extends keyof Question>(key: K, value: Question[K]) {
    setQ(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
    setError("");
  }

  async function save() {
    if (!q) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/questoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: q.statement,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        optionE: q.optionE,
        answer: q.answer,
        explanation: q.explanation,
        level: q.level,
        banca: q.banca,
        year: q.year,
        subjectId: q.subjectId,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setQ(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Erro ao salvar");
    }
    setSaving(false);
  }

  async function doDelete() {
    setDeleting(true);
    const res = await fetch(`/api/admin/questoes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/questoes");
    } else {
      setError("Erro ao deletar questão");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!q) {
    return (
      <div className="min-h-screen text-white p-8 text-center">
        <p className="text-gray-500 mb-4">Questão não encontrada.</p>
        <Link href="/admin/questoes" className="text-orange-400 hover:text-orange-300 text-sm">
          ← Voltar para questões
        </Link>
      </div>
    );
  }

  const opts = OPTIONS.map(l => ({ l, v: q[`option${l}` as keyof Question] as string | null }));

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/questoes"
            className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Questão #{q.id}</h1>
            <p className="text-xs text-gray-600">
              Criada {fmtDate(q.createdAt)}
              {q.updatedAt && q.updatedAt !== q.createdAt && ` · editada ${fmtDate(q.updatedAt)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(p => !p)}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
            title={preview ? "Modo edição" : "Pré-visualizar"}
          >
            {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-4">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Questão salva com sucesso!
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {preview ? (
        /* ── PREVIEW MODE ── */
        <div className="space-y-4">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">
                {LEVELS.find(l => l.id === q.level)?.label ?? q.level}
              </span>
              {q.banca && <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-400">{q.banca}</span>}
              {q.year && <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-400">{q.year}</span>}
              {subjects.find(s => s.id === q.subjectId) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  {subjects.find(s => s.id === q.subjectId)?.name}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{q.statement}</p>
          </div>

          <div className="space-y-2">
            {opts.filter(o => o.v).map(o => (
              <div key={o.l} className={cn(
                "flex items-start gap-3 px-4 py-3 rounded-xl border text-sm",
                o.l === q.answer
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-white/[0.02] border-white/[0.06] text-gray-300"
              )}>
                <span className={cn(
                  "font-bold text-xs w-5 flex-shrink-0 mt-0.5",
                  o.l === q.answer ? "text-emerald-400" : "text-gray-500"
                )}>{o.l})</span>
                <span className="flex-1">{o.v}</span>
                {o.l === q.answer && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {q.explanation && (
            <div className="rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 p-4">
              <p className="text-xs font-semibold text-indigo-400 mb-2">Justificativa</p>
              <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
            </div>
          )}
        </div>
      ) : (
        /* ── EDIT MODE ── */
        <div className="space-y-5">
          {/* Metadata row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Level */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Dificuldade</label>
              <div className="flex gap-1">
                {LEVELS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => patch("level", l.id)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-semibold border transition-all",
                      q.level === l.id
                        ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                        : "border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Year */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Ano</label>
              <input
                type="number"
                value={q.year ?? ""}
                onChange={e => patch("year", e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="Ex: 2023"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
              />
            </div>

            {/* Banca */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Banca</label>
              <select
                value={q.banca ?? ""}
                onChange={e => patch("banca", e.target.value || null)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/40 appearance-none"
              >
                <option value="">Sem banca</option>
                {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Matéria */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Matéria</label>
              <select
                value={q.subjectId ?? ""}
                onChange={e => patch("subjectId", e.target.value || null)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/40 appearance-none"
              >
                <option value="">Sem matéria</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Statement */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Enunciado</label>
            <textarea
              value={q.statement}
              onChange={e => patch("statement", e.target.value)}
              rows={6}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/40 leading-relaxed"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Alternativas</label>
            <div className="space-y-2">
              {OPTIONS.map(l => (
                <div key={l} className="flex items-center gap-3">
                  <button
                    onClick={() => patch("answer", l)}
                    className={cn(
                      "w-8 h-8 rounded-lg border text-xs font-bold flex-shrink-0 transition-all",
                      q.answer === l
                        ? "bg-emerald-600/30 border-emerald-500/50 text-emerald-400"
                        : "bg-white/[0.03] border-white/[0.08] text-gray-500 hover:border-white/20"
                    )}
                    title={`Marcar ${l} como correta`}
                  >
                    {l}
                  </button>
                  <input
                    value={q[`option${l}` as keyof Question] as string ?? ""}
                    onChange={e => patch(`option${l}` as keyof Question, e.target.value || null)}
                    placeholder={`Alternativa ${l}${l === "A" || l === "B" || l === "C" || l === "D" ? " (obrigatória)" : " (opcional)"}`}
                    className={cn(
                      "flex-1 bg-white/[0.03] border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors",
                      q.answer === l
                        ? "border-emerald-500/30 focus:border-emerald-500/50"
                        : "border-white/[0.08] focus:border-orange-500/40"
                    )}
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5">Clique na letra para marcar como gabarito correto</p>
          </div>

          {/* Explanation */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Justificativa (opcional)</label>
            <textarea
              value={q.explanation ?? ""}
              onChange={e => patch("explanation", e.target.value || null)}
              rows={4}
              placeholder="Explique o raciocínio para a resposta correta..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/40 leading-relaxed"
            />
          </div>

          {/* Save button (bottom) */}
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      )}

      {/* Danger zone */}
      <div className="mt-10 pt-6 border-t border-white/[0.06]">
        <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-3">Zona de perigo</p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Deletar questão
          </button>
        ) : (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
            <p className="text-sm text-red-300 font-semibold mb-1">Tem certeza?</p>
            <p className="text-xs text-red-400/70 mb-3">
              Isso removerá permanentemente a questão #{q.id} e todo o histórico de respostas associado.
            </p>
            <div className="flex gap-2">
              <button
                onClick={doDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl text-sm font-semibold text-white transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Deletando..." : "Sim, deletar"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
