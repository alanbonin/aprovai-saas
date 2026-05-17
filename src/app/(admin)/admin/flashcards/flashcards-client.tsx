"use client";
import { useState } from "react";
import { Plus, Edit2, X, Check, Layers, ChevronDown, ChevronRight, Trash2, Sparkles, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Card { id: string; front: string; back: string; }
interface FlashcardSet { id: string; name: string; subjectId: string; cards: Card[]; createdAt: string; }
interface Subject { id: string; name: string; }
interface Agent { id: string; name: string; banca: string | null; area: string | null; description: string; color: string; }
interface Props { sets: FlashcardSet[]; subjects: Subject[]; agents: Agent[]; }

export function FlashcardsAdmin({ sets: initial, subjects, agents }: Props) {
  const [sets, setSets] = useState(initial);
  const [editingSet, setEditingSet] = useState<Partial<FlashcardSet> | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newCard, setNewCard] = useState<{ front: string; back: string } | null>(null);
  const [filterSubject, setFilterSubject] = useState("");

  const [showGerarModal, setShowGerarModal] = useState(false);
  const [gerarForm, setGerarForm] = useState({ subjectId: "", qty: 10, agentId: "" });
  const [gerando, setGerando] = useState(false);
  const [gerarMsg, setGerarMsg] = useState("");

  const filtered = filterSubject ? sets.filter(s => s.subjectId === filterSubject) : sets;
  const selectedAgent = agents.find(a => a.id === gerarForm.agentId);

  async function saveSet() {
    if (!editingSet?.name?.trim() || !editingSet?.subjectId) return;
    setSaving(true); setError("");
    const isNew = !editingSet.id;
    const res = await fetch("/api/admin/flashcards", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingSet),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Erro"); setSaving(false); return; }
    const saved = await res.json();
    if (isNew) setSets(s => [saved, ...s]);
    else setSets(s => s.map(x => x.id === saved.id ? saved : x));
    setEditingSet(null); setSaving(false);
  }

  async function deleteSet(id: string) {
    if (!confirm("Remover este deck?")) return;
    await fetch("/api/admin/flashcards", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSets(s => s.filter(x => x.id !== id));
  }

  async function addCard(setId: string) {
    if (!newCard?.front?.trim() || !newCard?.back?.trim()) return;
    const set = sets.find(s => s.id === setId);
    if (!set) return;
    const card: Card = { id: Date.now().toString(), ...newCard };
    const updatedCards = [...set.cards, card];
    const res = await fetch("/api/admin/flashcards", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: setId, cards: updatedCards }) });
    if (res.ok) { const saved = await res.json(); setSets(s => s.map(x => x.id === setId ? saved : x)); setNewCard(null); }
  }

  async function deleteCard(setId: string, cardId: string) {
    const set = sets.find(s => s.id === setId);
    if (!set) return;
    const updatedCards = set.cards.filter(c => c.id !== cardId);
    const res = await fetch("/api/admin/flashcards", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: setId, cards: updatedCards }) });
    if (res.ok) { const saved = await res.json(); setSets(s => s.map(x => x.id === setId ? saved : x)); }
  }

  async function gerar() {
    if (!gerarForm.subjectId) { setGerarMsg("Selecione uma matéria"); return; }
    setGerando(true); setGerarMsg("");
    const subject = subjects.find(s => s.id === gerarForm.subjectId);
    const res = await fetch("/api/admin/flashcards/gerar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: gerarForm.subjectId, subjectName: subject?.name ?? "", qty: gerarForm.qty, agentId: gerarForm.agentId || null }),
    });
    const data = await res.json();
    if (!res.ok) { setGerarMsg(data.error ?? "Erro"); setGerando(false); return; }
    setSets(s => [data, ...s]);
    setGerarMsg(`Deck criado: "${data.name}" com ${data.cards?.length ?? 0} cards!`);
    setGerando(false);
  }

  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name ?? "—";

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">Todas as matérias</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-xs text-gray-600">{filtered.length} deck(s)</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowGerarModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors">
            <Sparkles className="w-4 h-4" />Gerar com IA
          </button>
          <button onClick={() => setEditingSet({ name: "", subjectId: "", cards: [] })}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />Novo deck
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-white/5 bg-white/3">
          <Layers className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum deck de flashcards</p>
          <p className="text-gray-600 text-sm mt-1">Use "Gerar com IA" para criar decks automaticamente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(set => {
            const isExpanded = expanded === set.id;
            return (
              <div key={set.id} className="rounded-xl border border-white/5 bg-white/3 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => setExpanded(isExpanded ? null : set.id)}>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{set.name}</p>
                    <p className="text-xs text-gray-500">{subjectName(set.subjectId)} · {set.cards.length} cards</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setEditingSet({ ...set }); }} className="text-gray-600 hover:text-indigo-400 transition-colors p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); deleteSet(set.id); }} className="text-gray-700 hover:text-red-400 transition-colors p-1"><X className="w-3.5 h-3.5" /></button>
                </div>
                {isExpanded && (
                  <div className="border-t border-white/5 p-4">
                    <div className="space-y-2 mb-4">
                      {set.cards.length === 0 && <p className="text-xs text-gray-600 text-center py-4">Nenhum card. Adicione abaixo.</p>}
                      {set.cards.map(card => (
                        <div key={card.id} className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-white/3 border border-white/5 group">
                          <div><p className="text-xs text-gray-600 mb-1">Frente</p><p className="text-sm text-white">{card.front}</p></div>
                          <div className="relative">
                            <p className="text-xs text-gray-600 mb-1">Verso</p>
                            <p className="text-sm text-gray-300">{card.back}</p>
                            <button onClick={() => deleteCard(set.id, card.id)} className="absolute top-0 right-0 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {newCard !== null && expanded === set.id ? (
                      <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-600/5 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Frente *</label>
                            <textarea value={newCard.front} onChange={e => setNewCard(v => ({ ...v!, front: e.target.value }))} rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Verso *</label>
                            <textarea value={newCard.back} onChange={e => setNewCard(v => ({ ...v!, back: e.target.value }))} rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setNewCard(null)} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white">Cancelar</button>
                          <button onClick={() => addCard(set.id)} disabled={!newCard.front.trim() || !newCard.back.trim()}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium disabled:opacity-50 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Adicionar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setExpanded(set.id); setNewCard({ front: "", back: "" }); }} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Adicionar card
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal gerar IA */}
      {showGerarModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowGerarModal(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400" /><h2 className="font-semibold">Gerar flashcards com IA</h2></div>
              <button onClick={() => setShowGerarModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Agente especialista (opcional)</label>
                <select value={gerarForm.agentId} onChange={e => setGerarForm(f => ({ ...f, agentId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Sem agente (genérico)</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.banca ? ` · ${a.banca}` : ""}{a.area ? ` · ${a.area}` : ""}</option>)}
                </select>
                {selectedAgent && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-400">
                    <Bot className="w-3 h-3" /><span>{selectedAgent.description}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Matéria *</label>
                <select value={gerarForm.subjectId} onChange={e => setGerarForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Selecione...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Quantidade de cards</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20, 30].map(n => (
                    <button key={n} onClick={() => setGerarForm(f => ({ ...f, qty: n }))}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                        gerarForm.qty === n ? "bg-emerald-600 text-white" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {gerarMsg && (
                <p className={cn("text-xs p-3 rounded-lg border", gerarMsg.startsWith("Deck") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                  {gerarMsg}
                </p>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setShowGerarModal(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">Fechar</button>
              <button onClick={gerar} disabled={gerando || !gerarForm.subjectId}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {gerando ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</> : <><Sparkles className="w-4 h-4" />Gerar {gerarForm.qty} cards</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar deck */}
      {editingSet && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditingSet(null)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="font-semibold">{editingSet.id ? "Editar deck" : "Novo deck"}</h2>
              <button onClick={() => setEditingSet(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome do deck *</label>
                <input value={editingSet.name ?? ""} onChange={e => setEditingSet(v => ({ ...v, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Matéria *</label>
                <select value={editingSet.subjectId ?? ""} onChange={e => setEditingSet(v => ({ ...v, subjectId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Selecione</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setEditingSet(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={saveSet} disabled={saving || !editingSet.name?.trim() || !editingSet.subjectId}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
