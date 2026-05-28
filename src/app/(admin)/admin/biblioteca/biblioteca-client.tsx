"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, FileText, Loader2, Plus, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Doc {
  id: string; title: string; description?: string;
  subjectId?: string; fileSize: number; pageCount?: number;
  planLevel: string; createdAt: string;
}
interface Subject { id: string; name: string; categoria: string }

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PLAN_LEVELS = [
  { value: "trial",       label: "Trial (todos)" },
  { value: "focado",      label: "Focado+" },
  { value: "aprovacao",   label: "Aprovação+" },
  { value: "elite",       label: "Elite / Prova Marcada" },
];

export function BibliotecaAdmin({ docs: initialDocs, subjects }: { docs: Doc[]; subjects: Subject[] }) {
  const [docs, setDocs]           = useState<Doc[]>(initialDocs);
  const [showForm, setShowForm]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [form, setForm]           = useState({
    title: "", description: "", subjectId: "", topicId: "", planLevel: "trial",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file || !form.title) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("subjectId", form.subjectId);
    fd.append("topicId", form.topicId);
    fd.append("planLevel", form.planLevel);

    const r = await fetch("/api/biblioteca/upload", { method: "POST", body: fd });
    const data = await r.json();
    setUploading(false);

    if (!r.ok) { alert(data.error ?? "Erro no upload"); return; }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setFile(null);
    setForm({ title: "", description: "", subjectId: "", topicId: "", planLevel: "trial" });
    setShowForm(false);

    // Recarrega lista
    fetch("/api/biblioteca").then(r => r.json()).then(d => setDocs(Array.isArray(d) ? d : []));
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Deletar "${title}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    await fetch(`/api/biblioteca/upload?id=${id}`, { method: "DELETE" });
    setDocs(d => d.filter(doc => doc.id !== id));
    setDeleting(null);
  }

  const grouped = subjects.reduce<Record<string, Subject[]>>((acc, s) => {
    const cat = s.categoria ?? "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Botão novo */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo PDF
        </button>
      </div>

      {/* Formulário de upload */}
      {showForm && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Upload de PDF</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              file ? "border-indigo-500 bg-indigo-500/10" : "border-white/20 hover:border-white/40"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (!form.title) setForm(fm => ({ ...fm, title: f.name.replace(/\.pdf$/i, "") }));
                }
              }}
            />
            {file ? (
              <div>
                <FileText className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-sm text-white font-medium">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{formatSize(file.size)}</p>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Clique para selecionar um PDF</p>
                <p className="text-xs text-gray-600 mt-1">Máximo 50MB</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Título *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Nome do documento"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Plano mínimo</label>
              <select
                value={form.planLevel}
                onChange={e => setForm(f => ({ ...f, planLevel: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {PLAN_LEVELS.map(p => <option key={p.value} value={p.value} className="bg-gray-900">{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Descrição</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Breve descrição do conteúdo..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Matéria</label>
            <select
              value={form.subjectId}
              onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="" className="bg-gray-900">Sem matéria</option>
              {Object.entries(grouped).map(([cat, subs]) => (
                <optgroup key={cat} label={cat}>
                  {subs.map(s => <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || !form.title || uploading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Enviando..." : success ? "Enviado!" : "Enviar PDF"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      <div className="space-y-2">
        {docs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum PDF cadastrado ainda</p>
          </div>
        ) : docs.map(doc => (
          <div key={doc.id} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
            <div className="w-10 h-12 bg-red-500/20 rounded flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{doc.title}</p>
              {doc.description && <p className="text-xs text-gray-500 truncate mt-0.5">{doc.description}</p>}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-gray-600">{formatSize(doc.fileSize)}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">{doc.planLevel}</span>
                <span className="text-[10px] text-gray-600">{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
            <button
              onClick={() => handleDelete(doc.id, doc.title)}
              disabled={deleting === doc.id}
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
