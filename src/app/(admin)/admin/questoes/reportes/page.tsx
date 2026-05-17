"use client";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X, ChevronDown, ChevronUp, Clock, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reporte {
  noteId: string;
  questionId: number;
  motivo: string;
  descricao: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  status: "pendente" | "resolvido" | "ignorado";
  createdAt: string;
  resolvedAt?: string;
}

const MOTIVO_LABELS: Record<string, string> = {
  gabarito_errado:         "Gabarito errado",
  enunciado_desatualizado: "Enunciado desatualizado",
  alternativas_incorretas: "Alternativas incorretas",
  questao_duplicada:       "Questão duplicada",
  outro:                   "Outro",
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function ReportesPage() {
  const [pendentes, setPendentes] = useState<Reporte[]>([]);
  const [resolvidos, setResolvidos] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showResolvidos, setShowResolvidos] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/questoes/reportes");
    if (res.ok) {
      const d = await res.json() as { pendentes: Reporte[]; resolvidos: Reporte[] };
      setPendentes(d.pendentes);
      setResolvidos(d.resolvidos);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function resolve(noteId: string, status: "resolvido" | "ignorado") {
    const res = await fetch("/api/admin/questoes/reportes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, status }),
    });
    if (res.ok) {
      showToast(status === "resolvido" ? "Marcado como resolvido" : "Reporte ignorado");
      void load();
    } else {
      showToast("Erro ao atualizar reporte", false);
    }
  }

  async function deleteReporte(noteId: string) {
    if (!confirm("Excluir este reporte permanentemente?")) return;
    const res = await fetch("/api/admin/questoes/reportes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    if (res.ok) { showToast("Reporte excluído"); void load(); }
    else showToast("Erro ao excluir", false);
  }

  function ReporteCard({ r, showActions }: { r: Reporte; showActions: boolean }) {
    const isExp = expanded === r.noteId;
    return (
      <div className={cn(
        "rounded-xl border transition-colors",
        r.status === "pendente"
          ? "bg-white/3 border-white/8 hover:bg-white/4"
          : "bg-white/2 border-white/5 opacity-70"
      )}>
        <div
          className="flex items-start gap-3 p-4 cursor-pointer"
          onClick={() => setExpanded(isExp ? null : r.noteId)}
        >
          <div className="flex-shrink-0 mt-0.5">
            {r.status === "pendente"
              ? <AlertCircle className="w-4 h-4 text-amber-400" />
              : r.status === "resolvido"
              ? <CheckCircle2 className="w-4 h-4 text-green-400" />
              : <X className="w-4 h-4 text-gray-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                r.status === "pendente"
                  ? "bg-amber-500/15 text-amber-400"
                  : r.status === "resolvido"
                  ? "bg-green-500/15 text-green-400"
                  : "bg-gray-500/15 text-gray-500"
              )}>
                {MOTIVO_LABELS[r.motivo] ?? r.motivo}
              </span>
              <span className="text-xs text-gray-600">Questão #{r.questionId}</span>
            </div>
            <p className="text-sm text-gray-300 mt-1">
              {r.userName} <span className="text-gray-600">· {r.userEmail}</span>
            </p>
            {r.descricao && !isExp && (
              <p className="text-xs text-gray-500 mt-1 truncate">{r.descricao}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {fmtDate(r.createdAt)}
            </span>
            {isExp ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
          </div>
        </div>

        {isExp && (
          <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
            {r.descricao && (
              <div className="rounded-lg bg-white/4 p-3">
                <p className="text-xs text-gray-400 mb-1">Descrição do aluno:</p>
                <p className="text-sm text-gray-200">{r.descricao}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <a
                href={`/admin/questoes?id=${r.questionId}`}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Ver questão #{r.questionId} →
              </a>
            </div>

            {showActions && r.status === "pendente" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => resolve(r.noteId, "resolvido")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-medium hover:bg-green-500/25 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marcar resolvido
                </button>
                <button
                  onClick={() => resolve(r.noteId, "ignorado")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Ignorar
                </button>
                <button
                  onClick={() => deleteReporte(r.noteId)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-700 hover:text-red-400 text-xs transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            )}

            {r.resolvedAt && (
              <p className="text-[10px] text-gray-600">Resolvido em {fmtDate(r.resolvedAt)}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 text-white max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl",
          toast.ok
            ? "bg-green-500/20 border border-green-500/30 text-green-300"
            : "bg-red-500/20 border border-red-500/30 text-red-300"
        )}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flag className="w-6 h-6 text-amber-400" /> Reportes de Questões
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {loading ? "Carregando…" : `${pendentes.length} pendente${pendentes.length !== 1 ? "s" : ""} · ${resolvidos.length} resolvido${resolvidos.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pendentes */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Pendentes ({pendentes.length})
            </h2>
            {pendentes.length === 0 ? (
              <div className="text-center py-10 rounded-xl border border-white/5 bg-white/2">
                <CheckCircle2 className="w-8 h-8 text-green-500/40 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Nenhum reporte pendente 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendentes.map(r => <ReporteCard key={r.noteId} r={r} showActions />)}
              </div>
            )}
          </section>

          {/* Resolvidos */}
          {resolvidos.length > 0 && (
            <section>
              <button
                onClick={() => setShowResolvidos(v => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-400 uppercase tracking-wider mb-3 transition-colors"
              >
                {showResolvidos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Histórico ({resolvidos.length})
              </button>
              {showResolvidos && (
                <div className="space-y-2">
                  {resolvidos.map(r => <ReporteCard key={r.noteId} r={r} showActions={false} />)}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
