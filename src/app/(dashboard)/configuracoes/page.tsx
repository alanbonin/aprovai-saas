"use client";
import { useState, useEffect } from "react";
import { Settings, Bell, User, Save, Check, Loader2, Smartphone, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { MeuPlanoSection } from "@/components/configuracoes/meu-plano-section";

type Tab = "perfil" | "plano" | "notificacoes";

interface Prefs {
  emailQuestaoDodia: boolean;
  emailRelatorioSemanal: boolean;
  emailLembrete: boolean;
  emailReativacao: boolean;
}

interface Config {
  name: string;
  email: string;
  phone: string;
  cargo: string;
  orgao: string;
  dataProva: string | null;
  dificuldades: string;
  prefs: Prefs;
}

const NOTIF_OPTIONS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "emailQuestaoDodia",     label: "Questão do Dia",         desc: "Uma questão por email todos os dias às 8h" },
  { key: "emailLembrete",         label: "Lembrete diário",        desc: "Alertas de flashcards vencidos e streak em risco" },
  { key: "emailRelatorioSemanal", label: "Relatório semanal",      desc: "Resumo de desempenho toda segunda-feira" },
  { key: "emailReativacao",       label: "Email de reativação",    desc: "Aviso quando ficar muito tempo sem estudar" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-colors flex-shrink-0",
        checked ? "bg-indigo-600" : "bg-white/10"
      )}
    >
      <span className={cn(
        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-5" : "translate-x-0.5"
      )} />
    </button>
  );
}

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>("plano");
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled]     = useState(false);
  const [pushLoading, setPushLoading]     = useState(false);
  const [pushError, setPushError]         = useState("");

  useEffect(() => {
    fetch("/api/configuracoes")
      .then(r => r.json())
      .then(d => { setConfig(d); setLoading(false); })
      .catch(() => setLoading(false));

    // Verifica suporte e estado atual de push
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setPushEnabled(!!sub);
        });
      }).catch(() => {});
    }
  }, []);

  async function togglePush() {
    setPushLoading(true);
    setPushError("");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        // Desativar
        await existing.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        setPushEnabled(false);
      } else {
        // Ativar — pede permissão
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushError("Permissão negada pelo navegador");
          setPushLoading(false);
          return;
        }
        // Busca VAPID public key
        const keyRes = await fetch("/api/push/subscribe");
        const { publicKey } = await keyRes.json() as { publicKey: string };
        if (!publicKey) { setPushError("Configuração de push incompleta"); setPushLoading(false); return; }

        // Converte base64 para Uint8Array
        const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/"));
        const key = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);

        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
        setPushEnabled(true);
      }
    } catch (e) {
      setPushError(String(e));
    }
    setPushLoading(false);
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    await fetch("/api/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!config) return null;

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-indigo-400" />
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-gray-500 text-sm">Personalize sua experiência de estudo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.04] border border-white/8 w-fit">
        {([
          { id: "plano" as Tab,         label: "Meu Plano",        icon: <Target className="w-3.5 h-3.5" /> },
          { id: "perfil" as Tab,        label: "Perfil",           icon: <User className="w-3.5 h-3.5" /> },
          { id: "notificacoes" as Tab,  label: "Notificações",     icon: <Bell className="w-3.5 h-3.5" /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.id
                ? "bg-[#0ab5bd] text-black"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── ABA: MEU PLANO ──────────────────────────────────────────────────── */}
      {tab === "plano" && <MeuPlanoSection />}

      {/* ── ABA: PERFIL + NOTIFICAÇÕES ──────────────────────────────────────── */}
      {(tab === "perfil" || tab === "notificacoes") && <div className="space-y-6">
        {/* Perfil (só na aba perfil) */}
        {tab === "perfil" && (
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                saved ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Salvo!" : "Salvar"}
            </button>
          </div>
        )}
      {/* Perfil */}
      {tab === "perfil" &&
        <section className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-white/2">
            <User className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold">Perfil</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Nome</label>
                <input
                  value={config.name}
                  onChange={e => setConfig(c => c ? { ...c, name: e.target.value } : c)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Email</label>
                <input
                  value={config.email}
                  disabled
                  className="w-full bg-white/3 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">
                Celular <span className="text-gray-600">(opcional — para autenticação por SMS no futuro)</span>
              </label>
              <input
                type="tel"
                value={config.phone}
                onChange={e => setConfig(c => c ? { ...c, phone: e.target.value } : c)}
                placeholder="(11) 99999-9999"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-xs text-gray-600 mt-1">Será usado para autenticação via WhatsApp/SMS em breve.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Cargo alvo</label>
                <input
                  value={config.cargo}
                  onChange={e => setConfig(c => c ? { ...c, cargo: e.target.value } : c)}
                  placeholder="Ex: Delegado de Polícia"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Órgão / Concurso</label>
                <input
                  value={config.orgao}
                  onChange={e => setConfig(c => c ? { ...c, orgao: e.target.value } : c)}
                  placeholder="Ex: PC-SP, TRF2, Receita Federal"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Data da prova</label>
              <input
                type="date"
                value={config.dataProva ?? ""}
                onChange={e => setConfig(c => c ? { ...c, dataProva: e.target.value || null } : c)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Dificuldades / Observações</label>
              <textarea
                value={config.dificuldades}
                onChange={e => setConfig(c => c ? { ...c, dificuldades: e.target.value } : c)}
                rows={2}
                placeholder="Ex: Tenho dificuldade com Direito Constitucional…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
        </section>}

        {/* Notificações por email */}
        {tab === "notificacoes" && <section className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-white/2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold">Notificações por email</h2>
              <p className="text-xs text-gray-500 mt-0.5">Controle quais emails você quer receber</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {NOTIF_OPTIONS.map(opt => (
              <div key={opt.key} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
                <Toggle
                  checked={config.prefs[opt.key]}
                  onChange={v => setConfig(c => c ? { ...c, prefs: { ...c.prefs, [opt.key]: v } } : c)}
                />
              </div>
            ))}
          </div>
        </section>}

        {/* Push notifications */}
        {tab === "notificacoes" && pushSupported && (
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-white/2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <div>
                <h2 className="text-sm font-semibold">Notificações no navegador</h2>
                <p className="text-xs text-gray-500 mt-0.5">Receba alertas mesmo com o site fechado</p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">Notificações push</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pushEnabled
                      ? "Ativado neste navegador — você receberá lembretes de estudo"
                      : "Ative para receber lembretes de flashcards e streak"}
                  </p>
                  {pushError && <p className="text-xs text-red-400 mt-1">{pushError}</p>}
                </div>
                <button
                  onClick={togglePush}
                  disabled={pushLoading}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors flex-shrink-0 disabled:opacity-50",
                    pushEnabled ? "bg-indigo-600" : "bg-white/10"
                  )}>
                  {pushLoading
                    ? <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      </span>
                    : <span className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        pushEnabled ? "translate-x-5" : "translate-x-0.5"
                      )} />
                  }
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Danger zone */}
        {tab === "perfil" && (
          <section className="rounded-2xl bg-red-500/5 border border-red-500/20 p-5">
            <h2 className="text-sm font-semibold text-red-400 mb-3">Zona de perigo</h2>
            <p className="text-xs text-gray-500 mb-3">
              Para cancelar sua assinatura ou excluir sua conta, entre em contato com o suporte.
            </p>
            <a
              href="mailto:suporte@aprovai.com.br?subject=Cancelamento+de+conta"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
            >
              Contatar suporte
            </a>
          </section>
        )}
      </div>}
    </div>
  );
}
