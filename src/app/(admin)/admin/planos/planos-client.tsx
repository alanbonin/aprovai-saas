"use client";
import { useState } from "react";
import { Plus, Check, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string; name: string; slug: string; price: number;
  intervalDays: number; aiCreditsPerWeek: number; maxAgents: number;
  features: string[]; active: boolean;
}

interface Props { plans: Plan[]; }

const EMPTY: Omit<Plan, "id"> = {
  name: "", slug: "", price: 0, intervalDays: 30,
  aiCreditsPerWeek: 10, maxAgents: 1, features: [], active: true,
};

export function PlanosAdminClient({ plans: initialPlans }: Props) {
  const [plans, setPlans] = useState(initialPlans);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Plan, "id">>(EMPTY);
  const [featInput, setFeatInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function openCreate() {
    setForm(EMPTY);
    setFeatInput("");
    setCreating(true);
    setEditing(null);
  }

  function openEdit(p: Plan) {
    setForm({ name: p.name, slug: p.slug, price: p.price, intervalDays: p.intervalDays,
      aiCreditsPerWeek: p.aiCreditsPerWeek, maxAgents: p.maxAgents, features: [...p.features], active: p.active });
    setFeatInput("");
    setEditing(p);
    setCreating(false);
  }

  function closeModal() { setCreating(false); setEditing(null); }

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
    if (creating) {
      const res = await fetch("/api/admin/planos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setPlans(p => [...p, data]);
        showToast("Plano criado!");
        closeModal();
      } else showToast(data.error ?? "Erro");
    } else if (editing) {
      const res = await fetch("/api/admin/planos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...form }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlans(p => p.map(pl => pl.id === editing.id ? data : pl));
        showToast("Plano atualizado!");
        closeModal();
      } else showToast(data.error ?? "Erro");
    }
    setSaving(false);
  }

  async function deactivate(id: string) {
    if (!confirm("Desativar este plano?")) return;
    const res = await fetch("/api/admin/planos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setPlans(p => p.map(pl => pl.id === id ? { ...pl, active: false } : pl));
      showToast("Plano desativado.");
    }
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className={cn(
            "rounded-xl border p-5",
            plan.active ? "border-white/10 bg-white/3" : "border-white/5 bg-white/1 opacity-50"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{plan.slug}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(plan)} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {plan.active && (
                  <button onClick={() => deactivate(plan.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-2xl font-black">R$ {plan.price.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-gray-500">
                a cada {plan.intervalDays} dias · {plan.maxAgents} mentor{plan.maxAgents !== 1 ? "es" : ""} · {plan.aiCreditsPerWeek} msgs/sem
              </p>
            </div>

            <span className={cn("text-xs px-2 py-0.5 rounded-full", plan.active ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-500")}>
              {plan.active ? "Ativo" : "Inativo"}
            </span>

            {plan.features.length > 0 && (
              <ul className="mt-3 space-y-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Check className="w-3 h-3 text-green-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Modal criar/editar */}
      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{creating ? "Novo plano" : "Editar plano"}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              {[
                { label: "Nome", key: "name", type: "text", placeholder: "Ex: Plano Focado" },
                { label: "Slug único", key: "slug", type: "text", placeholder: "focado" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1">{label}</label>
                  <input type={type} value={String(form[key as keyof typeof form])} placeholder={placeholder}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.price}
                    onChange={e => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ciclo (dias)</label>
                  <input type="number" min="1" value={form.intervalDays}
                    onChange={e => setForm(prev => ({ ...prev, intervalDays: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Msgs/semana</label>
                  <input type="number" min="1" value={form.aiCreditsPerWeek}
                    onChange={e => setForm(prev => ({ ...prev, aiCreditsPerWeek: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mentores</label>
                  <input type="number" min="1" value={form.maxAgents}
                    onChange={e => setForm(prev => ({ ...prev, maxAgents: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Features</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={featInput} placeholder="Ex: Workspace personalizado"
                    onChange={e => setFeatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  <button onClick={addFeature} className="px-3 py-2 bg-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs text-gray-300 bg-white/5 rounded-md px-3 py-1.5">
                      <span>{f}</span>
                      <button onClick={() => removeFeature(i)} className="text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active}
                  onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm text-gray-400">Plano ativo</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.name || !form.slug}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
