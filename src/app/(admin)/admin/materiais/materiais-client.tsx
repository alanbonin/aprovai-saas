"use client";
import { useState, useRef } from "react";
import { Plus, Edit2, X, Check, FileText, Link as LinkIcon, Video, BookOpen, Upload, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Material {
  id: string; title: string; description: string | null;
  type: "PDF" | "VIDEO" | "LINK" | "TEXTO";
  subjectId: string | null; banca: string | null;
  fileUrl: string | null; fileSize: number | null;
  isPremium: boolean; active: boolean; createdAt: string;
}
interface Subject { id: string; name: string; }
interface Props { materials: Material[]; subjects: Subject[]; }

const TYPE_ICONS: Record<string, React.ReactNode> = {
  PDF: <FileText className="w-3.5 h-3.5" />,
  VIDEO: <Video className="w-3.5 h-3.5" />,
  LINK: <LinkIcon className="w-3.5 h-3.5" />,
  TEXTO: <BookOpen className="w-3.5 h-3.5" />,
};

const empty = { title: "", description: "", type: "PDF" as const, subjectId: "", banca: "", fileUrl: "", isPremium: false };

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MateriaisAdmin({ materials: initial, subjects }: Props) {
  const [materials, setMaterials] = useState(initial);
  const [editing, setEditing] = useState<Partial<Material> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filterType ? materials.filter(m => m.type === filterType) : materials;

  async function uploadFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setError(data.error ?? "Erro no upload"); return; }
    setEditing(v => ({ ...v, fileUrl: data.url, fileSize: data.size }));
  }

  async function save() {
    if (!editing?.title?.trim()) return;
    setSaving(true);
    setError("");
    const isNew = !editing.id;
    const res = await fetch("/api/admin/materiais", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }
    const saved = await res.json();
    if (isNew) setMaterials(m => [saved, ...m]);
    else setMaterials(m => m.map(x => x.id === saved.id ? saved : x));
    setEditing(null);
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Remover este material?")) return;
    await fetch("/api/admin/materiais", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMaterials(m => m.filter(x => x.id !== id));
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">Todos os tipos</option>
          <option value="PDF">PDF</option>
          <option value="VIDEO">Vídeo</option>
          <option value="LINK">Link</option>
          <option value="TEXTO">Texto</option>
        </select>
        <button onClick={() => setEditing({ ...empty })}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Novo material
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-white/5 bg-white/3">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum material encontrado</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/3">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Título</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Matéria</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tamanho</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Premium</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(m => {
                const subjectName = subjects.find(s => s.id === m.subjectId)?.name;
                return (
                  <tr key={m.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{TYPE_ICONS[m.type]}</span>
                        <span className="font-medium">{m.title}</span>
                        {m.fileUrl && (
                          <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-400">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {m.description && <p className="text-xs text-gray-600 mt-0.5 ml-6">{m.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{m.type}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{subjectName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{fmtSize(m.fileSize)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.isPremium ? "bg-yellow-500/10 text-yellow-400" : "bg-white/5 text-gray-600"}`}>
                        {m.isPremium ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setEditing({ ...m })} className="text-gray-600 hover:text-indigo-400 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(m.id)} className="text-gray-700 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="font-semibold">{editing.id ? "Editar material" : "Novo material"}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo *</label>
                <select value={editing.type ?? "PDF"} onChange={e => setEditing(v => ({ ...v, type: e.target.value as Material["type"] }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="PDF">PDF</option>
                  <option value="VIDEO">Vídeo</option>
                  <option value="LINK">Link</option>
                  <option value="TEXTO">Texto</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Título *</label>
                <input value={editing.title ?? ""} onChange={e => setEditing(v => ({ ...v, title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Apostila de Direito Constitucional" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                <textarea value={editing.description ?? ""} onChange={e => setEditing(v => ({ ...v, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Breve descrição do conteúdo" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Matéria</label>
                <select value={editing.subjectId ?? ""} onChange={e => setEditing(v => ({ ...v, subjectId: e.target.value || null }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Nenhuma</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Banca</label>
                <input value={editing.banca ?? ""} onChange={e => setEditing(v => ({ ...v, banca: e.target.value || null }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: CESPE, FGV..." />
              </div>

              {/* Upload / URL */}
              {editing.type === "PDF" || editing.type === "VIDEO" ? (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Arquivo</label>
                  {editing.fileUrl ? (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-xs text-green-400 truncate flex-1">{editing.fileUrl.split("/").pop()}</span>
                      <button onClick={() => setEditing(v => ({ ...v, fileUrl: null, fileSize: null }))}
                        className="text-gray-500 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500/50 transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Clique para fazer upload</p>
                          <p className="text-xs text-gray-700 mt-0.5">PDF, MP4, WebM</p>
                        </>
                      )}
                    </div>
                  )}
                  <input ref={fileRef} type="file"
                    accept={editing.type === "PDF" ? ".pdf" : ".mp4,.webm"}
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">URL</label>
                  <input value={editing.fileUrl ?? ""} onChange={e => setEditing(v => ({ ...v, fileUrl: e.target.value || null }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="https://..." />
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(v => ({ ...v, isPremium: !v?.isPremium }))}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    editing.isPremium ? "bg-yellow-500" : "bg-white/10"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                    editing.isPremium ? "left-5" : "left-0.5"
                  )} />
                </button>
                <span className="text-sm text-gray-400">Conteúdo premium</span>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || uploading || !editing.title?.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
