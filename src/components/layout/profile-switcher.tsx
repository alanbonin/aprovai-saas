"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, Briefcase, Check, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CargoWizardModal } from "@/components/cargo-wizard-modal";

interface Profile {
  id: string;
  label: string | null;
  cargo: string | null;
  orgao: string | null;
  isDefault: boolean;
  modalidade?: string | null;
}

interface ProfilesData {
  profiles: Profile[];
  activeProfileId: string | null;
  maxProfiles: number;
  canCreate: boolean;
}

function profileDisplayName(p: Profile): string {
  if (p.label?.trim()) return p.label.trim();
  const cargoOrgao = [p.cargo, p.orgao].filter(Boolean).join(" · ");
  if (cargoOrgao) return cargoOrgao;
  if (p.modalidade === "ENEM") return "ENEM";
  if (p.modalidade === "OAB") return "OAB";
  if (p.modalidade) return p.modalidade;
  return "Perfil";
}

function profileIcon(p: Profile): string {
  const cargo = (p.cargo ?? "").toLowerCase();
  if (cargo.includes("audit") || cargo.includes("fiscal")) return "💰";
  if (cargo.includes("polici") || cargo.includes("delegad") || cargo.includes("agente")) return "🚔";
  if (cargo.includes("juiz") || cargo.includes("promot") || cargo.includes("defenso")) return "⚖️";
  if (cargo.includes("analista")) return "📊";
  if (cargo.includes("tecnico")) return "🔧";
  if (cargo.includes("enem") || cargo.includes("vestibul")) return "🎓";
  return "🎯";
}

