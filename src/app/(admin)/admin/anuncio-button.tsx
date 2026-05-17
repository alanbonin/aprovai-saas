"use client";
import { useState, useEffect } from "react";
import { Megaphone, Plus, Loader2, Trash2, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Anuncio {
  id: string;
  title: string;
  message: string;
  updatedAt: string;
}

export function AdminAnuncioButton() {
  const [open, setOpen]       = useState(false);
  const [title, setTitle]     = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving]   = useState(false);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [error, setError]     = useState("");

  async function load() {
    const res = await fetch("/api/admin/anuncio");
    const d   = await res.json();
    setAnuncios(d.anuncios ?? []);
  }

  useEffect(() => { if (open) load(); }, [open]);

  async function publish() {
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/anuncio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Erro"); setSaving(false); return; }
    setTitle("");
    setMessage("");
    await load();
    setSaving(false);
  }

  async function remove(id: string) {
    await fetch("/api/admin/anuncio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAnuncios(a => a.filter(x => x.id !== id));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 text-sm font-medium transition-colors"
      >
        <Megaphone className="w-4 h-4" />
        Anúncios
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-green-400" />
                <h2 className="font-semibold">Anúncios para alunos</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* New announcement form */}
              <div className="space-y-3 pb-4 border-b border-white/5">
                <p className="text-xs text-gray-500">Novo anúncio (aparece nas notificações de todos os alunos)</p>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Título do anúncio *"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                />
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Mensagem (opcional)"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 resize-none"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  onClick={publish}
                  disabled={saving || !title.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publicar
                </button>
              </div>

              {/* Existing announcements */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Anúncios publicados</p>
                {anuncios.length === 0 ? (
                  <p className="text-xs text-gray-600 py-2">Nenhum anúncio publicado.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {anuncios.map(a => (
                      <div key={a.id} className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{a.title}</p>
                          {a.message && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.message}</p>}
                          <p className="text-[10px] text-gray-600 mt-1">
                            {new Date(a.updatedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <button
                          onClick={() => remove(a.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
