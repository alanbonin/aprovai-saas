"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Check, ChevronDown, ChevronUp, Loader2, BookOpen, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARGOS, GRUPOS_AREA, buscarCargos, type Cargo, type AreaCargo } from "@/lib/cargos";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Subject {
  id: string;
  name: string;
  categoria: string | null;
  enrolled: boolean;
}

interface ProfileData {
  cargo?: string | null;
  orgao?: string | null;
  banca?: string | null;
  dataProva?: string | null;
  horasEstudo?: number | null;
}

interface PlanoData {
  profile: ProfileData;
  subjects: Subject[];
}

// ── Bancas ─────────────────────────────────────────────────────────────────────
const BANCAS = [
  { slug: "CESPE/CEBRASPE", label: "CESPE/CEBRASPE", emoji: "🎯" },
  { slug: "FCC",             label: "FCC",             emoji: "📋" },
  { slug: "FGV",             label: "FGV",             emoji: "🏛️" },
  { slug: "CESGRANRIO",      label: "CESGRANRIO",      emoji: "🏦" },
  { slug: "VUNESP",          label: "VUNESP",          emoji: "📝" },
  { slug: "IADES",           label: "IADES",           emoji: "🔍" },
  { slug: "QUADRIX",         label: "QUADRIX",         emoji: "📐" },
  { slug: "IDECAN",          label: "IDECAN",          emoji: "📌" },
];

const OPCOES_TEMPO = [
  { minutos: 30,  label: "30 min" },
  { minutos: 60,  label: "1h" },
  { minutos: 120, label: "2h" },
  { minutos: 180, label: "3h" },
  { minutos: 240, label: "4h+" },
];