export function ProfileSwitcher({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<ProfilesData | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Profile | null>(null);
  const [wizardProfileId, setWizardProfileId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", cargo: "", orgao: "", banca: "", dataProva: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dropPos, setDropPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    fetch("/api/perfil/profiles")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function switchProfile(id: string) {
    if (id === data?.activeProfileId) { setOpen(false); return; }
    setLoading(true);
    try {
      await fetch(`/api/perfil/profiles/${id}/ativar`, { method: "POST" });
      setData(prev => prev ? { ...prev, activeProfileId: id } : prev);
      setOpen(false);
      // Recarrega a página para atualizar todos os dados do novo perfil
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  async function deleteProfile(id: string) {
    if (!confirm("Excluir este perfil? Os dados dele serão removidos.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/perfil/profiles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        alert(body.error ?? "Erro ao excluir");
        return;
      }
      load();
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setFormError(null);
    if (!form.cargo.trim() && !form.label.trim()) {
      setFormError("Informe o cargo ou um nome para o perfil.");
      return;
    }
    setSaving(true);
    try {
      const url = showEdit ? `/api/perfil/profiles/${showEdit.id}` : "/api/perfil/profiles";
      const method = showEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label.trim() || undefined,
          cargo: form.cargo.trim() || undefined,
          orgao: form.orgao.trim() || undefined,
          banca: form.banca.trim() || undefined,
          dataProva: form.dataProva.trim() || undefined,
        }),
      });
      const body = await res.json() as { error?: string; profile?: Profile };
      if (!res.ok) {
        setFormError(body.error ?? "Erro ao salvar");
        return;
      }
      setShowCreate(false);
      setShowEdit(null);
      setForm({ label: "", cargo: "", orgao: "", banca: "", dataProva: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  function openEdit(p: Profile) {
    // Abre o wizard completo de onboarding para editar o perfil
    setOpen(false);
    setWizardProfileId(p.id);
    setFormError(null);
    setOpen(false);
  }

  function openCreate() {
    // Redireciona para o onboarding de novo perfil em vez de abrir formulário simples
    setOpen(false);
    window.location.href = "/onboarding?novo_perfil=1";
  }

  const active = data?.profiles.find(p => p.id === data.activeProfileId)
    ?? data?.profiles[0]
    ?? null;

  if (!data || data.profiles.length === 0) return null;

  // Conteúdo do dropdown (reutilizado em portal e inline)
  const dropdownContent = (
    <>
      <div className="p-1">
        {data.profiles.map(p => {
          const isActive = p.id === data.activeProfileId;
          return (
            <div
              key={p.id}
              className={cn(
                "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                isActive ? "bg-indigo-600/15 text-indigo-300" : "text-gray-400 hover:bg-white/[0.05] hover:text-gray-200"
              )}
              onClick={() => switchProfile(p.id)}
            >
              <span className="text-base flex-shrink-0">{profileIcon(p)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{profileDisplayName(p)}</p>
                {p.orgao && <p className="text-[9px] text-gray-600 truncate">{p.orgao}</p>}
              </div>
              {isActive && (
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 flex-shrink-0 text-indigo-400" />
                  <button className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:text-indigo-300 transition-colors opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); openEdit(p); }}>
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              {!isActive && (
                <div className="hidden group-hover:flex gap-0">
                  <button className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:text-indigo-300 transition-colors" onClick={e => { e.stopPropagation(); openEdit(p); }}>
                    <Pencil className="w-3 h-3" />
                  </button>
                  {!p.isDefault && (
                    <button className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:text-red-400 transition-colors" onClick={e => { e.stopPropagation(); void deleteProfile(p.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="h-px bg-white/[0.06] mx-2" />
      {data.canCreate ? (
        <div className="p-2">
          <button onClick={openCreate} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-colors text-[11px] font-semibold">
            <Plus className="w-3.5 h-3.5 flex-shrink-0" />
            <span>+ Adicionar novo concurso</span>
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-gray-600 text-center py-2 px-3">
          Limite de {data.maxProfiles} perfil(is) atingido.{" "}
          <a href="/planos" className="text-indigo-400 hover:underline">Fazer upgrade</a>
        </p>
      )}
    </>
  );

  return (
    <>
      <div ref={dropRef} className="relative px-2 pb-2">
        {/* Trigger */}
        <button
          ref={triggerRef}
          onClick={() => {
            if (!open && compact && triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect();
              setDropPos({
                bottom: window.innerHeight - rect.top + 6,
                left: rect.left,
                width: rect.width,
              });
            }
            setOpen(o => !o);
          }}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all",
            open
              ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
              : "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.07] hover:border-white/20"
          )}
        >
          <span className="text-base flex-shrink-0">{active ? profileIcon(active) : "🎯"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold truncate leading-tight">
              {active ? profileDisplayName(active) : "Perfil"}
            </p>
            <p className="text-[9px] text-gray-500 leading-tight">
              {data.profiles.length > 1 ? `${data.profiles.length} perfis` : "Perfil ativo"}
            </p>
          </div>
          {loading ? (
            <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin text-gray-500" />
          ) : (
            <ChevronDown className={cn("w-3 h-3 flex-shrink-0 text-gray-500 transition-transform", open && "rotate-180")} />
          )}
        </button>

        {/* Dropdown — portal no mobile (compact) para escapar do overflow:hidden do sheet */}
        {open && compact && dropPos
          ? createPortal(
              <div
                className="fixed z-[9999] rounded-xl border border-white/[0.08] bg-[#0f111a] shadow-2xl overflow-hidden"
                style={{ bottom: dropPos.bottom, left: dropPos.left, width: dropPos.width }}
              >
                {dropdownContent}
              </div>,
              document.body
            )
          : open && !compact && (
              <div className="absolute left-2 right-2 top-full mt-1 z-50 rounded-xl border border-white/[0.08] bg-[#0f111a] shadow-2xl overflow-hidden">
                {dropdownContent}
              </div>
            )
        }
      </div>

      {/* Modal criar / editar perfil */}
      {(showCreate || showEdit) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0f111a] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-sm text-white">
                  {showEdit ? "Editar Perfil" : "Novo Perfil de Cargo"}
                </span>
              </div>
              <button
                onClick={() => { setShowCreate(false); setShowEdit(null); }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Cargo <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.cargo}
                  onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                  placeholder="Ex: Auditor Fiscal, Delegado, Analista"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Órgão / Concurso</label>
                <input
                  type="text"
                  value={form.orgao}
                  onChange={e => setForm(f => ({ ...f, orgao: e.target.value }))}
                  placeholder="Ex: SEFAZ-BA, Polícia Federal, TRF"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Banca</label>
                  <input
                    type="text"
                    value={form.banca}
                    onChange={e => setForm(f => ({ ...f, banca: e.target.value }))}
                    placeholder="Ex: CESPE, FCC"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Data da Prova</label>
                  <input
                    type="date"
                    value={form.dataProva}
                    onChange={e => setForm(f => ({ ...f, dataProva: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Nome do perfil (opcional)</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder={[form.cargo, form.orgao].filter(Boolean).join(" — ") || "Ex: Meu perfil da PF"}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
                />
                <p className="text-[10px] text-gray-600 mt-1">Se vazio, será gerado automaticamente a partir do cargo.</p>
              </div>

              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => { setShowCreate(false); setShowEdit(null); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void saveProfile()}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {showEdit ? "Salvar" : "Criar Perfil"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Wizard completo de edição de cargo */}
      {wizardProfileId && (
        <CargoWizardModal
          profileId={wizardProfileId}
          nomeUsuario="você"
          onClose={() => setWizardProfileId(null)}
          onDone={() => { setWizardProfileId(null); load(); window.location.reload(); }}
        />
      )}
    </>
  );
}
