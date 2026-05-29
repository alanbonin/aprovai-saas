"use client";
import { useState } from "react";
import { Plus, Check, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string; name: string; slug: string; price: number;
  intervalDays: number; aiCreditsPerWeek: number; maxAgents: number;
  maxProfiles: number;
  maxQuestionsPerWeek: number; maxFlashcardsPerWeek: number;
  maxSimuladosPerWeek: number; maxRedacoesPerWeek: number; maxCasosPerWeek: number;
  hasPdfLibrary: boolean; hasArena: boolean; hasAdaptativo: boolean; hasCompanhia: boolean;
  hasGroupStudy: boolean; hasLongTermMemory: boolean;
  features: string[]; active: boolean;
}

interface Props { plans: Plan[]; }

const EMPTY: Omit<Plan, "id"> = {
  name: "", slug: "", price: 0, intervalDays: 30,
  aiCreditsPerWeek: 10, maxAgents: 2, maxProfiles: 1,
  maxQuestionsPerWeek: 10, maxFlashcardsPerWeek: 10,
  maxSimuladosPerWeek: 0, maxRedacoesPerWeek: 0, maxCasosPerWeek: 0,
  hasPdfLibrary: false, hasArena: false, hasAdaptativo: false, hasCompanhia: false,
  hasGroupStudy: false, hasLongTermMemory: false,
  features: [], active: true,
};

const SLUG_COLORS: Record<string, string> = {
  trial:    "border-gray-500/30 bg-gray-500/5",
  focado:   "border-blue-500/30 bg-blue-500/5",
  aprovacao:"border-indigo-500/30 bg-indigo-500/5",
  elite:    "border-amber-500/30 bg-amber-500/5",
};

function fmtLimit(n: number) {
  return n === -1 ? "∞" : String(n);
}

