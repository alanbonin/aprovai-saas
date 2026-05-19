"use client";
import { useState, useEffect } from "react";
import { FileText, Video, Link as LinkIcon, BookOpen, Download, Lock, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Material {
  id: string;
  title: string;
  description: string | null;
  type: string;
  banca: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  isPremium: boolean;
  subjectId: string | null;
}

interface Subject { id: string; name: string; }

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  PDF: { icon: FileText, label: "PDF", color: "text-red-400" },
  VIDEO: { icon: Video, label: "Vídeo", color: "text-blue-400" },
  LINK: { icon: LinkIcon, label: "Link", color: "text-green-400" },
  APOSTILA: { icon: BookOpen, label: "Apostila", color: "text-yellow-400" },
};

const TYPES = Object.keys(TYPE_CONFIG);

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MateriaisInner() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterType, setFilterType]       = useState("");
  const [filterBanca, setFilterBanca]     = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [search, setSearch]               = useState("");

  useEffect(() => {
    fetch("/api/workspace/materias")
      .then(r => r.json())
      .then(d => setSubjects(d.subjects ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType)    params.set("type", filterType);
      if (filterBanca)   params.set("banca", filterBanca);
      if (filterSubject) params.set("subjectId", filterSubject);
      const res = await fetch(`/api/materiais?${params}`);
      const data = await res.json();
      setMaterials(data.materials ?? []);
      setLoading(false);
    }
    load();
  }, [filterType, filterBanca, filterSubject]);

  const filtered = materials.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase()) ||
    (m.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-white p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Materiais de Estudo</h1>
        <p className="text-gray-500 text-sm mt-0.5">PDFs, apostilas, vídeos e links para seu concurso</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar materiais..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todos os tipos</option>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
        </select>
        <select
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todas as matérias</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={filterBanca}
          onChange={e => setFilterBanca(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todas as bancas</option>
          {["CESPE", "FGV", "VUNESP", "FCC", "IBFC"].map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum material encontrado</p>
          <p className="text-gray-600 text-sm mt-1">
            {materials.length === 0 ? "Os materiais serão adicionados em breve" : "Tente outros filtros"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(m => {
            const config = TYPE_CONFIG[m.type] ?? TYPE_CONFIG.PDF;
            const Icon = config.icon;
            return (
              <div key={m.id} className={cn(
                "rounded-xl border p-4 flex items-start gap-3 transition-colors",
                m.isPremium
                  ? "border-yellow-500/20 bg-yellow-500/5"
                  : "border-white/5 bg-white/3 hover:bg-white/5"
              )}>
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5", config.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium leading-tight flex-1">{m.title}</p>
                    {m.isPremium && (
                      <span className="flex items-center gap-0.5 text-yellow-500 text-xs font-medium flex-shrink-0">
                        <Lock className="w-3 h-3" />
                        Premium
                      </span>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {m.banca && (
                      <span className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400">
                        {m.banca}
                      </span>
                    )}
                    {m.fileSize && (
                      <span className="text-xs text-gray-600">{formatSize(m.fileSize)}</span>
                    )}
                    {m.fileUrl && (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Acessar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
