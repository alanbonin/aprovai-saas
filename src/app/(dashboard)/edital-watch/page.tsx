"use client";
import { useState, useEffect } from "react";
import { Radar, Plus, X, RefreshCw, AlertCircle, Clock, Building2, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditalAlerta {
  orgao: string;
  status: "provavelmente_aberto" | "previsto" | "em_andamento" | "sem_info";
  titulo: string;
  descricao: string;
  banca?: string | null;
  vagas?: string | null;
  prazo?: string | null;
  salario?: string | null;
  fonte: string;
}

const STATUS_CONFIG = {
  em_andamento:         { label: "Em andamento",          color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400 animate-pulse" },
  provavelmente_aberto: { label: "Provavelmente aberto",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",       dot: "bg-blue-400" },
  previsto:             { label: "Previsto",               color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",     dot: "bg-amber-400" },
  sem_info:             { label: "Sem informação",         color: "text-gray-500",    bg: "bg-white/[0.03] border-white/[0.06]",    dot: "bg-gray-600" },
};

export default function EditalWatchPage() {
  const [orgaos, setOrgaos]         = useState<string[]>([]);
  const [alertas, setAlertas]       = useState<EditalAlerta[]>([]);
  const [loading, setLoading]       = useState(true);
  const [checking, setChecking]     = useState(false);
  const [newOrgao, setNewOrgao]     = useState("");
  const [adding, setAdding]         = useState(false);
  const [verificadoEm, setVerificadoEm] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace/edital-watch")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setOrgaos(d.orgaos ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function addOrgao() {
    const nome = newOrgao.trim();
    if (!nome) return;
    setAdding(true);
    const res = await fetch("/api/workspace/edital-watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", orgao: nome }),
    });
    if (res.ok) {
      const d = await res.json();
      setOrgaos(d.orgaos ?? []);
      setNewOrgao("");
    }
    setAdding(false);
  }

  async function removeOrgao(orgao: string) {
    const res = await fetch("/api/workspace/edital-watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", orgao }),
    });
    if (res.ok) {
      const d = await res.json();
      setOrgaos(d.orgaos ?? []);
      setAlertas(prev => prev.filter(a => a.orgao !== orgao));
    }
  }

  async function verificar() {
    setChecking(true);
    setError(null);
    const res = await fetch("/api/workspace/edital-watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verificar" }),
    });
    if (res.ok) {
      const d = await res.json();
      setAlertas(d.alertas ?? []);
      setVerificadoEm(d.verificadoEm ?? null);
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Erro ao verificar editais");
    }
    setChecking(false);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sort alertas: em_andamento > provavelmente_aberto > previsto > sem_info
  const ORDER = ["em_andamento", "provavelmente_aberto", "previsto", "sem_info"];
  const sorted = [...alertas].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radar className="w-6 h-6 text-indigo-400" />
            Radar de Concursos
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Monitore órgãos e verifique status de editais com IA
          </p>
        </div>
        {orgaos.length > 0 && (
          <button
            onClick={verificar}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
          >
            <RefreshCw className={cn("w-4 h-4", checking && "animate-spin")} />
            {checking ? "Verificando..." : "Verificar agora"}
          </button>
        )}
      </div>

      {/* Add org */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
        <p className="text-xs text-gray-500 mb-2">Adicionar órgão ao radar</p>
        <div className="flex gap-2">
          <input
            value={newOrgao}
            onChange={e => setNewOrgao(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addOrgao()}
            placeholder="Ex: STJ, PGE-SP, INSS, Receita Federal..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            onClick={addOrgao}
            disabled={adding || !newOrgao.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Watchlist chips */}
      {orgaos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {orgaos.map(o => (
            <div key={o} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
              <Building2 className="w-3 h-3 text-gray-500" />
              {o}
              <button
                onClick={() => removeOrgao(o)}
                className="text-gray-600 hover:text-red-400 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {orgaos.length === 0 && (
        <div className="text-center py-14">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Radar className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-300 mb-2">Nenhum órgão monitorado</h2>
          <p className="text-gray-600 text-sm max-w-xs mx-auto">
            Adicione órgãos ao radar e receba alertas sobre abertura de editais.
          </p>
        </div>
      )}

      {/* Checking */}
      {checking && (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Consultando base de conhecimento da IA...</p>
          <p className="text-gray-600 text-xs mt-1">Pode levar alguns segundos</p>
        </div>
      )}

      {/* Prompt to verify */}
      {orgaos.length > 0 && alertas.length === 0 && !checking && (
        <div className="text-center py-10 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <Radar className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">Clique em "Verificar agora" para checar os editais</p>
          <p className="text-gray-600 text-xs mt-1">A IA analisa {orgaos.length} órgão{orgaos.length !== 1 ? "s" : ""} monitorado{orgaos.length !== 1 ? "s" : ""}</p>
        </div>
      )}

      {/* Results */}
      {sorted.length > 0 && !checking && (
        <div className="space-y-3">
          {verificadoEm && (
            <p className="text-[11px] text-gray-600 flex items-center gap-1 mb-2">
              <Clock className="w-3 h-3" />
              Verificado em {new Date(verificadoEm).toLocaleString("pt-BR")} · dados baseados no conhecimento da IA
            </p>
          )}
          {sorted.map(a => {
            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.sem_info;
            return (
              <div key={a.orgao} className={cn("rounded-xl border p-5", cfg.bg)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-white text-sm">{a.orgao}</span>
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 border",
                        cfg.bg, cfg.color
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 font-medium">{a.titulo}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed mb-3">{a.descricao}</p>

                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {a.banca && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {a.banca}
                    </span>
                  )}
                  {a.vagas && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {a.vagas} vagas
                    </span>
                  )}
                  {a.salario && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> {a.salario}
                    </span>
                  )}
                  {a.prazo && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {a.prazo}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <p className="text-[10px] text-gray-700 text-center pt-1">
            ⚠️ Informações baseadas no conhecimento da IA — confirme sempre no site oficial do órgão.
          </p>
        </div>
      )}
    </div>
  );
}