export function PlanosAdminClient({ plans: initialPlans }: Props) {
  const [plans, setPlans] = useState(initialPlans);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Plan, "id">>(EMPTY);
  const [featInput, setFeatInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }
  function closeModal() { setCreating(false); setEditing(null); }

  function openCreate() {
    setForm(EMPTY); setFeatInput("");
    setCreating(true); setEditing(null);
  }

  function openEdit(p: Plan) {
    setForm({
      name: p.name, slug: p.slug, price: p.price, intervalDays: p.intervalDays,
      aiCreditsPerWeek: p.aiCreditsPerWeek, maxAgents: p.maxAgents, maxProfiles: p.maxProfiles,
      maxQuestionsPerWeek:  p.maxQuestionsPerWeek  ?? 10,
      maxFlashcardsPerWeek: p.maxFlashcardsPerWeek ?? 10,
      maxSimuladosPerWeek:  p.maxSimuladosPerWeek  ?? 0,
      maxRedacoesPerWeek:   p.maxRedacoesPerWeek   ?? 0,
      maxCasosPerWeek:      p.maxCasosPerWeek      ?? 0,
      hasPdfLibrary:        p.hasPdfLibrary         ?? false,
      hasArena:             p.hasArena              ?? false,
      hasAdaptativo:        p.hasAdaptativo         ?? false,
      hasCompanhia:         p.hasCompanhia          ?? false,
      hasGroupStudy:        p.hasGroupStudy         ?? false,
      hasLongTermMemory:    p.hasLongTermMemory     ?? false,
      features: [...p.features], active: p.active,
    });
    setFeatInput(""); setEditing(p); setCreating(false);
  }

  function addFeature() {
    const f = featInput.trim();
    if (!f) return;
    setForm(prev => ({ ...prev, features: [...prev.features, f] }));
    setFeatInput("");
  }
  function removeFeature(i: number) {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    if (!form.name || !form.slug) return;
    setSaving(true);
    const method = creating ? "POST" : "PATCH";
    const body = creating ? form : { id: editing!.id, ...form };
    const res = await fetch("/api/admin/planos", {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      if (creating) setPlans(p => [...p, data]);
      else setPlans(p => p.map(pl => pl.id === editing!.id ? data : pl));
      showToast(creating ? "Plano criado!" : "Plano atualizado!");
      closeModal();
    } else showToast(data.error ?? "Erro");
    setSaving(false);
  }

  async function deactivate(id: string) {
    if (!confirm("Desativar este plano?")) return;
    const res = await fetch("/api/admin/planos", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { setPlans(p => p.map(pl => pl.id === id ? { ...pl, active: false } : pl)); showToast("Desativado."); }
  }

  async function deletePermanent(id: string, name: string) {
    if (!confirm(`Excluir PERMANENTEMENTE o plano "${name}"?\n\nEsta ação não pode ser desfeita.`)) return;
    const res = await fetch("/api/admin/planos", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, permanent: true }),
    });
    const data = await res.json();
    if (res.ok) { setPlans(p => p.filter(pl => pl.id !== id)); showToast("Plano excluído."); }
    else showToast(data.error ?? "Erro ao excluir");
  }

  return (
    <div className="p-8 text-white">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{plans.length} plano(s) cadastrado(s)</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map(plan => {
          const colorClass = SLUG_COLORS[plan.slug] ?? "border-white/10 bg-white/3";
          return (
            <div key={plan.id} className={cn(
              "rounded-xl border p-5 flex flex-col",
              colorClass, !plan.active && "opacity-40"
            )}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-base">{plan.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{plan.slug}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(plan)} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {plan.active && (
                    <button onClick={() => deactivate(plan.id)} className="p-1.5 rounded-md hover:bg-amber-500/10 text-gray-400 hover:text-amber-400" title="Desativar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => deletePermanent(plan.id, plan.name)} className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400" title="Excluir">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-2xl font-black">
                  {plan.price === 0 ? "Grátis" : `R$ ${plan.price.toFixed(2).replace(".", ",")}`}
                </p>
                <p className="text-xs text-gray-500">a cada {plan.intervalDays} dias</p>
              </div>

              {/* Limites rápidos */}
              <div className="grid grid-cols-2 gap-1 mb-4 text-xs">
                {[
                  { label: "Mentores", val: plan.maxAgents },
                  { label: "Concursos", val: plan.maxProfiles },
                  { label: "Msgs/sem", val: plan.aiCreditsPerWeek },
                  { label: "Questões/sem", val: plan.maxQuestionsPerWeek ?? 10 },
                  { label: "Flashcards/sem", val: plan.maxFlashcardsPerWeek ?? 10 },
                  { label: "Simulados/sem", val: plan.maxSimuladosPerWeek ?? 0 },
                  { label: "Redações/sem", val: plan.maxRedacoesPerWeek ?? 0 },
                  { label: "Casos/sem", val: plan.maxCasosPerWeek ?? 0 },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between bg-white/5 rounded px-2 py-1">
                    <span className="text-gray-500 truncate mr-1">{label}</span>
                    <span className={cn("font-bold flex-shrink-0",
                      val === -1 ? "text-green-400" : val === 0 ? "text-red-400" : "text-white")}>
                      {fmtLimit(val)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Booleanos */}
              <div className="space-y-1 mb-4 text-xs">
                {[
                  { label: "Grupos de estudo", val: plan.hasGroupStudy ?? false },
                  { label: "Biblioteca de PDFs", val: plan.hasPdfLibrary ?? false },
                  { label: "Arena", val: plan.hasArena ?? false },
                  { label: "Modo Adaptativo", val: plan.hasAdaptativo ?? false },
                  { label: "Modo Companhia", val: plan.hasCompanhia ?? false },
                  { label: "Memória longo prazo", val: plan.hasLongTermMemory ?? false },
                ].map(({ label, val }) => (
                  <div key={label} className={cn("flex items-center gap-1.5", val ? "text-green-400" : "text-gray-600")}>
                    {val ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {label}
                  </div>
                ))}
              </div>

              <span className={cn("text-xs px-2 py-0.5 rounded-full self-start mt-auto",
                plan.active ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-500")}>
                {plan.active ? "Ativo" : "Inativo"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Modal criar/editar */}
      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{creating ? "Novo plano" : "Editar plano"}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              {/* Nome e slug */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Nome", key: "name", placeholder: "Ex: Focado" },
                  { label: "Slug único", key: "slug", placeholder: "focado" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                    <input type="text" value={String(form[key as keyof typeof form])} placeholder={placeholder}
                      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                ))}
              </div>

              {/* Preço e ciclo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.price}
                    onChange={e => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ciclo (dias)</label>
                  <input type="number" min="1" value={form.intervalDays}
                    onChange={e => setForm(prev => ({ ...prev, intervalDays: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              {/* Limites */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Limites (-1 = ilimitado · 0 = bloqueado)</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Mentores", key: "maxAgents" },
                  { label: "Concursos", key: "maxProfiles" },
                  { label: "Msgs/sem", key: "aiCreditsPerWeek" },
                  { label: "Questões/sem", key: "maxQuestionsPerWeek" },
                  { label: "Flashcards/sem", key: "maxFlashcardsPerWeek" },
                  { label: "Simulados/sem", key: "maxSimuladosPerWeek" },
                  { label: "Redações/sem", key: "maxRedacoesPerWeek" },
                  { label: "Casos/sem", key: "maxCasosPerWeek" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                    <input type="number" min="-1" value={Number(form[key as keyof typeof form])}
                      onChange={e => setForm(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                ))}
              </div>

              {/* Recursos booleanos */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Recursos exclusivos</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Grupos de estudo", key: "hasGroupStudy" },
                  { label: "Biblioteca de PDFs", key: "hasPdfLibrary" },
                  { label: "Arena", key: "hasArena" },
                  { label: "Modo Adaptativo", key: "hasAdaptativo" },
                  { label: "Modo Companhia", key: "hasCompanhia" },
                  { label: "Memória longo prazo", key: "hasLongTermMemory" },
                ].map(({ label, key }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer bg-white/5 rounded-lg px-3 py-2.5 hover:bg-white/8 transition-colors">
                    <input type="checkbox" checked={Boolean(form[key as keyof typeof form])}
                      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded accent-indigo-500" />
                    <span className="text-xs text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

              {/* Features (lista de texto) */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição dos recursos (exibida na página de planos)</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={featInput} placeholder="Ex: Questões ilimitadas por matéria"
                    onChange={e => setFeatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  <button onClick={addFeature} className="px-3 py-2 bg-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-700">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs text-gray-300 bg-white/5 rounded-md px-3 py-1.5">
                      <span>{f}</span>
                      <button onClick={() => removeFeature(i)} className="text-gray-500 hover:text-red-400 flex-shrink-0"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active}
                  onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded accent-indigo-500" />
                <span className="text-sm text-gray-400">Plano ativo</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.name || !form.slug}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-medium">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
