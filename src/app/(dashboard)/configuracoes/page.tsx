"use client";
import React, { useState, useEffect } from "react";
import { Settings, Bell, User, Save, Check, Loader2, Smartphone, Lock, Download, Trash2, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Tab = "perfil" | "notificacoes";

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
  avatarUrl?: string | null;
  prefs: Prefs;
  subscription?: { startDate?: string | null; endDate?: string | null; status?: string } | null;
}

const NOTIF_OPTIONS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "emailQuestaoDodia",     label: "Questão do Dia",         desc: "Uma questão por email todos os dias às 8h" },
  { key: "emailLembrete",         label: "Lembrete diário",        desc: "Alertas de flashcards vencidos e streak em risco" },
  { key: "emailRelatorioSemanal", label: "Relatório semanal",      desc: "Resumo de desempenho toda segunda-feira" },
  { key: "emailReativacao",       label: "Email de reativação",    desc: "Aviso quando ficar muito tempo sem estudar" },
];

function CancelSubscriptionButton({ startDate }: { startDate?: string | null }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [confirm, setConfirm] = React.useState(false);

  const withinCoolingOff = startDate
    ? (Date.now() - new Date(startDate).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false;

  async function handleCancel() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/pagamento/cancelar", { method: "POST" });
      const d = await res.json() as { ok?: boolean; refunded?: boolean; error?: string };
      if (res.ok) {
        setMsg({
          tipo: "ok",
          texto: d.refunded
            ? "Assinatura cancelada e reembolso solicitado. O valor volta ao seu cartão em até 5 dias úteis."
            : "Assinatura cancelada. Seu acesso continua até o fim do período pago.",
        });
        setConfirm(false);
      } else {
        setMsg({ tipo: "erro", texto: d.error ?? "Erro ao cancelar." });
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Erro de conexão." });
    }
    setLoading(false);
  }

  return (
    <div>
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-500/30 text-orange-400 text-sm hover:bg-orange-500/10 transition-colors"
        >
          {withinCoolingOff ? "Cancelar e solicitar reembolso" : "Cancelar renovação automática"}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-orange-300">
            {withinCoolingOff
              ? "Dentro do prazo de 7 dias (CDC Art. 49). Sua assinatura será cancelada e o valor total reembolsado no cartão em até 5 dias úteis."
              : "Tem certeza? A cobrança automática será desativada. Você mantém o acesso até o fim do período pago."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-300 text-sm hover:bg-orange-500/30 transition-colors disabled:opacity-50"
            >
              {loading ? "Cancelando…" : withinCoolingOff ? "Sim, cancelar e reembolsar" : "Sim, cancelar"}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p className={`mt-2 text-xs ${msg.tipo === "ok" ? "text-green-400" : "text-red-400"}`}>{msg.texto}</p>
      )}
    </div>
  );
}

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
  const [tab, setTab] = useState<Tab>("perfil");
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  // Avatar
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg]         = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Alterar senha
  const [novaSenha, setNovaSenha]           = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [senhaLoading, setSenhaLoading]     = useState(false);
  const [senhaMsg, setSenhaMsg]             = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Exportar dados
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMsg, setExportMsg]         = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Deletar conta
  const [deleteModal, setDeleteModal]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg]         = useState<string | null>(null);

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled]     = useState(false);
  const [pushLoading, setPushLoading]     = useState(false);
  const [pushError, setPushError]         = useState("");

  useEffect(() => {
    fetch("/api/configuracoes")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setConfig(d);
        setLoading(false);
      })
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

  async function alterarSenha() {
    setSenhaMsg(null);
    if (novaSenha.length < 8) {
      setSenhaMsg({ tipo: "erro", texto: "A senha deve ter no mínimo 8 caracteres." });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setSenhaMsg({ tipo: "erro", texto: "As senhas não coincidem." });
      return;
    }
    setSenhaLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) {
        setSenhaMsg({ tipo: "erro", texto: error.message });
      } else {
        setSenhaMsg({ tipo: "ok", texto: "Senha alterada com sucesso!" });
        setNovaSenha("");
        setConfirmarSenha("");
      }
    } catch {
      setSenhaMsg({ tipo: "erro", texto: "Erro ao alterar senha." });
    }
    setSenhaLoading(false);
  }

  async function exportarDados() {
    setExportMsg(null);
    setExportLoading(true);
    try {
      const res = await fetch("/api/relatorio/export");
      if (!res.ok) throw new Error("Erro ao exportar dados");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-aprovai-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMsg({ tipo: "ok", texto: "Arquivo baixado com sucesso!" });
    } catch {
      setExportMsg({ tipo: "erro", texto: "Erro ao exportar dados. Tente novamente." });
    }
    setExportLoading(false);
  }

  async function deletarConta() {
    setDeleteMsg(null);
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteMsg((body as { error?: string }).error ?? "Erro ao excluir conta.");
        setDeleteLoading(false);
        return;
      }
      // Redirecionar após exclusão
      window.location.href = "/cadastro?deleted=1";
    } catch {
      setDeleteMsg("Erro ao excluir conta. Tente novamente.");
      setDeleteLoading(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setAvatarMsg(null);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/configuracoes/avatar", { method: "POST", body: form });
      const data = await res.json() as { avatarUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erro no upload");
      setConfig(c => c ? { ...c, avatarUrl: data.avatarUrl } : c);
      setAvatarMsg({ tipo: "ok", texto: "Foto atualizada!" });
    } catch (err) {
      setAvatarMsg({ tipo: "erro", texto: String(err).replace("Error: ", "") });
    }
    setAvatarLoading(false);
    e.target.value = "";
  }

  async function removerAvatar() {
    setAvatarLoading(true);
    setAvatarMsg(null);
    try {
      const res = await fetch("/api/configuracoes/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover foto");
      setConfig(c => c ? { ...c, avatarUrl: null } : c);
      setAvatarMsg({ tipo: "ok", texto: "Foto removida." });
    } catch (err) {
      setAvatarMsg({ tipo: "erro", texto: String(err).replace("Error: ", "") });
    }
    setAvatarLoading(false);
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
            {/* Avatar upload */}
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center">
                  {config.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">
                      {config.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </div>
                {/* Camera button overlay */}
                <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center cursor-pointer transition-colors shadow-lg border-2 border-black">
                  {avatarLoading
                    ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    : <Camera className="w-3.5 h-3.5 text-white" />
                  }
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={avatarLoading}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200 mb-1">Foto de perfil</p>
                <p className="text-xs text-gray-500 mb-2">JPG, PNG ou WebP · máximo 5 MB</p>
                {config.avatarUrl && (
                  <button
                    onClick={removerAvatar}
                    disabled={avatarLoading}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" /> Remover foto
                  </button>
                )}
                {avatarMsg && (
                  <p className={cn("text-xs mt-1", avatarMsg.tipo === "ok" ? "text-green-400" : "text-red-400")}>
                    {avatarMsg.texto}
                  </p>
                )}
              </div>
            </div>
            <hr className="border-white/8" />
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

        {/* Alterar senha */}
        {tab === "perfil" && (
          <>
            <hr className="border-white/8" />
            <section className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-white/2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold">Alterar senha</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Nova senha</label>
                  <input
                    type="password"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={confirmarSenha}
                    onChange={e => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {senhaMsg && (
                  <p className={cn("text-xs", senhaMsg.tipo === "ok" ? "text-green-400" : "text-red-400")}>
                    {senhaMsg.texto}
                  </p>
                )}
                <button
                  onClick={alterarSenha}
                  disabled={senhaLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-all"
                >
                  {senhaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Alterar senha
                </button>
              </div>
            </section>

            {/* Exportar dados (LGPD Art. 18) */}
            <hr className="border-white/8" />
            <section className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-white/2">
                <Download className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold">Exportar meus dados</h2>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-4">
                  Baixe um arquivo CSV com todo o seu histórico de questões respondidas (LGPD Art. 18).
                  <br />
                  <span className="text-gray-600">Inclui: data, matéria, banca, ano, nível, acerto e próxima revisão.</span>
                </p>
                {exportMsg && (
                  <p className={cn("text-xs mb-3", exportMsg.tipo === "ok" ? "text-green-400" : "text-red-400")}>
                    {exportMsg.texto}
                  </p>
                )}
                <button
                  onClick={exportarDados}
                  disabled={exportLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium disabled:opacity-50 transition-all"
                >
                  {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {exportLoading ? "Exportando…" : "Exportar meus dados"}
                </button>
              </div>
            </section>

            {/* Cancelar assinatura */}
            <hr className="border-white/8" />
            <section className="rounded-2xl bg-orange-500/5 border border-orange-500/20 p-5">
              <h2 className="text-sm font-semibold text-orange-400 mb-1">Cancelar assinatura</h2>
              {(() => {
                const startDate = config?.subscription?.startDate;
                const endDate = config?.subscription?.endDate;
                const withinCoolingOff = startDate
                  ? (Date.now() - new Date(startDate).getTime()) < 7 * 24 * 60 * 60 * 1000
                  : false;
                const endFormatted = endDate
                  ? new Date(endDate).toLocaleDateString("pt-BR")
                  : null;
                return (
                  <p className="text-xs text-gray-500 mb-4">
                    {withinCoolingOff
                      ? "Você está dentro do prazo de 7 dias (CDC Art. 49). Pode cancelar agora e receber o reembolso total no cartão em até 5 dias úteis."
                      : `Você pode cancelar a renovação automática a qualquer momento. Seu acesso continua até ${endFormatted ?? "o fim do período pago"} e não será cobrado novamente.`}
                  </p>
                );
              })()}
              <CancelSubscriptionButton startDate={config?.subscription?.startDate} />
            </section>

            {/* Zona de perigo — deletar conta (LGPD Art. 18) */}
            <hr className="border-white/8" />
            <section className="rounded-2xl bg-red-500/5 border border-red-500/20 p-5">
              <h2 className="text-sm font-semibold text-red-400 mb-3">Zona de perigo</h2>
              <p className="text-xs text-gray-500 mb-4">
                Excluir sua conta apaga permanentemente seu progresso, notas e histórico de questões.
                Sua assinatura será cancelada.
              </p>
              <button
                onClick={() => { setDeleteModal(true); setDeleteConfirm(""); setDeleteMsg(null); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir minha conta
              </button>
            </section>

            {/* Modal de confirmação de exclusão */}
            {deleteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-[#111] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Trash2 className="w-5 h-5 text-red-400" />
                    <h3 className="text-base font-bold text-red-400">Excluir conta permanentemente</h3>
                  </div>
                  <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                    ⚠️ Esta ação é irreversível. Todos os seus dados serão apagados.
                  </p>
                  <p className="text-xs text-gray-400 mb-2">
                    Para confirmar, digite <span className="font-mono font-bold text-white">EXCLUIR</span> no campo abaixo:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="EXCLUIR"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 mb-4"
                  />
                  {deleteMsg && <p className="text-xs text-red-400 mb-3">{deleteMsg}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteModal(false)}
                      className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={deletarConta}
                      disabled={deleteConfirm !== "EXCLUIR" || deleteLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Excluir permanentemente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>}
    </div>
  );
}
