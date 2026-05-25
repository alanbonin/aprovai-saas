"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Radar, Star, Search, Filter, MapPin, Users, DollarSign,
  Calendar, ExternalLink, FileText, Clock, Loader2, ChevronDown, X, Bookmark
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────
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
  isPremium: boolean;
  isFavorito: boolean;
  relevante: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  previsto:  { label: "Previsto",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",     dot: "bg-amber-400" },
  aberto:    { label: "Aberto",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400 animate-pulse" },
  encerrado: { label: "Encerrado", color: "text-gray-500",    bg: "bg-white/5 border-white/10",              dot: "bg-gray-600" },
  suspenso:  { label: "Suspenso",  color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         dot: "bg-red-400" },
  resultado: { label: "Resultado", color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",       dot: "bg-blue-400" },
};

const AREAS = ["administrativa","ti","juridico","saude","policial","fiscal","educacao","engenharia","outros"];
const NIVEIS = ["federal","estadual","municipal"];
const ESCOLARIDADES = ["fundamental","medio","tecnico","superior","pos"];
const STATUSES = ["previsto","aberto","encerrado","suspenso","resultado"];

function fmt(val?: string | null) {
  if (!val) return null;
  return new Date(val).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSalario(s?: number | null, max?: number | null) {
  if (!s) return null;
  const f = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return max && max > s ? `${f(s)} – ${f(max)}` : f(s);
}

// ─── Edital Card ───────────────────────────────────────────────────────────────
function EditalCard({ edital, onFavoritar }: { edital: Edital; onFavoritar: (id: string) => void }) {
  const s = STATUS_CONFIG[edital.status] ?? STATUS_CONFIG.previsto;
  const salario = fmtSalario(edital.salario, edital.salarioMax);
  const diasFim = edital.dataInscricaoFim
    ? Math.ceil((new Date(edital.dataInscricaoFim).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className={cn(
      "bg-white/[0.03] border rounded-xl p-5 hover:bg-white/[0.05] transition-all relative",
      edital.relevante ? "border-indigo-500/30" : "border-white/[0.08]"
    )}>
      {edital.relevante && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-semibold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-2 py-0.5">
            Relevante
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 pr-20">
        <div className={cn("w-2 h-2 rounded-full shrink-0 mt-2", s.dot)} />
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">{edital.titulo}</h3>
          <p className="text-xs text-gray-400 mt-1">{edital.orgao}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className={cn("text-xs px-2 py-0.5 rounded-full border", s.color, s.bg)}>{s.label}</span>
        {edital.area && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-gray-400 capitalize">{edital.area}</span>
        )}
        {edital.banca && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-gray-400 uppercase">{edital.banca}</span>
        )}
        {edital.isPremium && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10">Premium</span>
        )}
      </div>

      <p className="text-xs text-gray-300 mt-3 line-clamp-2">{edital.cargo}</p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {edital.vagas && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Users className="w-3 h-3 text-gray-500" />
            <span>{edital.vagas.toLocaleString("pt-BR")} vagas</span>
          </div>
        )}
        {salario && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <DollarSign className="w-3 h-3 text-gray-500" />
            <span className="truncate">{salario}</span>
          </div>
        )}
        {edital.estado && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin className="w-3 h-3 text-gray-500" />
            <span>{edital.estado}</span>
          </div>
        )}
        {edital.dataProva && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="w-3 h-3 text-gray-500" />
            <span>Prova: {fmt(edital.dataProva)}</span>
          </div>
        )}
      </div>

      {edital.dataInscricaoFim && edital.status === "aberto" && (
        <div className={cn(
          "mt-3 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2",
          diasFim !== null && diasFim <= 5  ? "bg-red-500/10 text-red-400" :
          diasFim !== null && diasFim <= 15 ? "bg-amber-500/10 text-amber-400" :
          "bg-white/5 text-gray-400"
        )}>
          <Clock className="w-3 h-3" />
          {diasFim !== null && diasFim > 0
            ? `Inscrições até ${fmt(edital.dataInscricaoFim)} (${diasFim}d)`
            : `Inscrições encerradas em ${fmt(edital.dataInscricaoFim)}`}
        </div>
      )}

      {edital.descricao && (
        <p className="text-xs text-gray-500 mt-3 line-clamp-2">{edital.descricao}</p>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
        <button
          onClick={() => onFavoritar(edital.id)}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all",
            edital.isFavorito
              ? "border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
              : "border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Star className={cn("w-3 h-3", edital.isFavorito && "fill-current")} />
          {edital.isFavorito ? "Favoritado" : "Favoritar"}
        </button>

        {edital.link && (
          <a
            href={edital.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Site oficial
          </a>
        )}
        {edital.editalUrl && (
          <a
            href={edital.editalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <FileText className="w-3 h-3" />
            PDF
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export function EditalWatchInner() {
  const [editais, setEditais]           = useState<Edital[]>([]);
  const [loading, setLoading]           = useState(true);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);

  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterArea, setFilterArea]     = useState("");
  const [filterNivel, setFilterNivel]   = useState("");
  const [filterEscol, setFilterEscol]   = useState("");
  const [soFavoritos, setSoFavoritos]   = useState(false);
  const [showFilters, setShowFilters]   = useState(false);

  const load = useCallback(async (p = 1, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "18" });
      if (search)       params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      if (filterArea)   params.set("area", filterArea);
      if (filterNivel)  params.set("nivel", filterNivel);
      if (filterEscol)  params.set("escolaridade", filterEscol);
      if (soFavoritos)  params.set("favoritos", "1");

      const res = await fetch(`/api/editais?${params}`);
      if (!res.ok) throw new Error("Falha");
      const data = await res.json();

      setEditais(prev => reset || p === 1 ? (data.editais ?? []) : [...prev, ...(data.editais ?? [])]);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterArea, filterNivel, filterEscol, soFavoritos]);

  useEffect(() => { load(1, true); }, [load]);

  async function toggleFavorito(editalId: string) {
    const res = await fetch(`/api/editais/${editalId}/favoritar`, { method: "POST" });
    if (res.ok) {
      const { favoritado } = await res.json();
      setEditais(prev => prev.map(e => e.id === editalId ? { ...e, isFavorito: favoritado } : e));
    }
  }

  const activeFilters = [filterStatus, filterArea, filterNivel, filterEscol].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Radar className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Radar de Editais</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading && editais.length === 0 ? "Carregando..." : `${total} concurso${total !== 1 ? "s" : ""} publicado${total !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(1, true)}
            placeholder="Buscar por cargo, órgão..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          onClick={() => setSoFavoritos(v => !v)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-colors",
            soFavoritos
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
          )}
        >
          <Bookmark className="w-4 h-4" />
          Favoritos
        </button>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-colors",
            showFilters || activeFilters > 0
              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
              : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
          )}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {activeFilters > 0 && (
            <span className="bg-indigo-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Status",       value: filterStatus, setter: setFilterStatus, opts: STATUSES.map(s => ({ v: s, l: STATUS_CONFIG[s]?.label ?? s })) },
            { label: "Área",         value: filterArea,   setter: setFilterArea,   opts: AREAS.map(a => ({ v: a, l: a })) },
            { label: "Nível",        value: filterNivel,  setter: setFilterNivel,  opts: NIVEIS.map(n => ({ v: n, l: n })) },
            { label: "Escolaridade", value: filterEscol,  setter: setFilterEscol,  opts: ESCOLARIDADES.map(e => ({ v: e, l: e })) },
          ].map(({ label, value, setter, opts }) => (
            <div key={label}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <select
                value={value}
                onChange={e => setter(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 capitalize"
              >
                <option value="">Todos</option>
                {opts.map(o => <option key={o.v} value={o.v} className="capitalize">{o.l}</option>)}
              </select>
            </div>
          ))}

          {activeFilters > 0 && (
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <button
                onClick={() => { setFilterStatus(""); setFilterArea(""); setFilterNivel(""); setFilterEscol(""); }}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading && editais.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : editais.length === 0 ? (
        <div className="text-center py-24">
          <Radar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhum edital encontrado</p>
          <p className="text-sm text-gray-600 mt-1">
            {soFavoritos ? "Você ainda não favoritou nenhum edital" : "Tente ajustar os filtros ou aguarde novas publicações"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {editais.map(e => (
              <EditalCard key={e.id} edital={e} onFavoritar={toggleFavorito} />
            ))}
          </div>

          {page < totalPages && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => load(page + 1)}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
