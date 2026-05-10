"use client";
import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number; banca: string | null; year: number | null;
  level: string; statement: string; answer: string;
}

const emptyQ = {
  banca: "", year: "", level: "medio", statement: "",
  optionA: "", optionB: "", optionC: "", optionD: "", optionE: "",
  answer: "A", explanation: "", subjectId: "geral",
};

export function QuestoesAdmin({ questions: initial }: { questions: Question[] }) {
  const [questions, setQuestions] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyQ);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/questoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, year: form.year ? parseInt(form.year) : null }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }
    const saved = await res.json();
    setQuestions(q => [{ id: saved.id, banca: saved.banca, year: saved.year, level: saved.level, statement: saved.statement, answer: saved.answer }, ...q]);
    setForm(emptyQ);
    setShowForm(false);
    setSaving(false);
  }

  const field = (key: keyof typeof form, label: string, placeholder = "") => (
    <div key={key}>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova questão
        </button>
      </div>

      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/3">
              <th className="text-left px-4 py-3 text-gray-500 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Enunciado</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Banca</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Nível</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Gabarito</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {questions.map(q => (
              <tr key={q.id} className="hover:bg-white/3 transition-colors">
                <td className="px-4 py-3 text-gray-600 text-xs">{q.id}</td>
                <td className="px-4 py-3 text-gray-300 max-w-sm">
                  <p className="line-clamp-2 text-xs">{q.statement}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{q.banca ?? "—"}{q.year ? ` ${q.year}` : ""}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", {
                    "bg-green-500/10 text-green-400": q.level === "facil",
                    "bg-yellow-500/10 text-yellow-400": q.level === "medio",
                    "bg-red-500/10 text-red-400": q.level === "dificil",
                  })}>
                    {q.level}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-indigo-400">{q.answer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nova questão */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="font-semibold">Nova questão</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {field("banca", "Banca", "Ex: CESPE")}
                {field("year", "Ano", "Ex: 2024")}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nível</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Enunciado *</label>
                <textarea value={form.statement} onChange={e => setForm(f => ({ ...f, statement: e.target.value }))}
                  rows={4} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Texto da questão..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["A","B","C","D","E"] as const).map(k => (
                  <div key={k}>
                    <label className="text-xs text-gray-500 mb-1 block">Opção {k}</label>
                    <input value={form[`option${k}` as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [`option${k}`]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder={`Texto da alternativa ${k}`} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Gabarito *</label>
                  <select value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    {["A","B","C","D","E"].map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Explicação</label>
                <textarea value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                  rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Explicação do gabarito (opcional)" />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>

            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.statement.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar questão
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
