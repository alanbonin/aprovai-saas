"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Star, BookOpen, Filter, RotateCcw, XCircle,
  ChevronRight, Play, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  banca: string | null;
  year: number | null;
  level: string | null;
  statement: string;
  answer: string;
  subjectId: string | null;
}

interface Subject {
  id: string;
  name: string;
  categoria: string | null;
}

const LEVEL_LABEL: Record<string, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

const LEVEL_COLOR: Record<string, string> = {
  facil: "text-green-400 bg-green-500/10 border-green-500/20",
  medio: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  dificil: "text-red-400 bg-red-500/10 border-red-500/20",
};

export function FavoritosInner() {
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [favIds, setFavIds]         = useState<number[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filterSubject, setFilterSubject] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [favsRes, subsRes] = await Promise.all([
        fetch("/api/questoes/favoritos"),
        fetch("/api/workspace/materias"),
      ]);
      if (!favsRes.ok) throw new Error("Falha ao carregar favoritos");
      const favsData = await favsRes.json();
      const subsData = subsRes.ok ? await subsRes.json() : {};
      const ids: number[] = favsData.favoritos ?? [];
      setFavIds(ids);
      setSubjects(subsData.subjects ?? []);

      if (ids.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      // Load all favorites (up to 100)
      const params = new URLSearchParams({ favoritos: "1", limit: "100" });
      const qRes = await fetch(`/api/questoes?${params}`);
      const qData = qRes.ok ? await qRes.json() : {};
      setQuestions(qData.questions ?? []);
    } catch {
      setFetchError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function removeFav(questionId: number) {
    setRemovingId(questionId);
    await fetch("/api/questoes/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action: "remove" }),
    }).catch(() => {});
    setFavIds(prev => prev.filter(id => id !== questionId));
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    setRemovingId(null);
  }

  // Filter questions by subject
  const filtered = filterSubject
    ? questions.filter(q => q.subjectId === filterSubject)
    : questions;

  // Build subject stats from current favorites
  const subjectCounts: Record<string, number> = {};
  for (const q of questions) {
    if (q.subjectId) subjectCounts[q.subjectId] = (subjectCounts[q.subjectId] ?? 0) + 1;
  }

  // Level counts
  const levelCounts: Record<string, number> = {};
  for (const q of questions) {
    const l = q.level ?? "unknown";
    levelCounts[l] = (levelCounts[l] ?? 0) + 1;
  }

  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name ?? id;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Carregando favoritos...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium mb-1">Não foi possível carregar seus favoritos</p>
          <p className="text-gray-500 text-sm mb-4">Verifique sua conexão e tente novamente.</p>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (favIds.length === 0) {
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto flex flex-col items-center justify-center">
        <Star className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-xl font-bold mb-2">Nenhum favorito ainda</h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          Marque questões com ⭐ durante os estudos para salvá-las aqui.
        </p>
        <Link
          href="/questoes"
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Ir para Questões
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            Favoritos
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {favIds.length} questão{favIds.length !== 1 ? "ões" : ""} salva{favIds.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {subjects.some(s => subjectCounts[s.id]) && (
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors",
                showFilter
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "border-white/10 text-gray-400 hover:text-white"
              )}
            >
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          )}
          <Link
            href="/questoes?favoritos=1"
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-sm font-semibold transition-colors"
          >
            <Play className="w-4 h-4" />
            Praticar todos
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl bg-white/5 border border-white/[0.06] p-4 text-center">
          <p className="text-2xl font-black text-yellow-400">{favIds.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        {(["facil", "medio", "dificil"] as const).map(level => (
          <div key={level} className="rounded-xl bg-white/5 border border-white/[0.06] p-4 text-center">
            <p className={cn("text-2xl font-black", LEVEL_COLOR[level].split(" ")[0])}>
              {levelCounts[level] ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{LEVEL_LABEL[level]}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      {showFilter && (
        <div className="mb-5 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs text-gray-500">Matéria:</label>
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="flex-1 min-w-48 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todas ({questions.length})</option>
              {subjects
                .filter(s => subjectCounts[s.id])
                .sort((a, b) => (subjectCounts[b.id] ?? 0) - (subjectCounts[a.id] ?? 0))
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({subjectCounts[s.id]})
                  </option>
                ))}
            </select>
            {filterSubject && (
              <button
                onClick={() => setFilterSubject("")}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subject breakdown chips */}
      {!showFilter && Object.keys(subjectCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {subjects
            .filter(s => subjectCounts[s.id])
            .slice(0, 8)
            .map(s => (
              <button
                key={s.id}
                onClick={() => setFilterSubject(filterSubject === s.id ? "" : s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  filterSubject === s.id
                    ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                    : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                )}
              >
                {s.name}
                <span className="ml-1.5 opacity-60">{subjectCounts[s.id]}</span>
              </button>
            ))}
        </div>
      )}

      {/* Questions list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <RotateCcw className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma questão nesta matéria</p>
          <button
            onClick={() => setFilterSubject("")}
            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
          >
            Ver todas
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, i) => (
            <div
              key={q.id}
              className="group rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/10 p-4 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Rank */}
                <span className="text-xs text-gray-700 font-mono w-6 flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {q.level && (
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        LEVEL_COLOR[q.level] ?? "text-gray-400 bg-white/5 border-white/10"
                      )}>
                        {LEVEL_LABEL[q.level] ?? q.level}
                      </span>
                    )}
                    {q.banca && (
                      <span className="text-[10px] text-indigo-400 font-medium">{q.banca}</span>
                    )}
                    {q.year && (
                      <span className="text-[10px] text-gray-600">{q.year}</span>
                    )}
                    {q.subjectId && (
                      <span className="text-[10px] text-gray-600 truncate">
                        {subjectName(q.subjectId)}
                      </span>
                    )}
                  </div>

                  {/* Statement preview */}
                  <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">
                    {q.statement}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/questoes?id=${q.id}`}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    title="Praticar esta questão"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => removeFav(q.id)}
                    disabled={removingId === q.id}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Remover dos favoritos"
                  >
                    {removingId === q.id
                      ? <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer CTA */}
      {filtered.length > 0 && (
        <div className="mt-8 text-center">
          <Link
            href={filterSubject
              ? `/questoes?favoritos=1&subjectId=${filterSubject}`
              : "/questoes?favoritos=1"
            }
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-bold transition-colors"
          >
            <Play className="w-4 h-4" />
            Praticar {filterSubject ? "esta matéria" : "todos os favoritos"}
          </Link>
        </div>
      )}
    </div>
  );
}
