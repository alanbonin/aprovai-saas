"use client";
import { useState, useEffect, useCallback } from "react";
import { User, BookOpen, Target, Zap, Flame, Trophy, Check, Edit2, X, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject { id: string; name: string; categoria: string | null; }
interface Level { name: string; min: number; color: string; }

interface PerfilData {
  name: string;
  email: string;
  cargo: string;
  orgao: string;
  dataProva: string | null;
  dificuldades: string;
  streak: number;
  xp: number;
  level: Level;
  nextLevel: Level | null;
  levelProgress: number;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  totalSimulados: number;
  enrolledSubjectIds: string[];
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso + "T00:00:00").getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function PerfilPage() {
  const [data, setData]         = useState<PerfilData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [savingSubj, setSavingSubj] = useState(false);
  const [error, setError]       = useState("");

  // Editable fields
  const [cargo, setCargo]       = useState("");
  const [orgao, setOrgao]       = useState("");
  const [dataProva, setDataProva] = useState("");
  const [dificuldades, setDificuldades] = useState("");
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [perfilRes, subjectsRes] = await Promise.all([
      fetch("/api/perfil"),
      fetch("/api/subjects"),
    ]);
    const perfilData = await perfilRes.json() as PerfilData;
    const subjectsData = await subjectsRes.json();
    setData(perfilData);
    setSubjects(subjectsData.subjects ?? []);
    setCargo(perfilData.cargo ?? "");
    setOrgao(perfilData.orgao ?? "");
    setDataProva(perfilData.dataProva ?? "");
    setDificuldades(perfilData.dificuldades ?? "");
    setEnrolledIds(perfilData.enrolledSubjectIds ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cargo, orgao, dataProva: dataProva || null, dificuldades }),
    });
    if (!res.ok) { setError("Erro ao salvar"); setSaving(false); return; }
    setData(d => d ? { ...d, cargo, orgao, dataProva: dataProva || null, dificuldades } : d);
    setEditing(false);
    setSaving(false);
  }

  async function saveSubjects() {
    setSavingSubj(true);
    await fetch("/api/workspace/materias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectIds: enrolledIds }),
    });
    setData(d => d ? { ...d, enrolledSubjectIds: enrolledIds } : d);
    setSavingSubj(false);
  }

  function toggleSubject(id: string) {
    setEnrolledIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // Group subjects by categoria
  const grouped: Record<string, Subject[]> = {};
  for (const s of subjects) {
    const cat = s.categoria ?? "Outras";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return null;

  const days = daysUntil(data.dataProva);
  const subjectsChanged = JSON.stringify([...enrolledIds].sort()) !== JSON.stringify([...data.enrolledSubjectIds].sort());

  return (
    <div className="p-6 max-w-3xl mx-auto text-white space-y-5">
      {/* Header card */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{data.name || "Aluno"}</h1>
            <p className="text-gray-500 text-sm truncate">{data.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: data.level.color + "20", color: data.level.color }}>
                {data.level.name}
              </span>
              <span className="text-xs text-gray-500">{data.xp} XP</span>
            </div>
          </div>
        </div>

        {/* XP bar */}
        {data.nextLevel && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{data.level.name}</span>
              <span>{data.nextLevel.name} em {data.nextLevel.min - data.xp} XP</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${data.levelProgress}%`, background: data.level.color }} />
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Questões",    value: data.totalAnswered, icon: Target, color: "text-blue-400" },
          { label: "% Acerto",   value: `${data.accuracy}%`, icon: TrendingUp, color: data.accuracy >= 70 ? "text-green-400" : data.accuracy >= 50 ? "text-amber-400" : "text-red-400" },
          { label: "Sequência",  value: `${data.streak}d`, icon: Flame, color: "text-orange-400" },
          { label: "Simulados",  value: data.totalSimulados, icon: Trophy, color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-white/5 border border-white/5 p-4 text-center">
            <Icon className={cn("w-4 h-4 mx-auto mb-1.5", color)} />
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Profile info */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" /> Perfil do Concurseiro
          </h2>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="text-xs text-gray-500 hover:text-indigo-400 flex items-center gap-1 transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)}
                className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
              <button onClick={saveProfile} disabled={saving}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Cargo alvo", value: data.cargo },
              { label: "Órgão",      value: data.orgao },
              { label: "Data da prova", value: fmtDate(data.dataProva) },
              { label: "Dificuldades", value: data.dificuldades },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">{label}</p>
                <p className={cn("text-sm", value ? "text-gray-200" : "text-gray-600 italic")}>
                  {value || "Não informado"}
                </p>
              </div>
            ))}
            {days !== null && (
              <div className="sm:col-span-2">
                <p className={cn("text-sm font-semibold",
                  days <= 7 ? "text-red-400" : days <= 30 ? "text-amber-400" : "text-green-400"
                )}>
                  {days > 0 ? `⏳ ${days} dias até a prova` : days === 0 ? "🎯 Hoje é o dia da prova!" : "📌 Prova já realizada"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cargo alvo</label>
                <input value={cargo} onChange={e => setCargo(e.target.value)}
                  placeholder="Ex: Auditor Fiscal"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Órgão</label>
                <input value={orgao} onChange={e => setOrgao(e.target.value)}
                  placeholder="Ex: Receita Federal"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data da prova</label>
              <input type="date" value={dataProva} onChange={e => setDataProva(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dificuldades / foco</label>
              <input value={dificuldades} onChange={e => setDificuldades(e.target.value)}
                placeholder="Ex: Direito Administrativo, Matemática"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>
        )}
      </div>

      {/* Subjects */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" /> Matérias inscritas
            <span className="text-xs text-gray-600">({enrolledIds.length})</span>
          </h2>
          {subjectsChanged && (
            <button onClick={saveSubjects} disabled={savingSubj}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1">
              <Check className="w-3 h-3" /> {savingSubj ? "Salvando…" : "Salvar seleção"}
            </button>
          )}
        </div>

        {subjects.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma matéria disponível.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, subs]) => (
              <div key={cat}>
                <h3 className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">{cat}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {subs.map(s => {
                    const isEnrolled = enrolledIds.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleSubject(s.id)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition-all",
                          isEnrolled
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-white/5 bg-white/3 text-gray-500 hover:text-gray-300 hover:bg-white/5"
                        )}>
                        <div className={cn("w-4 h-4 rounded flex items-center justify-center flex-shrink-0",
                          isEnrolled ? "bg-emerald-500" : "bg-white/10")}>
                          {isEnrolled && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
