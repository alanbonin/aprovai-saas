"use client";
import { useState, useEffect, useRef } from "react";
import {
  CalendarDays, Sparkles, RefreshCw, Clock, ChevronDown, ChevronUp,
  CheckCircle, MessageSquare, Send, History, ChevronRight, X, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AjusteRecord, Cronograma } from "@/app/api/workspace/estrategia/route";

interface DaySubject {
  nome: string;
  horas: number;
  prioridade: "alta" | "media" | "baixa";
  dica: string;
}

interface DaySchedule {
  dia: string;
  materias: DaySubject[];
  totalHoras: number;
  folga?: boolean;
}

const PRIORITY_STYLE: Record<string, string> = {
  alta:  "bg-red-500/10 border-red-500/20 text-red-400",
  media: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  baixa: "bg-green-500/10 border-green-500/20 text-green-400",
};
const PRIORITY_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

// ── DayCard ───────────────────────────────────────────────────────────────────
function DayCard({ day, defaultOpen }: { day: DaySchedule; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (day.folga || day.materias.length === 0) {
    return (
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">😴</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-400">{day.dia}</p>
          <p className="text-xs text-gray-600">Dia de descanso — recupere as energias!</p>
        </div>
      </div>
    );
  }

  const doneCount = Object.values(checked).filter(Boolean).length;
  const allDone = doneCount === day.materias.length && day.materias.length > 0;

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all",
      allDone ? "bg-emerald-500/[0.04] border-emerald-500/15" : "bg-white/[0.03] border-white/[0.06]"
    )}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold",
          allDone ? "bg-emerald-500/15 text-emerald-400" : "bg-indigo-600/15 text-indigo-400"
        )}>
          {allDone ? <CheckCircle className="w-5 h-5" /> : day.dia.slice(0, 3)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{day.dia}</p>
          <p className="text-xs text-gray-500">
            {day.materias.length} matéria{day.materias.length !== 1 ? "s" : ""} · {day.totalHoras}h de estudo
            {doneCount > 0 && !allDone && ` · ${doneCount}/${day.materias.length} concluídas`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3" />{day.totalHoras}h
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04]">
          {day.materias.map((m, i) => {
            const done = checked[m.nome] ?? false;
            return (
              <div key={i} className={cn(
                "rounded-xl border p-3 transition-all",
                done ? "bg-emerald-500/[0.04] border-emerald-500/15 opacity-60" : "bg-white/[0.02] border-white/[0.04]"
              )}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setChecked(prev => ({ ...prev, [m.nome]: !done }))}
                    className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                      done ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-indigo-400"
                    )}
                  >
                    {done && <CheckCircle className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className={cn("text-sm font-semibold", done ? "line-through text-gray-600" : "text-white")}>
                        {m.nome}
                      </p>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", PRIORITY_STYLE[m.prioridade])}>
                        {PRIORITY_LABEL[m.prioridade]}
                      </span>
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{m.horas}h
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{m.dica}</p>
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

// ── AjustePanel ───────────────────────────────────────────────────────────────
function AjustePanel({
  onAjustar, ajustando, onClose,
}: {
  onAjustar: (motivo: string) => void;
  ajustando: boolean;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const exemplos = [
    "Tive muito trabalho essa semana, preciso de um plano mais leve",
    "Quero focar mais em Direito Administrativo pois é meu ponto fraco",
    "Preciso de mais tempo para revisar antes de um simulado no sábado",
    "Não consigo estudar às quartas, redistribua esse dia",
  ];

  return (
    <div className="rounded-2xl bg-indigo-950/50 border border-indigo-500/20 p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-indigo-300">Pedir ajuste à IA</span>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Explique o que você gostaria de ajustar no seu plano. A IA vai analisar seu perfil,
        histórico e seu pedido para adaptar a semana de forma inteligente.
      </p>

      {/* Exemplos rápidos */}
      <div className="flex flex-wrap gap-2 mb-3">
        {exemplos.map((ex, i) => (
          <button
            key={i}
            onClick={() => setMotivo(ex)}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-colors text-left"
          >
            {ex}
          </button>
        ))}
      </div>

      <textarea
        ref={textRef}
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        placeholder="Ex: Tive imprevistos na terça e quarta, preciso redistribuir essas horas..."
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500 mb-3"
      />

      <button
        onClick={() => motivo.trim() && onAjustar(motivo.trim())}
        disabled={ajustando || !motivo.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
      >
        {ajustando ? (
          <><RefreshCw className="w-4 h-4 animate-spin" /> Ajustando plano com IA...</>
        ) : (
          <><Send className="w-4 h-4" /> Ajustar plano</>
        )}
      </button>
    </div>
  );
}

// ── PlanoSemanalInner ─────────────────────────────────────────────────────────
export function PlanoSemanalInner() {
  const [cronograma, setCronograma] = useState<Cronograma | null>(null);
  const [ajustes, setAjustes] = useState<AjusteRecord[]>([]);
  const [isCurrentWeek, setIsCurrentWeek] = useState(true);

  // UI states
  const [loading, setLoading] = useState(true);         // carregando do servidor
  const [generating, setGenerating] = useState(false);  // gerando/ajustando
  const [showAjuste, setShowAjuste] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [error, setError] = useState("");
  const [resumoAjuste, setResumoAjuste] = useState("");  // feedback pós-ajuste

  // Config
  const [horasPorDia, setHorasPorDia] = useState(3);
  const [diasDisp, setDiasDisp] = useState<string[]>(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]);

  // Carrega (e auto-gera se necessário) na montagem
  useEffect(() => {
    loadOrGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOrGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspace/estrategia");
      const data = await res.json() as {
        cronograma: Cronograma | null;
        ajustes: AjusteRecord[];
        isCurrentWeek?: boolean;
      };

      if (data.cronograma && data.isCurrentWeek) {
        // Plano desta semana — usa direto
        setCronograma(data.cronograma);
        setAjustes(data.ajustes ?? []);
        setIsCurrentWeek(true);
        setLoading(false);
        return;
      }

      // Sem plano ou semana antiga → auto-gerar
      setLoading(false);
      await generate();
    } catch {
      setLoading(false);
      setError("Erro ao carregar plano. Tente novamente.");
    }
  }

  async function generate() {
    setGenerating(true);
    setError("");
    setResumoAjuste("");
    try {
      const res = await fetch("/api/workspace/estrategia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gerar", horasPorDia, diasDisp }),
      });
      const data = await res.json() as { cronograma?: Cronograma; ajustes?: AjusteRecord[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Erro ao gerar");
      setCronograma(data.cronograma ?? null);
      setAjustes(data.ajustes ?? []);
      setIsCurrentWeek(true);
      setShowConfig(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar plano");
    } finally {
      setGenerating(false);
    }
  }

  async function requestAjuste(motivo: string) {
    setGenerating(true);
    setError("");
    setResumoAjuste("");
    try {
      const res = await fetch("/api/workspace/estrategia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ajustar", motivo }),
      });
      const data = await res.json() as {
        cronograma?: Cronograma;
        ajustes?: AjusteRecord[];
        resumoMudancas?: string;
        error?: string;
      };
      if (!res.ok || data.error) throw new Error(data.error ?? "Erro ao ajustar");
      setCronograma(data.cronograma ?? null);
      setAjustes(data.ajustes ?? []);
      setResumoAjuste(data.resumoMudancas ?? "");
      setShowAjuste(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao ajustar plano");
    } finally {
      setGenerating(false);
    }
  }

  function toggleDia(dia: string) {
    setDiasDisp(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
  }

  // Ordena dias a partir de hoje
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" });
  const todayPt = today.charAt(0).toUpperCase() + today.slice(1).replace("-feira", "");
  const todayIdx = DIAS_SEMANA.findIndex(d => todayPt.toLowerCase().startsWith(d.toLowerCase().slice(0, 4)));
  const orderedDays = cronograma
    ? [...cronograma.semana].sort((a, b) => {
        const ai = DIAS_SEMANA.indexOf(a.dia);
        const bi = DIAS_SEMANA.indexOf(b.dia);
        return ((ai < todayIdx ? ai + 7 : ai) - (bi < todayIdx ? bi + 7 : bi));
      })
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" />
            Plano Semanal IA
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gerado automaticamente toda semana com base no seu perfil
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowConfig(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs font-medium transition-colors"
          >
            ⚙️ Config
          </button>
          <button
            onClick={generate}
            disabled={generating || loading}
            title="Regerar plano desta semana"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Regerar
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Configurar disponibilidade</h3>
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">
              Horas por dia: <span className="text-white font-bold">{horasPorDia}h</span>
            </label>
            <input type="range" min={1} max={8} value={horasPorDia}
              onChange={e => setHorasPorDia(Number(e.target.value))}
              className="w-full accent-indigo-500" />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>1h</span><span>8h</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Dias disponíveis</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {DIAS_SEMANA.map(dia => (
                <button key={dia} onClick={() => toggleDia(dia)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    diasDisp.includes(dia)
                      ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                      : "border-white/[0.06] text-gray-600 hover:border-white/15"
                  )}>
                  {dia}
                </button>
              ))}
            </div>
            <button onClick={generate} disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors">
              <Sparkles className="w-4 h-4" /> Gerar com essas configurações
            </button>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
          <X className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Loading inicial */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Carregando seu plano...</p>
        </div>
      )}

      {/* Gerando */}
      {generating && !loading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">
            {showAjuste ? "Ajustando seu plano com IA..." : "Gerando seu plano personalizado com IA..."}
          </p>
          <p className="text-gray-600 text-xs mt-1">Analisando seu perfil, matérias e histórico...</p>
        </div>
      )}

      {/* Plano */}
      {cronograma && !generating && !loading && (
        <>
          {/* Card de resumo */}
          <div className="rounded-2xl bg-indigo-600/[0.06] border border-indigo-500/15 p-5 mb-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-indigo-300 mb-1">{cronograma.metaSemanal}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{cronograma.resumo}</p>
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-2xl font-black text-indigo-400">{cronograma.horasTotais}h</p>
                <p className="text-[10px] text-gray-600">na semana</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-700">
                Gerado em {new Date(cronograma.geradoEm).toLocaleDateString("pt-BR", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
                {ajustes.length > 0 && ` · ${ajustes.length} ajuste${ajustes.length > 1 ? "s" : ""} feito${ajustes.length > 1 ? "s" : ""}`}
              </p>
              {!isCurrentWeek && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Semana anterior
                </span>
              )}
            </div>
          </div>

          {/* Feedback do último ajuste */}
          {resumoAjuste && (
            <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 p-4 mb-4 flex gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-300 mb-1">Plano ajustado com sucesso</p>
                <p className="text-xs text-gray-400 leading-relaxed">{resumoAjuste}</p>
              </div>
            </div>
          )}

          {/* Dias */}
          <div className="space-y-3 mb-5">
            {orderedDays.map((day, i) => (
              <DayCard key={day.dia} day={day} defaultOpen={i === 0} />
            ))}
          </div>

          {/* Barra de ações */}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAjuste(v => !v); setShowHistorico(false); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all",
                showAjuste
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Pedir ajuste à IA
            </button>

            {ajustes.length > 0 && (
              <button
                onClick={() => { setShowHistorico(v => !v); setShowAjuste(false); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                  showHistorico
                    ? "bg-white/5 border-white/20 text-gray-300"
                    : "border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20"
                )}
              >
                <History className="w-4 h-4" />
                Histórico ({ajustes.length})
              </button>
            )}
          </div>

          {/* Painel de ajuste */}
          {showAjuste && (
            <AjustePanel
              onAjustar={requestAjuste}
              ajustando={generating}
              onClose={() => setShowAjuste(false)}
            />
          )}

          {/* Histórico de ajustes */}
          {showHistorico && ajustes.length > 0 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 mt-4">
              <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Histórico de ajustes
              </p>
              <div className="space-y-3">
                {[...ajustes].reverse().map((a, i) => (
                  <div key={i} className="border-l-2 border-indigo-500/30 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-gray-600">{a.data}</span>
                      <ChevronRight className="w-3 h-3 text-gray-700" />
                      <span className="text-[10px] text-gray-500 italic truncate">"{a.motivo}"</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{a.resumoMudancas}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