// ── Component ──────────────────────────────────────────────────────────────────
export function MeuPlanoSection() {
  const [data, setData]       = useState<PlanoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // Cargo selector
  const [showCargo, setShowCargo]         = useState(false);
  const [cargoSearch, setCargoSearch]     = useState("");
  const [areaFiltro, setAreaFiltro]       = useState<AreaCargo | null>(null);
  const [cargoSelecionado, setCargoSelecionado] = useState<Cargo | null>(null);

  // Matérias: map de subjectId → enrolled
  const [enrolledMap, setEnrolledMap]     = useState<Record<string, boolean>>({});
  const [showSubjects, setShowSubjects]   = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");

  // Perfil local editável
  const [profile, setProfile] = useState<ProfileData>({});

  useEffect(() => {
    fetch("/api/meu-plano")
      .then(r => r.json())
      .then((d: PlanoData) => {
        setData(d);
        setProfile(d.profile ?? {});
        const map: Record<string, boolean> = {};
        for (const s of d.subjects ?? []) map[s.id] = s.enrolled;
        setEnrolledMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/meu-plano", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cargo: cargoSelecionado?.nome ?? profile.cargo,
          orgao: cargoSelecionado?.orgao ?? profile.orgao,
          banca: profile.banca,
          dataProva: profile.dataProva,
          horasEstudo: profile.horasEstudo,
          enrolledSubjectIds: Object.entries(enrolledMap)
            .filter(([, v]) => v)
            .map(([k]) => k),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }, [profile, enrolledMap, cargoSelecionado]);

  // Cargo search
  const cargosVisiveis = cargoSearch.trim().length >= 2
    ? buscarCargos(cargoSearch)
    : areaFiltro
      ? CARGOS.filter(c => c.area === areaFiltro)
      : CARGOS;

  // Matérias filtradas
  const subjectsFiltrados = (data?.subjects ?? []).filter(s =>
    !subjectSearch || s.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const enrolledCount = Object.values(enrolledMap).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#0ab5bd]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Cargo ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <p className="text-sm font-semibold text-white">Cargo alvo</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {cargoSelecionado?.nome ?? profile.cargo ?? "Não definido"}
            </p>
          </div>
          <button
            onClick={() => setShowCargo(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#0ab5bd] bg-[#0ab5bd]/10 border border-[#0ab5bd]/25 hover:bg-[#0ab5bd]/20 transition-all"
          >
            Trocar {showCargo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showCargo && (
          <div className="p-4 space-y-3 border-b border-white/5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={cargoSearch}
                onChange={e => { setCargoSearch(e.target.value); setAreaFiltro(null); }}
                placeholder="Buscar cargo ou órgão…"
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-[#0ab5bd]/60 placeholder-gray-600 transition-all"
              />
              {cargoSearch && (
                <button onClick={() => setCargoSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtros de área */}
            {!cargoSearch && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setAreaFiltro(null)}
                  className={cn("px-2 py-1 rounded-md text-xs border transition-all",
                    !areaFiltro ? "bg-[#0ab5bd]/20 border-[#0ab5bd]/40 text-[#0ab5bd]" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20")}
                >Todos</button>
                {GRUPOS_AREA.map(g => (
                  <button key={g.area} onClick={() => setAreaFiltro(g.area)}
                    className={cn("px-2 py-1 rounded-md text-xs border transition-all",
                      areaFiltro === g.area ? "bg-[#0ab5bd]/20 border-[#0ab5bd]/40 text-[#0ab5bd]" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20")}>
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
            )}

            {/* Lista */}
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
              {cargosVisiveis.map(c => {
                const grupo = GRUPOS_AREA.find(g => g.area === c.area);
                const isSelected = cargoSelecionado?.id === c.id;
                return (
                  <button key={c.id} onClick={() => { setCargoSelecionado(c); setShowCargo(false); setCargoSearch(""); }}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all",
                      isSelected ? "bg-[#0ab5bd]/15 border-[#0ab5bd]/50" : "bg-white/[0.02] border-white/8 hover:bg-white/5")}>
                    <span className="text-base flex-shrink-0">{grupo?.emoji ?? "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium truncate", isSelected ? "text-[#0ab5bd]" : "text-white")}>{c.nome}</p>
                      <p className="text-xs text-gray-600 truncate">{c.orgao}</p>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0ab5bd]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Banca + Data + Tempo ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-sm font-semibold text-white">Detalhes do concurso</p>
        </div>
        <div className="p-5 space-y-5">

          {/* Banca */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Banca examinadora</label>
            <div className="flex flex-wrap gap-2">
              {BANCAS.map(b => (
                <button key={b.slug} onClick={() => setProfile(p => ({ ...p, banca: b.slug }))}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all",
                    profile.banca === b.slug
                      ? "bg-[#0ab5bd]/20 border-[#0ab5bd]/50 text-[#0ab5bd]"
                      : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20")}>
                  {b.emoji} {b.label}
                </button>
              ))}
              <button onClick={() => setProfile(p => ({ ...p, banca: null }))}
                className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all",
                  !profile.banca ? "bg-white/10 border-white/25 text-gray-200" : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20")}>
                🤷 Não definida
              </button>
            </div>
          </div>

          {/* Data da prova */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Data da prova</label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={profile.dataProva ?? ""}
                onChange={e => setProfile(p => ({ ...p, dataProva: e.target.value || null }))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0ab5bd]/50 [color-scheme:dark] transition-all"
              />
              {profile.dataProva && (
                <button onClick={() => setProfile(p => ({ ...p, dataProva: null }))}
                  className="text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {!profile.dataProva && (
              <p className="text-xs text-gray-600 mt-1">Sem data definida — ritmo de estudo constante</p>
            )}
          </div>

          {/* Tempo de estudo */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Tempo de estudo por dia</label>
            <div className="flex flex-wrap gap-2">
              {OPCOES_TEMPO.map(o => (
                <button key={o.minutos} onClick={() => setProfile(p => ({ ...p, horasEstudo: Math.round(o.minutos / 60) || 1 }))}
                  className={cn("px-4 py-2 rounded-lg text-xs font-medium border transition-all",
                    profile.horasEstudo !== null && Math.round((profile.horasEstudo ?? 0)) === Math.round(o.minutos / 60) || (o.minutos === 240 && (profile.horasEstudo ?? 0) >= 4)
                      ? "bg-[#0ab5bd]/20 border-[#0ab5bd]/50 text-[#0ab5bd]"
                      : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20")}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Matérias ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
        <button
          onClick={() => setShowSubjects(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#0ab5bd]" />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Matérias do plano</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {enrolledCount} de {data?.subjects.length ?? 0} selecionadas
              </p>
            </div>
          </div>
          {showSubjects ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {showSubjects && (
          <div className="p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={subjectSearch}
                onChange={e => setSubjectSearch(e.target.value)}
                placeholder="Filtrar matérias…"
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-[#0ab5bd]/60 placeholder-gray-600"
              />
            </div>

            {/* Ações em lote */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const update = { ...enrolledMap };
                  for (const s of subjectsFiltrados) update[s.id] = true;
                  setEnrolledMap(update);
                }}
                className="text-xs text-[#0ab5bd] hover:text-[#0ab5bd]/80 transition-colors"
              >
                Selecionar todos
              </button>
              <span className="text-gray-700">•</span>
              <button
                onClick={() => {
                  const update = { ...enrolledMap };
                  for (const s of subjectsFiltrados) update[s.id] = false;
                  setEnrolledMap(update);
                }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Desmarcar todos
              </button>
            </div>

            {/* Lista */}
            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {subjectsFiltrados.map(s => {
                const grupo = GRUPOS_AREA.find(g => s.categoria?.includes(g.area) || g.area === s.categoria);
                const isOn = enrolledMap[s.id] ?? false;
                return (
                  <button
                    key={s.id}
                    onClick={() => setEnrolledMap(m => ({ ...m, [s.id]: !m[s.id] }))}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                      isOn
                        ? "bg-[#0ab5bd]/8 border-[#0ab5bd]/25"
                        : "bg-white/[0.02] border-white/8 hover:bg-white/5"
                    )}
                  >
                    {/* Toggle */}
                    <div className={cn(
                      "w-8 h-4.5 rounded-full border transition-all flex-shrink-0 relative",
                      isOn ? "bg-[#0ab5bd] border-[#0ab5bd]" : "bg-white/10 border-white/20"
                    )} style={{ height: "18px", minWidth: "32px" }}>
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
                        isOn ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium truncate", isOn ? "text-white" : "text-gray-400")}>
                        {s.name}
                      </p>
                    </div>
                    {grupo && <span className="text-xs text-gray-700 flex-shrink-0 hidden sm:block">{grupo.emoji}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Salvar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          Alterações no plano são aplicadas imediatamente após salvar.
        </p>
        <button
          onClick={save}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
            saved
              ? "bg-emerald-500 text-white"
              : "bg-[#0ab5bd] text-black hover:bg-[#09a3aa] disabled:opacity-50"
          )}
        >
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : saved
            ? <Check className="w-4 h-4" />
            : <RefreshCw className="w-4 h-4" />}
          {saved ? "Salvo!" : saving ? "Salvando…" : "Salvar plano"}
        </button>
      </div>
    </div>
  );
}
