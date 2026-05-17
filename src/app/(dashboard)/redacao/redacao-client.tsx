"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Send, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";

const TIPOS = [
  { id: "oficio",       label: "Ofício",                desc: "Comunicação oficial entre órgãos" },
  { id: "relatorio",    label: "Relatório APF",          desc: "Relatório de atividade policial/administrativa" },
  { id: "requerimento", label: "Requerimento",           desc: "Pedido formal dirigido a autoridade" },
  { id: "auto",         label: "Auto de Prisão",         desc: "Registro formal de prisão em flagrante" },
  { id: "portaria",     label: "Portaria",               desc: "Ato normativo interno de autoridade" },
  { id: "despacho",     label: "Despacho",               desc: "Decisão em processo administrativo" },
];

interface Resultado {
  notas: Record<string, number>;
  nota_final: number;
  criterios: string[];
  pontos_fortes: string[];
  pontos_melhoria: string[];
  versao_corrigida: string;
  parecer: string;
}

function NotaBar({ nota, label }: { nota: number; label: string }) {
  const cor = nota >= 8 ? "bg-green-500" : nota >= 6 ? "bg-yellow-500" : "bg-red-500";
  const corText = nota >= 8 ? "text-green-400" : nota >= 6 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-400 text-[11px] leading-tight max-w-72">{label}</span>
        <span className={cn("font-bold", corText)}>{nota.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", cor)} style={{ width: `${nota * 10}%` }} />
      </div>
    </div>
  );
}

export function RedacaoClient() {
  const [tipo, setTipo] = useState(TIPOS[0].id);
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");
  const [showCorrigida, setShowCorrigida] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || loading) return;
    setLoading(true);
    setResultado(null);
    setError("");
    try {
      const res = await fetch("/api/redacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, tema, texto }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResultado(data);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const tipoSel = TIPOS.find(t => t.id === tipo) ?? TIPOS[0];

  return (
    <div className="p-8 text-white max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-400" /> Redação Oficial
        </h1>
        <p className="text-gray-400 mt-1">Escreva um documento e receba correção com IA especializada em concursos</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tipo de documento */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de documento</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TIPOS.map(t => (
              <button key={t.id} type="button" onClick={() => setTipo(t.id)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  tipo === t.id
                    ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                    : "border-white/10 bg-white/3 text-gray-400 hover:border-white/20"
                )}>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tema / contexto */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tema / contexto <span className="text-gray-600 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={tema}
            onChange={e => setTema(e.target.value)}
            placeholder={`Ex: Solicitar ao chefe do departamento o afastamento para capacitação`}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Texto */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Seu {tipoSel.label}
            <span className="ml-2 text-xs text-gray-600">{texto.length} caracteres</span>
          </label>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={14}
            required
            placeholder={`Digite seu ${tipoSel.label} aqui. Inclua todas as partes obrigatórias do documento (cabeçalho, corpo, assinatura)...`}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono leading-relaxed"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <button type="submit" disabled={loading || !texto.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Corrigindo com IA...</>
          ) : (
            <><Send className="w-4 h-4" /> Enviar para correção</>
          )}
        </button>
      </form>

      {/* Resultado */}
      {resultado && (
        <div className="mt-8 space-y-5">
          {/* Nota final */}
          <div className="rounded-xl bg-white/5 border border-white/5 p-6 flex items-center gap-6">
            <div className="text-center">
              <p className={cn(
                "text-5xl font-bold",
                resultado.nota_final >= 8 ? "text-green-400" :
                resultado.nota_final >= 6 ? "text-yellow-400" : "text-red-400"
              )}>{resultado.nota_final.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">nota final / 10</p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300 leading-relaxed">{resultado.parecer}</p>
            </div>
          </div>

          {/* Critérios */}
          <div className="rounded-xl bg-white/5 border border-white/5 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Avaliação por critério</h2>
            {resultado.criterios.map((c, i) => (
              <NotaBar key={i} label={c} nota={resultado.notas[`criterio${i + 1}`] ?? 0} />
            ))}
          </div>

          {/* Pontos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
              <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Pontos fortes
              </h3>
              <ul className="space-y-1.5">
                {resultado.pontos_fortes.map((p, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
              <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> A melhorar
              </h3>
              <ul className="space-y-1.5">
                {resultado.pontos_melhoria.map((p, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Versão corrigida */}
          <div className="rounded-xl bg-white/5 border border-white/5 overflow-hidden">
            <button onClick={() => setShowCorrigida(r => !r)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              <span>📝 Versão corrigida pela IA</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showCorrigida && "rotate-180")} />
            </button>
            {showCorrigida && (
              <div className="px-5 pb-5 border-t border-white/5">
                <pre className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono mt-4 bg-white/3 rounded-lg p-4 overflow-x-auto">
                  {resultado.versao_corrigida}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
