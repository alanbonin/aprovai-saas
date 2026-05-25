"use client";
import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Download, RefreshCw, X, Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Edital {
  id: string;
  titulo: string;
  orgao: string;
  cargo: string;
  area?: string | null;
  vagas?: number | null;
  salario?: number | null;
  salarioMax?: number | null;
  banca?: string | null;
  estado?: string | null;
  nivel: string;
  escolaridade?: string | null;
  status: string;
  descricao?: string | null;
  dataPublicacao?: string | null;
  dataInscricaoInicio?: string | null;
  dataInscricaoFim?: string | null;
  dataProva?: string | null;
  link?: string | null;
  editalUrl?: string | null;
  source: string;
  sourceRef?: string | null;
  isPremium: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  previsto:   { label: "Previsto",   color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  aberto:     { label: "Aberto",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  encerrado:  { label: "Encerrado",  color: "text-gray-500",    bg: "bg-white/5 border-white/10" },
  suspenso:   { label: "Suspenso",   color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  resultado:  { label: "Resultado",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
};

const AREAS = ["administrativa","ti","juridico","saude","policial","fiscal","educacao","engenharia","outros"];
const NIVEIS = ["federal","estadual","municipal"];
const ESCOLARIDADES = ["fundamental","medio","tecnico","superior","pos"];
const STATUSES = ["previsto","aberto","encerrado","suspenso","resultado"];

const EMPTY_FORM: Partial<Edital> = {
  titulo: "", orgao: "", cargo: "", area: "", vagas: undefined, salario: undefined, salarioMax: undefined,
  banca: "", estado: "", nivel: "federal", escolaridade: "", status: "previsto", descricao: "",
  dataPublicacao: "", dataInscricaoInicio: "", dataInscricaoFim: "", dataProva: "",
  link: "", editalUrl: "", source: "manual", isPremium: false, active: true,
};

export function EditaisAdmin({ editais: initialEditais }: { editais: Edital[] }) {
  const [editais, setEditais]           = useState<Edital[]>(initialEditais);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterArea, setFilterArea]     = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [editando, setEditando]         = useState<Edital | null>(null);
  const [form, setForm]                 = useState<Partial<Edital>>(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importQuery, setImportQuery]   = useState("concurso público edital inscrições");
  const [showImport, setShowImport]     = useState(false);

  const filtered = editais.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.titulo.toLowerCase().includes(q) || e.orgao.toLowerCase().includes(q) || e.cargo.toLowerCase().includes(q);
    const matchStatus = !filterStatus || e.status === filterStatus;
    const matchArea   = !filterArea   || e.area === filterArea;
    return matchSearch && matchStatus && matchArea;
  });

  function openCreate() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(e: Edital) {
    setEditando(e);
    setForm({ ...e });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditando(null);
  }

  async function save() {
    setSaving(true);
    try {
      if (editando) {
        await fetch("/api/admin/editais", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editando.id, ...form }),
        });
        setEditais(prev => prev.map(e => e.id === editando.id ? { ...e, ...form } as Edital : e));
      } else {
        const res = await fetch("/api/admin/editais", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const { data } = await fetch("/api/admin/editais?limit=1").then(r => r.json());
          // Reload page to get fresh data
          window.location.reload();
        }
      }
      cancelForm();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Desativar este edital?")) return;
    await fetch(`/api/admin/editais?id=${id}`, { method: "DELETE" });
    setEditais(prev => prev.filter(e => e.id !== id));
  }

  async function importar() {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/editais/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: importQuery, limite: 3 }),
      });
      const d = await res.json();
      setImportResult(d.message ?? (d.error ? `Erro: ${d.error}` : "Concluído"));
      if (d.inseridos > 0) window.location.reload();
    } catch (e) {
      setImportResult(`Erro: ${String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  const field = (key: keyof Edital, label: string, type = "text", opts?: string[]) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {opts ? (
        <select
          value={(form[key] as string) ?? ""}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">— selecione —</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={(form[key] as string | number) ?? ""}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar edital..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todos status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>)}
        </select>

        <select
          value={filterArea}
          onChange={e => setFilterArea(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todas áreas</option>
          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <button
          onClick={() => setShowImport(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-colors"
        >
          <Download className="w-4 h-4" /> Importar IA
        </button>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Edital
        </button>
      </div>

      {/* Import Panel */}
      {showImport && (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-white">Importar via Querido Diário + IA</p>
          <p className="text-xs text-gray-400">Busca no Diário Oficial federal/estadual e extrai editais automaticamente.</p>
          <div className="flex gap-3">
            <input
              value={importQuery}
              onChange={e => setImportQuery(e.target.value)}
              placeholder="Termo de busca..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={importar}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {importing ? "Importando..." : "Importar"}
            </button>
          </div>
          {importResult && (
            <p className={cn("text-sm", importResult.startsWith("Erro") ? "text-red-400" : "text-emerald-400")}>
              {importResult}
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-3">Edital</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Cargo</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Status</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Área</th>
              <th className="text-left px-4 py-3 hidden xl:table-cell">Inscrições até</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500">Nenhum edital encontrado</td></tr>
            )}
            {filtered.map(e => {
              const s = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.previsto;
              return (
                <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white line-clamp-1">{e.titulo}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{e.orgao} · {e.estado ?? e.nivel}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-300 line-clamp-1">{e.cargo}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border", s.color, s.bg)}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-400 capitalize">{e.area ?? "—"}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-gray-400">
                    {e.dataInscricaoFim ? new Date(e.dataInscricaoFim).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(e.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
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

      {/* Modal Criar/Editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={cancelForm}>
          <div
            className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold">{editando ? "Editar Edital" : "Novo Edital"}</h2>
              <button onClick={cancelForm} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">{field("titulo", "Título *")}</div>
              {field("orgao", "Órgão *")}
              {field("cargo", "Cargo(s) *")}
              {field("area", "Área", "text", AREAS)}
              {field("nivel", "Nível", "text", NIVEIS)}
              {field("estado", "Estado (sigla ou Federal)")}
              {field("status", "Status", "text", STATUSES)}
              {field("escolaridade", "Escolaridade mínima", "text", ESCOLARIDADES)}
              {field("banca", "Banca organizadora")}
              {field("vagas", "Vagas", "number")}
              {field("salario", "Salário inicial (R$)", "number")}
              {field("salarioMax", "Salário máximo (R$)", "number")}
              {field("dataPublicacao", "Data publicação", "date")}
              {field("dataInscricaoInicio", "Início inscrições", "date")}
              {field("dataInscricaoFim", "Fim inscrições", "date")}
              {field("dataProva", "Data prova", "date")}
              {field("link", "Link oficial")}
              {field("editalUrl", "URL do edital (PDF)")}
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <textarea
                  value={(form.descricao as string) ?? ""}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-300">Premium</label>
                <button
                  onClick={() => setForm(f => ({ ...f, isPremium: !f.isPremium }))}
                  className={cn("w-10 h-6 rounded-full transition-colors relative", form.isPremium ? "bg-indigo-600" : "bg-white/10")}
                >
                  <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-transform", form.isPremium ? "translate-x-5" : "translate-x-1")} />
                </button>
              </div>
            </div>

            <div className="p-5 border-t border-white/10 flex justify-end gap-3">
              <button onClick={cancelForm} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
              <button
                onClick={save}
                disabled={saving || !form.titulo || !form.orgao || !form.cargo}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
