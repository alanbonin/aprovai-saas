"use client";
import { useState, useRef } from "react";
import {
  Plus, Edit2, X, Check, FileText, Link as LinkIcon, Video,
  BookOpen, Upload, Loader2, ExternalLink, Sparkles,
  ChevronDown, Download, Trash2,
} from "lucide-react";
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
  PDF:   <FileText className="w-3.5 h-3.5" />,
  VIDEO: <Video    className="w-3.5 h-3.5" />,
  LINK:  <LinkIcon className="w-3.5 h-3.5" />,
  TEXTO: <BookOpen className="w-3.5 h-3.5" />,
};

const TIPOS_MATERIAL = [
  { id: "apostila",      label: "Apostila Completa",     desc: "Do básico ao avançado, progressivo" },
  { id: "resumo",        label: "Resumo",                desc: "Pontos principais, conciso" },
  { id: "mapa_conceitos",label: "Mapa de Conceitos",     desc: "Conceitos interligados com relações" },
  { id: "exercicios",    label: "Lista de Exercícios",   desc: "Questões com gabarito comentado" },
];

const BANCAS = ["CESPE/CEBRASPE", "FGV", "VUNESP", "FCC", "IBFC", "CODEPE", "QUADRIX", "IDECAN", "NC-UFPR"];

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const emptyUpload = { title: "", description: "", type: "PDF" as const, subjectId: "", banca: "", fileUrl: "", isPremium: false };

