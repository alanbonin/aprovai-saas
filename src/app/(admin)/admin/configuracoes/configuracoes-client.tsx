"use client";

import { useState, useTransition } from "react";
import { CONFIG_DEFAULTS } from "@/lib/config-defaults";
import type { ConfigValue } from "@/lib/config-defaults";

/* ── Tipos ──────────────────────────────────────────────────────────────── */
interface Props {
  initialConfigs: Record<string, ConfigValue>;
}

type TabId = "gamificacao" | "trial" | "mentor" | "reativacao" | "limites" | "geral" | "crons" | "limpeza";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "gamificacao", label: "Gamificação e XP", icon: "🎮" },
  { id: "trial",       label: "Trial e Planos",   icon: "📅" },
  { id: "mentor",      label: "Mentor Proativo",  icon: "🤖" },
  { id: "reativacao",  label: "Reativação",        icon: "📧" },
  { id: "limites",     label: "Limites",           icon: "🔒" },
  { id: "geral",       label: "Geral",             icon: "⚙️" },
  { id: "crons",       label: "Cron Jobs",         icon: "🕐" },
  { id: "limpeza",     label: "Limpeza de Dados",  icon: "🗑️" },
];

const CRON_LIST = [
  { label: "Lembrete diário",      path: "/api/email/lembrete",            horario: CONFIG_DEFAULTS["cron.lembrete"],            desc: "Envia lembrete diário de estudos para alunos ativos" },
  { label: "Relatório semanal",    path: "/api/email/relatorio-semanal",   horario: CONFIG_DEFAULTS["cron.relatorio_semanal"],   desc: "Relatório semanal de progresso por email" },
  { label: "Reativação",           path: "/api/email/reativacao",          horario: CONFIG_DEFAULTS["cron.reativacao"],          desc: "Email de reativação para alunos inativos 7-30 dias" },
  { label: "Questão do dia",       path: "/api/email/questao-do-dia",      horario: CONFIG_DEFAULTS["cron.questao_do_dia"],      desc: "Envia uma questão diária por email" },
  { label: "Trial expirando",      path: "/api/email/trial-expirando",     horario: CONFIG_DEFAULTS["cron.trial_expirando"],     desc: "Aviso de trial a vencer" },
  { label: "Streak diário",        path: "/api/cron/streak",               horario: CONFIG_DEFAULTS["cron.streak"],              desc: "Reseta streaks de quem não estudou hoje" },
  { label: "Expirar assinaturas",  path: "/api/cron/expirar-assinaturas",  horario: CONFIG_DEFAULTS["cron.expirar_assinaturas"], desc: "Expira assinaturas vencidas" },
];

/* ── Limpeza de Dados ────────────────────────────────────────────────────── */
const OPERACOES = [
  {
    id: "cancelar_subs_teste",
    label: "Cancelar assinaturas de teste",
    desc: "Cancela assinaturas ACTIVE de planos pagos sem ID de pagamento Mercado Pago. Use antes do lançamento.",
    cor: "amber",
  },
  {
    id: "limpar_ai_uso",
    label: "Zerar uso de IA",
    desc: "Remove todos os registros de uso de IA (AiUsage). Os contadores voltarão a zero para todos os usuários.",
    cor: "orange",
  },
  {
    id: "limpar_reportes",
    label: "Limpar reportes de questões",
    desc: "Remove todos os reportes de questões pendentes. Use apenas para limpar dados de teste.",
    cor: "red",
  },
];

function LimpezaSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  async function executar(op: string) {
    if (!confirm(`Confirma a operação "${op}"? Esta ação não pode ser desfeita.`)) return;
    setLoading(op);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacao: op }),
      });
      const d = await res.json() as { ok?: boolean; error?: string; results?: Record<string, unknown> };
      if (!res.ok) {
        setResults(prev => ({ ...prev, [op]: `❌ ${d.error ?? "Erro desconhecido"}` }));
      } else {
        setResults(prev => ({ ...prev, [op]: `✅ ${JSON.stringify(d.results)}` }));
      }
    } catch {
      setResults(prev => ({ ...prev, [op]: "❌ Erro de conexão" }));
    }
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-red-500/[0.05] border border-red-500/20 p-4 mb-2">
        <p className="text-red-400 text-sm font-semibold">⚠️ Zona de perigo — operações irreversíveis</p>
        <p className="text-red-400/70 text-xs mt-1">Use apenas para limpar dados de teste antes do lançamento em produção. Cada operação requer confirmação.</p>
      </div>
      {OPERACOES.map(op => (
        <div key={op.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{op.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{op.desc}</p>
              {results[op.id] && (
                <p className="text-xs text-gray-400 mt-2 font-mono bg-white/[0.03] px-2 py-1 rounded">{results[op.id]}</p>
              )}
            </div>
            <button
              onClick={() => executar(op.id)}
              disabled={loading === op.id}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loading === op.id ? "Executando..." : "Executar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function parseList(val: unknown): string {
  if (Array.isArray(val)) return val.join(",");
  if (typeof val === "string") return val;
  return "";
}

function parseListToNumbers(str: string): number[] {
  return str.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

/* ── Hook de save ──────────────────────────────────────────────────────── */
function useSaveConfig() {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function save(key: string, value: ConfigValue) {
    try {
      const res = await fetch("/api/admin/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro");
      showToast(`✓ ${key} salvo`, "ok");
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "err");
    }
  }

  async function reset(key: string) {
    try {
      const res = await fetch(`/api/admin/system-config?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro");
      showToast(`${key} restaurado para o padrão`, "ok");
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "err");
    }
  }

  return { save, reset, pending, startTransition, toast };
}

/* ── Sub-componentes ──────────────────────────────────────────────────── */
function NumberField({
  label, configKey, value, onSave, onReset, hint,
}: {
  label: string;
  configKey: string;
  value: unknown;
  onSave: (key: string, value: ConfigValue) => void;
  onReset: (key: string) => void;
  hint?: string;
}) {
  const [local, setLocal] = useState(String(value ?? ""));
  const defaultVal = CONFIG_DEFAULTS[configKey as keyof typeof CONFIG_DEFAULTS];
  const isDirty = local !== String(defaultVal) && local !== String(value);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      {hint && <p className="text-xs text-amber-400/80">{hint}</p>}
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={local}
          onChange={e => setLocal(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm w-32 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => onSave(configKey, Number(local) as ConfigValue)}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={() => { setLocal(String(defaultVal)); onReset(configKey); }}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
        >
          Padrão
        </button>
        <span className="text-xs text-slate-500">padrão: {String(defaultVal)}</span>
      </div>
    </div>
  );
}

function ListField({
  label, configKey, value, onSave, onReset, hint,
}: {
  label: string;
  configKey: string;
  value: unknown;
  onSave: (key: string, value: ConfigValue) => void;
  onReset: (key: string) => void;
  hint?: string;
}) {
  const defaultVal = CONFIG_DEFAULTS[configKey as keyof typeof CONFIG_DEFAULTS];
  const [local, setLocal] = useState(parseList(value));

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      {hint && <p className="text-xs text-amber-400/80">{hint}</p>}
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="text"
          value={local}
          onChange={e => setLocal(e.target.value)}
          placeholder="ex: 3,7,14,30"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm w-52 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => onSave(configKey, parseListToNumbers(local) as unknown as ConfigValue)}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={() => { setLocal(parseList(defaultVal)); onReset(configKey); }}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
        >
          Padrão
        </button>
        <span className="text-xs text-slate-500">padrão: {parseList(defaultVal)}</span>
      </div>
    </div>
  );
}

function TextField({
  label, configKey, value, onSave, onReset, hint, type = "text",
}: {
  label: string;
  configKey: string;
  value: unknown;
  onSave: (key: string, value: ConfigValue) => void;
  onReset: (key: string) => void;
  hint?: string;
  type?: "text" | "email" | "url";
}) {
  const defaultVal = String(CONFIG_DEFAULTS[configKey as keyof typeof CONFIG_DEFAULTS] ?? "");
  const [local, setLocal] = useState(String(value ?? ""));

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      {hint && <p className="text-xs text-amber-400/80">{hint}</p>}
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type={type}
          value={local}
          onChange={e => setLocal(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm w-72 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => onSave(configKey, local as ConfigValue)}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={() => { setLocal(defaultVal); onReset(configKey); }}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
        >
          Padrão
        </button>
      </div>
    </div>
  );
}

function TextareaField({
  label, configKey, value, onSave, onReset, hint,
}: {
  label: string;
  configKey: string;
  value: unknown;
  onSave: (key: string, value: ConfigValue) => void;
  onReset: (key: string) => void;
  hint?: string;
}) {
  const [local, setLocal] = useState(String(value ?? ""));

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      {hint && <p className="text-xs text-amber-400/80">{hint}</p>}
      <textarea
        value={local}
        onChange={e => setLocal(e.target.value)}
        rows={3}
        placeholder="Vazio = sem banner"
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm w-full max-w-xl focus:outline-none focus:border-indigo-500 resize-none"
      />
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onSave(configKey, local as ConfigValue)}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={() => { setLocal(""); onReset(configKey); }}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}

function ToggleField({
  label, configKey, value, onSave, hint,
}: {
  label: string;
  configKey: string;
  value: unknown;
  onSave: (key: string, value: ConfigValue) => void;
  hint?: string;
}) {
  const [local, setLocal] = useState(Boolean(value));

  function toggle() {
    const next = !local;
    setLocal(next);
    onSave(configKey, next as ConfigValue);
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {hint && <p className="text-xs text-amber-400/80 mt-0.5">{hint}</p>}
      </div>
      <button
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${local ? "bg-indigo-600" : "bg-slate-700"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${local ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function SelectField({
  label, configKey, value, options, onSave, onReset,
}: {
  label: string;
  configKey: string;
  value: unknown;
  options: { value: string; label: string }[];
  onSave: (key: string, value: ConfigValue) => void;
  onReset: (key: string) => void;
}) {
  const defaultVal = String(CONFIG_DEFAULTS[configKey as keyof typeof CONFIG_DEFAULTS] ?? "");
  const [local, setLocal] = useState(String(value ?? defaultVal));

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <div className="flex gap-2 items-center">
        <select
          value={local}
          onChange={e => setLocal(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={() => onSave(configKey, local as ConfigValue)}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={() => { setLocal(defaultVal); onReset(configKey); }}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
        >
          Padrão
        </button>
      </div>
    </div>
  );
}

/* ── Seção Cron Jobs ────────────────────────────────────────────────────── */
function CronSection() {
  const [runStatus, setRunStatus] = useState<Record<string, { loading: boolean; result?: string; ok?: boolean }>>({});

  async function runCron(path: string) {
    setRunStatus(prev => ({ ...prev, [path]: { loading: true } }));
    try {
      const res = await fetch("/api/admin/run-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronPath: path }),
      });
      const data = await res.json();
      setRunStatus(prev => ({
        ...prev,
        [path]: {
          loading: false,
          ok: data.ok,
          result: data.ok
            ? `OK (${data.status}) — ${JSON.stringify(data.result).slice(0, 120)}`
            : `Erro ${data.status}: ${JSON.stringify(data.result ?? data.error).slice(0, 120)}`,
        },
      }));
    } catch (e) {
      setRunStatus(prev => ({ ...prev, [path]: { loading: false, ok: false, result: String(e) } }));
    }
  }

  return (
    <div className="space-y-3">
      {CRON_LIST.map(cron => {
        const s = runStatus[cron.path];
        return (
          <div key={cron.path} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{cron.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{cron.desc}</p>
                <p className="text-xs text-indigo-400 mt-1 font-mono">{cron.horario}</p>
                <p className="text-xs text-slate-500 font-mono">{cron.path}</p>
              </div>
              <button
                onClick={() => runCron(cron.path)}
                disabled={s?.loading}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-600/40 text-emerald-400 text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                {s?.loading ? (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : "▶"} Executar agora
              </button>
            </div>
            {s?.result && (
              <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-mono break-all ${s.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                {s.result}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────────────── */
export function ConfiguracoesClient({ initialConfigs }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("gamificacao");
  const { save, reset, toast } = useSaveConfig();

  const c = initialConfigs;

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Configurações do Sistema</h1>
          <p className="text-slate-400 text-sm mt-1">Ajuste parâmetros em tempo real sem necessidade de deploy.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas */}
        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 space-y-6">

          {/* Gamificação e XP */}
          {activeTab === "gamificacao" && (
            <>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">🎮 Gamificação e XP</h2>
              <div className="grid gap-5">
                <NumberField label="XP por questão correta" configKey="xp.questao_correta" value={c["xp.questao_correta"]} onSave={save} onReset={reset} />
                <NumberField label="XP por flashcard lembrado" configKey="xp.flashcard_lembrei" value={c["xp.flashcard_lembrei"]} onSave={save} onReset={reset} />
                <NumberField label="XP por acerto em simulado" configKey="xp.simulado_por_acerto" value={c["xp.simulado_por_acerto"]} onSave={save} onReset={reset} />
                <NumberField label="Bônus de XP de streak" configKey="xp.streak_bonus" value={c["xp.streak_bonus"]} onSave={save} onReset={reset} />
                <NumberField label="Intervalo para bônus de streak (dias)" configKey="xp.streak_bonus_intervalo" value={c["xp.streak_bonus_intervalo"]} onSave={save} onReset={reset} />
                <ListField label="Milestones de streak (separados por vírgula)" configKey="streak.milestones" value={c["streak.milestones"]} onSave={save} onReset={reset} />
                <ListField label="Marcos de questões respondidas (separados por vírgula)" configKey="questoes.marcos" value={c["questoes.marcos"]} onSave={save} onReset={reset} />
              </div>
            </>
          )}

          {/* Trial e Planos */}
          {activeTab === "trial" && (
            <>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">📅 Trial e Planos</h2>
              <div className="grid gap-5">
                <NumberField
                  label="Duração do trial em dias"
                  configKey="trial.duracao_dias"
                  value={c["trial.duracao_dias"]}
                  onSave={save}
                  onReset={reset}
                  hint="⚠️ Alterar esse valor afeta novos trials. Assinaturas existentes não são alteradas."
                />
                <NumberField label="Avisar X dias antes do trial expirar" configKey="trial.aviso_dias_antes" value={c["trial.aviso_dias_antes"]} onSave={save} onReset={reset} />
              </div>
            </>
          )}

          {/* Mentor Proativo */}
          {activeTab === "mentor" && (
            <>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">🤖 Mentor Proativo</h2>
              <div className="grid gap-5">
                <ListField label="Dias após onboarding para disparar (separados por vírgula)" configKey="mentor.dias_proativo" value={c["mentor.dias_proativo"]} onSave={save} onReset={reset} />
                <NumberField label="Disparar quando prova está a X dias" configKey="mentor.dias_antes_prova" value={c["mentor.dias_antes_prova"]} onSave={save} onReset={reset} />
                <SelectField
                  label="Modelo do mentor principal"
                  configKey="ia.modelo_mentor"
                  value={c["ia.modelo_mentor"]}
                  onSave={save}
                  onReset={reset}
                  options={[
                    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (recomendado)" },
                    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (rápido/barato)" },
                    { value: "claude-opus-4-5", label: "Claude Opus 4.5 (mais inteligente)" },
                  ]}
                />
                <NumberField label="Máximo de tokens na resposta do mentor" configKey="ia.max_tokens_mentor" value={c["ia.max_tokens_mentor"]} onSave={save} onReset={reset} />
                <SelectField
                  label="Modelo rápido (análises e resumos)"
                  configKey="ia.modelo_rapido"
                  value={c["ia.modelo_rapido"]}
                  onSave={save}
                  onReset={reset}
                  options={[
                    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (recomendado)" },
                    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
                  ]}
                />
                <NumberField label="Máximo de tokens — modelo rápido" configKey="ia.max_tokens_rapido" value={c["ia.max_tokens_rapido"]} onSave={save} onReset={reset} />
              </div>
            </>
          )}

          {/* Reativação */}
          {activeTab === "reativacao" && (
            <>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">📧 Reativação e Lembretes</h2>
              <div className="grid gap-5">
                <NumberField label="Considerar inativo após X dias sem estudo" configKey="reativacao.inativo_apos_dias" value={c["reativacao.inativo_apos_dias"]} onSave={save} onReset={reset} />
                <NumberField label="Não enviar reativação para inativos há mais de X dias" configKey="reativacao.max_inativo_dias" value={c["reativacao.max_inativo_dias"]} onSave={save} onReset={reset} />
              </div>
            </>
          )}

          {/* Limites */}
          {activeTab === "limites" && (
            <>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">🔒 Limites do Sistema</h2>
              <div className="grid gap-5">
                <NumberField label="Máximo de mensagens no histórico do mentor" configKey="limites.max_historico_chat" value={c["limites.max_historico_chat"]} onSave={save} onReset={reset} />
                <NumberField label="Máximo de favoritos por usuário" configKey="limites.max_favoritos" value={c["limites.max_favoritos"]} onSave={save} onReset={reset} />
                <NumberField label="Máximo de notas por usuário" configKey="limites.max_notas" value={c["limites.max_notas"]} onSave={save} onReset={reset} />
                <NumberField label="Máximo de caracteres por mensagem no mentor" configKey="limites.max_message_len" value={c["limites.max_message_len"]} onSave={save} onReset={reset} />
              </div>
            </>
          )}

          {/* Geral */}
          {activeTab === "geral" && (
            <>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">⚙️ Geral</h2>
              <div className="grid gap-5">
                <TextField label="Nome da plataforma" configKey="geral.nome_plataforma" value={c["geral.nome_plataforma"]} onSave={save} onReset={reset} />
                <TextField label="Email de suporte" configKey="geral.email_suporte" value={c["geral.email_suporte"]} onSave={save} onReset={reset} type="email" />
                <TextField label="Email do admin (para alertas do sistema)" configKey="geral.email_admin" value={c["geral.email_admin"]} onSave={save} onReset={reset} type="email" />
                <TextField label="WhatsApp de suporte (link wa.me)" configKey="geral.whatsapp_suporte" value={c["geral.whatsapp_suporte"]} onSave={save} onReset={reset} />
                <div className="border-t border-slate-700 pt-4">
                  <ToggleField
                    label="Modo manutenção"
                    configKey="geral.modo_manutencao"
                    value={c["geral.modo_manutencao"]}
                    onSave={save}
                    hint="⚠️ Quando ativo, exibe mensagem de manutenção para todos os alunos."
                  />
                </div>
                <TextareaField
                  label="Banner global (exibido para todos os alunos logados)"
                  configKey="geral.banner_global"
                  value={c["geral.banner_global"]}
                  onSave={save}
                  onReset={reset}
                  hint="Deixe vazio para não exibir nenhum banner."
                />
              </div>
            </>
          )}

          {/* Cron Jobs */}
          {activeTab === "crons" && (
            <>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">🕐 Cron Jobs</h2>
              <p className="text-xs text-slate-400">Clique em &quot;Executar agora&quot; para disparar um cron manualmente. Os horários são configurados no vercel.json.</p>
              <CronSection />
            </>
          )}

          {/* Limpeza de Dados */}
          {activeTab === "limpeza" && (
            <LimpezaSection />
          )}

        </div>
      </div>
    </div>
  );
}
