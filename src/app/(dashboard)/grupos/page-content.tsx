"use client";
import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Copy, Check, Link2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Grupo {
  id: string;
  nome: string;
  code: string;
  criadoEm: string;
  ultimaSessao: string | null;
  membros: number;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function GruposInner() {
  const [grupos, setGrupos]       = useState<Grupo[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [copied, setCopied]       = useState<string | null>(null);

  // New group form
  const [showNew, setShowNew]   = useState(false);
  const [newNome, setNewNome]   = useState("");
  const [newCode, setNewCode]   = useState(generateCode());

  // Join form
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinNome, setJoinNome] = useState("");

  async function load() {
    const res = await fetch("/api/workspace/grupos");
    if (res.ok) {
      const d = await res.json();
      setGrupos(d.grupos ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createGroup() {
    if (!newNome.trim()) return;
    setSaving(true);
    const res = await fetch("/api/workspace/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", nome: newNome.trim(), code: newCode }),
    });
    if (res.ok) {
      const d = await res.json();
      setGrupos(d.grupos ?? []);
      setShowNew(false);
      setNewNome("");
      setNewCode(generateCode());
    }
    setSaving(false);
  }

  async function joinGroup() {
    const code = joinCode.trim().toUpperCase();
    const nome = joinNome.trim() || `Grupo ${code}`;
    if (!code) return;
    setSaving(true);
    const res = await fetch("/api/workspace/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", nome, code }),
    });
    if (res.ok) {
      const d = await res.json();
      setGrupos(d.grupos ?? []);
      setShowJoin(false);
      setJoinCode("");
      setJoinNome("");
    }
    setSaving(false);
  }

  async function removeGroup(id: string) {
    if (!confirm("Sair deste grupo?")) return;
    const res = await fetch("/api/workspace/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", id }),
    });
    if (res.ok) {
      const d = await res.json();
      setGrupos(d.grupos ?? []);
    }
  }

  async function touchGroup(code: string) {
    await fetch("/api/workspace/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "touch", code }),
    });
    await load();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Grupos de Estudo
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Crie ou entre em grupos para estudar em conjunto
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setShowNew(false); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs font-medium transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            Entrar
          </button>
          <button
            onClick={() => { setShowNew(true); setShowJoin(false); setNewCode(generateCode()); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar grupo
          </button>
        </div>
      </div>

      {/* Create form */}
      {showNew && (
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 mb-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Criar novo grupo</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Nome do grupo</label>
              <input
                value={newNome}
                onChange={e => setNewNome(e.target.value)}
                placeholder="Ex: Concurseiros TRF5 - Cargo Analista"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Código de convite</label>
              <div className="flex gap-2">
                <input
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 8))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500/50"
                />
                <button
                  onClick={() => setNewCode(generateCode())}
                  className="p-2.5 rounded-xl border border-white/10 text-gray-500 hover:text-white transition-colors"
                  title="Gerar novo código"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Compartilhe este código com seus colegas</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowNew(false)}
              className="flex-1 py-2 rounded-xl border border-white/10 text-gray-500 text-sm transition-colors hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={createGroup}
              disabled={saving || !newNome.trim()}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
            >
              {saving ? "Criando..." : "Criar grupo"}
            </button>
          </div>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 mb-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Entrar em um grupo</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Código do grupo</label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Nome do grupo (opcional)</label>
              <input
                value={joinNome}
                onChange={e => setJoinNome(e.target.value)}
                placeholder="Deixe em branco para usar o código"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowJoin(false)}
              className="flex-1 py-2 rounded-xl border border-white/10 text-gray-500 text-sm hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={joinGroup}
              disabled={saving || !joinCode.trim()}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
            >
              {saving ? "Entrando..." : "Entrar no grupo"}
            </button>
          </div>
        </div>
      )}

      {/* Groups list */}
      {grupos.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-300 mb-2">Nenhum grupo ainda</h2>
          <p className="text-gray-600 text-sm max-w-xs mx-auto">
            Crie um grupo e compartilhe o código com seus colegas, ou entre em um grupo com o código deles.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(g => (
            <div
              key={g.id}
              className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-4 group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-indigo-600/15 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-indigo-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{g.nome}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-gray-400">{g.code}</span>
                  <span>{g.membros} membro{g.membros !== 1 ? "s" : ""}</span>
                  <span>Última sessão: {fmtDate(g.ultimaSessao)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => copyCode(g.code)}
                  title="Copiar código"
                  className="p-2 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                >
                  {copied === g.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => touchGroup(g.code)}
                  title="Marcar sessão agora"
                  className="p-2 rounded-lg text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeGroup(g.id)}
                  title="Sair do grupo"
                  className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      {grupos.length > 0 && (
        <div className="mt-6 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/10 p-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            💡 <span className="text-gray-400">Compartilhe o código do grupo</span> com seus colegas para que eles entrem. Os grupos são locais — cada membro gerencia sua própria lista.
          </p>
        </div>
      )}
    </div>
  );
}
