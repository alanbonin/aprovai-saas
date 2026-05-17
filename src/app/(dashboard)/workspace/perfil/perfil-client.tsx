"use client";
import { useState } from "react";
import { ArrowLeft, Save, User, Target, Calendar, BookOpen, Flame, Zap, TrendingUp } from "lucide-react";
import { PushToggle } from "@/components/push-toggle";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  email: string;
  cargo: string;
  orgao: string;
  dataProva: string;
  dificuldades: string;
  streak: number;
  xp: number;
  levelName: string;
  levelColor: string;
  levelProgress: number;
  nextLevelName: string | null;
  totalQuestoes: number;
  accuracy: number;
}

export function PerfilClient({
  name, email,
  cargo: initCargo, orgao: initOrgao, dataProva: initDataProva, dificuldades: initDif,
  streak, xp, levelName, levelColor, levelProgress, nextLevelName,
  totalQuestoes, accuracy,
}: Props) {
  const [cargo, setCargo]           = useState(initCargo);
  const [orgao, setOrgao]           = useState(initOrgao);
  const [dataProva, setDataProva]   = useState(initDataProva);
  const [dificuldades, setDificuldades] = useState(initDif);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState("");

  // Conta-regressiva para a prova
  const daysToProva = dataProva
    ? Math.max(0, Math.ceil((new Date(dataProva).getTime() - Date.now()) / 86400000))
    : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/workspace/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cargo, orgao, dataProva: dataProva || null, dificuldades }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  const acuracyColor = accuracy >= 70 ? "text-green-400" : accuracy >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-[#080c18] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06] bg-[#0a0d14]">
        <a href="/workspace" className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div>
          <h1 className="font-bold text-sm">Meu Perfil</h1>
          <p className="text-[10px] text-gray-500">Atualize suas informações de estudo</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-xl mx-auto w-full space-y-4">

        {/* ── Card do usuário ── */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117] p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-400 text-2xl font-black">{name.charAt(0).toUpperCase() || "A"}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <p className="font-semibold text-sm truncate">{name || "Aluno"}</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{email}</p>
              <p className={cn("text-xs font-bold mt-1", levelColor)}>⭐ {levelName}</p>
            </div>
          </div>

          {/* Barra de XP */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>{xp.toLocaleString("pt-BR")} XP</span>
              {nextLevelName && <span>Próximo: {nextLevelName}</span>}
            </div>
            <div className="h-1.5 rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/4 border border-white/5 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] text-gray-500">Streak</span>
              </div>
              <p className="text-lg font-black text-orange-400">{streak}<span className="text-xs text-gray-600">d</span></p>
            </div>
            <div className="rounded-xl bg-white/4 border border-white/5 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-gray-500">Questões</span>
              </div>
              <p className="text-lg font-black text-blue-400">{totalQuestoes.toLocaleString("pt-BR")}</p>
            </div>
            <div className="rounded-xl bg-white/4 border border-white/5 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-gray-500">Acerto</span>
              </div>
              <p className={cn("text-lg font-black", acuracyColor)}>{accuracy}<span className="text-xs text-gray-600">%</span></p>
            </div>
          </div>

          {/* Countdown */}
          {daysToProva !== null && daysToProva >= 0 && (
            <div className={cn(
              "mt-3 rounded-xl px-4 py-2.5 flex items-center justify-between",
              daysToProva <= 7 ? "bg-red-500/8 border border-red-500/20" :
              daysToProva <= 30 ? "bg-amber-500/8 border border-amber-500/20" :
              "bg-indigo-500/8 border border-indigo-500/20"
            )}>
              <div className="flex items-center gap-2">
                <Calendar className={cn("w-3.5 h-3.5",
                  daysToProva <= 7 ? "text-red-400" : daysToProva <= 30 ? "text-amber-400" : "text-indigo-400"
                )} />
                <span className="text-xs text-gray-400">
                  {cargo ? `${cargo} — ` : ""}Prova em
                </span>
              </div>
              <span className={cn("text-sm font-bold tabular-nums",
                daysToProva <= 7 ? "text-red-400" : daysToProva <= 30 ? "text-amber-400" : "text-indigo-400"
              )}>
                {daysToProva} dia{daysToProva !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* XP badge */}
          <div className="mt-3 rounded-xl bg-yellow-500/6 border border-yellow-500/15 px-4 py-2 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-300">
              +1 XP por questão certa · +5 XP por simulado · +2 XP por flashcard revisado
            </p>
          </div>
        </div>

        {/* ── Formulário ── */}
        <form onSubmit={handleSave}>
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117] p-5 space-y-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Concurso</p>

            <div>
              <label className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                <Target className="w-3.5 h-3.5" /> Cargo pretendido
              </label>
              <input
                value={cargo}
                onChange={e => setCargo(e.target.value)}
                placeholder="Ex: Auditor Fiscal, Delegado, Analista Judiciário, Técnico INSS..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                <Target className="w-3.5 h-3.5" /> Órgão / Instituição
              </label>
              <input
                value={orgao}
                onChange={e => setOrgao(e.target.value)}
                placeholder="Ex: Receita Federal, TJSP, Polícia Civil BA, INSS..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data da prova
              </label>
              <input
                type="date"
                value={dataProva}
                onChange={e => setDataProva(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Principais dificuldades
              </label>
              <textarea
                value={dificuldades}
                onChange={e => setDificuldades(e.target.value)}
                rows={3}
                placeholder="Ex: Direito Penal, interpretação de textos..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all mt-4"
            style={{
              background: saved ? "rgba(52,211,153,0.15)" : "linear-gradient(135deg,#6366f1,#7c3aed)",
              border: saved ? "1px solid rgba(52,211,153,0.3)" : "none",
              color: saved ? "#34d399" : "#fff",
              opacity: saving ? 0.7 : 1,
              boxShadow: saved ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
            }}
          >
            {saved ? (
              <><span>✓</span> Salvo com sucesso!</>
            ) : saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando…</>
            ) : (
              <><Save className="w-4 h-4" /> Salvar alterações</>
            )}
          </button>
        </form>

        {/* ── Notificações Push ── */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lembretes</h2>
          <PushToggle />
        </div>
      </div>
    </div>
  );
}