export function MateriaisAdmin({ materials: initial, subjects }: Props) {
  const [materials, setMaterials] = useState(initial);
  const [tab, setTab] = useState<"lista" | "gerar" | "upload">("lista");

  // Upload manual
  const [editing, setEditing] = useState<Partial<Material> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Geração IA
  const [gerarForm, setGerarForm] = useState({
    subjectId: subjects[0]?.id ?? "",
    cargo: "",
    banca: "",
    topico: "",
    tipo: "apostila",
  });
  const [gerando, setGerando] = useState(false);
  const [gerarError, setGerarError] = useState("");
  const [geradoMaterial, setGeradoMaterial] = useState<Material | null>(null);

  // Filter
  const [filterType, setFilterType] = useState("");

  const filtered = filterType ? materials.filter(m => m.type === filterType) : materials;

  // ── Upload de arquivo ─────────────────────────────────────────────────────
  async function uploadFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setUploadError(data.error ?? "Erro no upload"); return; }
    setEditing(v => ({ ...v, fileUrl: data.url, fileSize: data.size }));
  }

  async function saveMaterial() {
    if (!editing?.title?.trim()) return;
    setSaving(true);
    setUploadError("");
    const isNew = !editing.id;
    const res = await fetch("/api/admin/materiais", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!res.ok) {
      const d = await res.json();
      setUploadError(d.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }
    const saved = await res.json() as Material;
    if (isNew) setMaterials(m => [saved, ...m]);
    else setMaterials(m => m.map(x => x.id === saved.id ? saved : x));
    setEditing(null);
    setTab("lista");
    setSaving(false);
  }

  async function removeMaterial(id: string) {
    if (!confirm("Remover este material?")) return;
    await fetch("/api/admin/materiais", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMaterials(m => m.filter(x => x.id !== id));
  }

  // ── Geração IA ────────────────────────────────────────────────────────────
  async function gerarComIA() {
    if (!gerarForm.subjectId) { setGerarError("Selecione uma matéria"); return; }
    setGerando(true);
    setGerarError("");
    setGeradoMaterial(null);

    const subject = subjects.find(s => s.id === gerarForm.subjectId);

    try {
      const res = await fetch("/api/admin/materiais/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: gerarForm.subjectId,
          subjectName: subject?.name ?? "",
          cargo: gerarForm.cargo || undefined,
          banca: gerarForm.banca || undefined,
          topico: gerarForm.topico || undefined,
          tipo: gerarForm.tipo,
        }),
      });

      const data = await res.json() as Material & { error?: string };
      if (!res.ok || data.error) {
        setGerarError(data.error ?? "Erro ao gerar material");
        return;
      }

      setGeradoMaterial(data);
      setMaterials(m => [data, ...m]);
    } catch (e) {
      setGerarError(e instanceof Error ? e.message : "Erro de conexão");
    } finally {
      setGerando(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 w-fit">
        {[
          { id: "lista",  label: "Biblioteca",    icon: <FileText className="w-3.5 h-3.5" /> },
          { id: "gerar",  label: "Gerar com IA",  icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: "upload", label: "Upload manual",  icon: <Upload   className="w-3.5 h-3.5" /> },
        ].map(aba => (
          <button
            key={aba.id}
            onClick={() => { setTab(aba.id as typeof tab); setGeradoMaterial(null); setGerarError(""); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === aba.id ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
            )}
          >
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      {/* ══ LISTA ══════════════════════════════════════════════════════════════ */}
      {tab === "lista" && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
              <option value="">Todos os tipos</option>
              <option value="PDF">PDF</option>
              <option value="VIDEO">Vídeo</option>
              <option value="LINK">Link</option>
            </select>
            <span className="text-xs text-gray-500 ml-auto">{filtered.length} materiais</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 rounded-xl border border-white/5 bg-white/[0.02]">
              <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">Nenhum material ainda</p>
              <p className="text-gray-600 text-sm">Use "Gerar com IA" para criar o primeiro</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.03]">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Material</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Matéria</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Banca</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Tamanho</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Premium</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(m => {
                    const subjectName = subjects.find(s => s.id === m.subjectId)?.name;
                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">{TYPE_ICONS[m.type]}</span>
                            <span className="font-medium text-sm">{m.title}</span>
                            {m.fileUrl && (
                              <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                                className="text-gray-600 hover:text-indigo-400 transition-colors">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {m.description && <p className="text-xs text-gray-600 mt-0.5 ml-6 line-clamp-1">{m.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{subjectName ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.banca ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{fmtSize(m.fileSize)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${m.isPremium ? "bg-yellow-500/10 text-yellow-400" : "bg-white/5 text-gray-600"}`}>
                            {m.isPremium ? "Sim" : "Não"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            {m.fileUrl && (
                              <a href={m.fileUrl} download target="_blank" rel="noopener noreferrer"
                                className="text-gray-600 hover:text-indigo-400 transition-colors">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button onClick={() => { setEditing({ ...m }); setTab("upload"); }}
                              className="text-gray-600 hover:text-indigo-400 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => removeMaterial(m.id)}
                              className="text-gray-700 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
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
        </>
      )}

      {/* ══ GERAR COM IA ═══════════════════════════════════════════════════════ */}
      {tab === "gerar" && (
        <div className="max-w-2xl">
          {!geradoMaterial ? (
            <>
              <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4 mb-6 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-300">
                  A IA gera um PDF profissional completo com a marca Aprovai360 — incluindo textos, tabelas comparativas,
                  destaques e questões práticas. Quanto mais detalhes você fornecer, mais personalizado será o material.
                </p>
              </div>

              <div className="space-y-4">
                {/* Matéria */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Matéria *</label>
                  <select
                    value={gerarForm.subjectId}
                    onChange={e => setGerarForm(f => ({ ...f, subjectId: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Selecione a matéria</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Tópico */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Tópico específico <span className="text-gray-600">(opcional — ex: Princípios constitucionais, Lavagem de dinheiro)</span>
                  </label>
                  <input
                    value={gerarForm.topico}
                    onChange={e => setGerarForm(f => ({ ...f, topico: e.target.value }))}
                    placeholder="Ex: Princípios da Administração Pública, LGPD — conceitos básicos..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Tipo de material */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Tipo de material</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIPOS_MATERIAL.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setGerarForm(f => ({ ...f, tipo: t.id }))}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all",
                          gerarForm.tipo === t.id
                            ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                            : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20"
                        )}
                      >
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cargo e Banca em linha */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Cargo alvo <span className="text-gray-600">(opcional)</span>
                    </label>
                    <input
                      value={gerarForm.cargo}
                      onChange={e => setGerarForm(f => ({ ...f, cargo: e.target.value }))}
                      placeholder="Ex: Analista Judiciário, Auditor..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Banca <span className="text-gray-600">(opcional)</span>
                    </label>
                    <select
                      value={gerarForm.banca}
                      onChange={e => setGerarForm(f => ({ ...f, banca: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Qualquer banca</option>
                      {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                {gerarError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <X className="w-4 h-4 flex-shrink-0" /> {gerarError}
                  </div>
                )}

                <button
                  onClick={gerarComIA}
                  disabled={gerando || !gerarForm.subjectId}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl font-medium transition-colors"
                >
                  {gerando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando PDF com IA... (pode levar 30-60s)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Gerar material em PDF
                    </>
                  )}
                </button>

                {gerando && (
                  <div className="text-center text-xs text-gray-500 space-y-1">
                    <p>A IA está criando o conteúdo e montando o PDF com a marca Aprovai360.</p>
                    <p>O arquivo ficará disponível na biblioteca assim que pronto.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Sucesso */
            <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-300 mb-1">PDF gerado com sucesso!</p>
                  <p className="text-sm text-gray-300 mb-3 leading-relaxed">{geradoMaterial.title}</p>
                  {geradoMaterial.description && (
                    <p className="text-xs text-gray-500 mb-4">{geradoMaterial.description}</p>
                  )}
                  <div className="flex gap-3">
                    {geradoMaterial.fileUrl && (
                      <a
                        href={geradoMaterial.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" /> Baixar PDF
                      </a>
                    )}
                    <button
                      onClick={() => { setGeradoMaterial(null); setGerarForm(f => ({ ...f, topico: "", cargo: "", banca: "" })); }}
                      className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-white/20 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      <Sparkles className="w-4 h-4" /> Gerar outro
                    </button>
                    <button
                      onClick={() => setTab("lista")}
                      className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-white/20 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Ver biblioteca
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ UPLOAD MANUAL ══════════════════════════════════════════════════════ */}
      {tab === "upload" && (
        <div className="max-w-lg">
          <p className="text-sm text-gray-400 mb-5">
            Faça upload de um PDF ou vídeo seu, ou adicione um link externo.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tipo *</label>
              <select value={editing?.type ?? "PDF"} onChange={e => setEditing(v => ({ ...v ?? emptyUpload, type: e.target.value as Material["type"] }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                <option value="PDF">PDF</option>
                <option value="VIDEO">Vídeo</option>
                <option value="LINK">Link externo</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Título *</label>
              <input value={editing?.title ?? ""} onChange={e => setEditing(v => ({ ...v ?? emptyUpload, title: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="Ex: Apostila de Direito Constitucional" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Descrição</label>
              <textarea value={editing?.description ?? ""} onChange={e => setEditing(v => ({ ...v ?? emptyUpload, description: e.target.value }))}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                placeholder="Breve descrição do conteúdo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Matéria</label>
                <select value={editing?.subjectId ?? ""} onChange={e => setEditing(v => ({ ...v ?? emptyUpload, subjectId: e.target.value || null }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Nenhuma</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Banca</label>
                <select value={editing?.banca ?? ""} onChange={e => setEditing(v => ({ ...v ?? emptyUpload, banca: e.target.value || null }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Nenhuma</option>
                  {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            {/* Arquivo ou URL */}
            {(editing?.type ?? "PDF") !== "LINK" ? (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Arquivo</label>
                {editing?.fileUrl ? (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-xs text-green-400 truncate flex-1">{editing.fileUrl.split("/").pop()}</span>
                    <button onClick={() => setEditing(v => ({ ...v ?? emptyUpload, fileUrl: null, fileSize: null }))}
                      className="text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 transition-colors">
                    {uploading
                      ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
                      : <>
                          <Upload className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Clique para fazer upload</p>
                          <p className="text-xs text-gray-700 mt-0.5">PDF ou MP4/WebM</p>
                        </>
                    }
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.mp4,.webm" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">URL</label>
                <input value={editing?.fileUrl ?? ""} onChange={e => setEditing(v => ({ ...v ?? emptyUpload, fileUrl: e.target.value || null }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="https://..." />
              </div>
            )}

            {/* Premium toggle */}
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => setEditing(v => ({ ...v ?? emptyUpload, isPremium: !v?.isPremium }))}
                className={cn("relative w-10 h-5 rounded-full transition-colors", editing?.isPremium ? "bg-yellow-500" : "bg-white/10")}>
                <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                  editing?.isPremium ? "left-5" : "left-0.5")} />
              </button>
              <span className="text-sm text-gray-400">Conteúdo premium</span>
            </div>

            {uploadError && <p className="text-red-400 text-xs">{uploadError}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setEditing(null); setTab("lista"); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={saveMaterial} disabled={saving || uploading || !editing?.title?.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar material
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
