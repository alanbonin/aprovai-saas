"use client";
import { useState, useMemo } from "react";
import { Calculator, TrendingUp, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MateriaCfg {
  id: string;
  nome: string;
  questoes: number;
  pontos: number;
  minimo: number;  // mínimo de acertos para não ser eliminado
}

function uid() { return Math.random().toString(36).slice(2); }

const DEFAULT_MATERIAS: MateriaCfg[] = [
  { id: uid(), nome: "Língua Portuguesa", questoes: 20, pontos: 1, minimo: 10 },
  { id: uid(), nome: "Raciocínio Lógico",  questoes: 15, pontos: 1, minimo: 8 },
  { id: uid(), nome: "Direito Constitucional", questoes: 15, pontos: 1, minimo: 8 },
  { id: uid(), nome: "Direito Administrativo", questoes: 20, pontos: 1, minimo: 10 },
];

export default function CalculadoraPage() {
  const [materias, setMaterias] = useState<MateriaCfg[]>(DEFAULT_MATERIAS);
  const [notaCorte, setNotaCorte] = useState(60);   // % geral
  const [meuDesempenho, setMeuDesempenho] = useState(65); // % atual
  const [acertos, setAcertos] = useState<Record<string, number>>({});
  const [modo, setModo] = useState<"simples" | "detalhado">("simples");

  // Computed
  const totalQuestoes = materias.reduce((s, m) => s + m.questoes, 0);
  const totalPontos   = materias.reduce((s, m) => s + m.questoes * m.pontos, 0);
  const pontosCorte   = Math.ceil((notaCorte / 100) * totalPontos);
  const questoesNecessarias = Math.ceil((notaCorte / 100) * totalQuestoes);
  const pontosComDesempenho = Math.round((meuDesempenho / 100) * totalPontos);
  const aprovado = pontosComDesempenho >= pontosCorte;
  const margem = pontosComDesempenho - pontosCorte;

  // Probability based on current accuracy and questions remaining
  const prob = useMemo(() => {
    if (totalQuestoes === 0) return 0;
    // Simple normal approximation
    const p = meuDesempenho / 100;
    const mean = totalQuestoes * p;
    const std = Math.sqrt(totalQuestoes * p * (1 - p));
    // P(X >= questoesNecessarias) via normal CDF approximation
    const z = (questoesNecessarias - 0.5 - mean) / Math.max(std, 0.001);
    // erf approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const phi = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
    const cdf = z >= 0 ? 1 - phi : phi;
    return Math.round(Math.min(99, Math.max(1, cdf * 100)));
  }, [totalQuestoes, meuDesempenho, questoesNecessarias]);

  // Detailed mode: acertos por matéria
  const detalhado = useMemo(() => {
    return materias.map(m => {
      const a = acertos[m.id] ?? Math.round((meuDesempenho / 100) * m.questoes);
      const pts = a * m.pontos;
      const pct = m.questoes > 0 ? Math.round((a / m.questoes) * 100) : 0;
      const eliminado = a < m.minimo;
      return { ...m, acertosReal: a, pts, pct, eliminado };
    });
  }, [materias, acertos, meuDesempenho]);

  const totalAcertosDetalhado = detalhado.reduce((s, m) => s + m.pts, 0);
  const aprovadoDetalhado = totalAcertosDetalhado >= pontosCorte && !detalhado.some(m => m.eliminado);

  function addMateria() {
    setMaterias(prev => [...prev, { id: uid(), nome: "Nova matéria", questoes: 10, pontos: 1, minimo: 5 }]);
  }
  function removeMateria(id: string) {
    setMaterias(prev => prev.filter(m => m.id !== id));
    setAcertos(prev => { const n = { ...prev }; delete n[id]; return n; });
  }
  function updateMateria(id: string, field: keyof MateriaCfg, value: string | number) {
    setMaterias(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

  const probColor = prob >= 70 ? "text-emerald-400" : prob >= 40 ? "text-amber-400" : "text-red-400";
  const aprovadoColor = aprovado ? "text-emerald-400" : "text-red-400";

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-indigo-400" />
          Calculadora de Aprovação
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Simule cenários e descubra quantos acertos você precisa para ser aprovado
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5">
        {(["simples", "detalhado"] as const).map(m => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
              modo === m ? "bg-indigo-600 text-white shadow" : "text-gray-500 hover:text-white"
            )}
          >
            {m === "simples" ? "Simulação Rápida" : "Por Matéria"}
          </button>
        ))}
      </div>

      {/* Config */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Configuração do concurso</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Nota de corte: <span className="text-white font-bold">{notaCorte}%</span>
            </label>
            <input
              type="range" min={30} max={95} step={5} value={notaCorte}
              onChange={e => setNotaCorte(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>30%</span><span>95%</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Meu desempenho atual: <span className="text-white font-bold">{meuDesempenho}%</span>
            </label>
            <input
              type="range" min={10} max={100} step={5} value={meuDesempenho}
              onChange={e => setMeuDesempenho(Number(e.target.value))}
              className={cn("w-full", meuDesempenho >= notaCorte ? "accent-emerald-500" : "accent-amber-500")}
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>10%</span><span>100%</span>
            </div>
          </div>
        </div>

        {/* Matérias config — only in detailed mode */}
        {modo === "detalhado" && (
          <div className="mt-4 border-t border-white/[0.04] pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-medium">Matérias da prova</p>
              <button
                onClick={addMateria}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                + Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {materias.map(m => (
                <div key={m.id} className="grid grid-cols-12 gap-1.5 items-center text-xs">
                  <input
                    value={m.nome}
                    onChange={e => updateMateria(m.id, "nome", e.target.value)}
                    className="col-span-4 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500/50 text-xs"
                  />
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-gray-600 text-[10px]">Q:</span>
                    <input
                      type="number" inputMode="numeric" min={1} max={100} value={m.questoes}
                      onChange={e => updateMateria(m.id, "questoes", Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none text-xs text-center"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-gray-600 text-[10px]">Mín:</span>
                    <input
                      type="number" inputMode="numeric" min={0} max={m.questoes} value={m.minimo}
                      onChange={e => updateMateria(m.id, "minimo", Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none text-xs text-center"
                    />
                  </div>
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-gray-600 text-[10px]">Acertos:</span>
                    <input
                      type="number" inputMode="numeric" min={0} max={m.questoes}
                      value={acertos[m.id] ?? Math.round((meuDesempenho / 100) * m.questoes)}
                      onChange={e => setAcertos(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none text-xs text-center"
                    />
                  </div>
                  <button
                    onClick={() => removeMateria(m.id)}
                    className="col-span-1 text-gray-700 hover:text-red-400 transition-colors text-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {modo === "simples" ? (
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Result card */}
          <div className={cn(
            "col-span-2 rounded-2xl border p-5 flex items-center gap-5",
            aprovado ? "bg-emerald-500/[0.06] border-emerald-500/20" : "bg-rose-500/[0.06] border-rose-500/20"
          )}>
            {aprovado
              ? <CheckCircle className="w-10 h-10 text-emerald-400 flex-shrink-0" />
              : <AlertTriangle className="w-10 h-10 text-rose-400 flex-shrink-0" />}
            <div>
              <p className={cn("text-xl font-black", aprovadoColor)}>
                {aprovado ? "Seria aprovado ✓" : "Seria reprovado ✗"}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {aprovado
                  ? `Sua nota ficaria ${margem > 0 ? `${margem} pont${margem !== 1 ? "os" : "o"} acima` : "exatamente na"} da nota de corte.`
                  : `Faltam ${Math.abs(margem)} pont${Math.abs(margem) !== 1 ? "os" : "o"} para atingir a nota de corte.`}
              </p>
            </div>
          </div>

          {[
            { label: "Total de questões", value: totalQuestoes, suffix: " questões" },
            { label: "Pontos necessários", value: `${pontosCorte}/${totalPontos}`, suffix: "" },
            { label: "Questões a acertar", value: questoesNecessarias, suffix: ` de ${totalQuestoes}` },
            { label: "Probabilidade de aprovação", value: `${prob}%`, suffix: "", colorClass: probColor },
          ].map(c => (
            <div key={c.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className={cn("text-2xl font-black", c.colorClass ?? "text-white")}>
                {c.value}{c.suffix}
              </p>
              <p className="text-xs text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      ) : (
        /* Detailed mode */
        <div className="space-y-3 mb-5">
          {/* Overall result */}
          <div className={cn(
            "rounded-xl border p-4 flex items-center gap-3",
            aprovadoDetalhado ? "bg-emerald-500/[0.06] border-emerald-500/20" : "bg-rose-500/[0.06] border-rose-500/20"
          )}>
            {aprovadoDetalhado
              ? <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              : <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />}
            <div className="flex-1">
              <p className={cn("text-sm font-bold", aprovadoDetalhado ? "text-emerald-400" : "text-rose-400")}>
                {aprovadoDetalhado ? "Aprovado(a) neste cenário" : "Reprovado(a) neste cenário"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Total: {totalAcertosDetalhado}/{totalPontos} pontos · Corte: {pontosCorte} pontos
                {detalhado.some(m => m.eliminado) && " · Eliminado em alguma matéria"}
              </p>
            </div>
          </div>

          {/* Per-subject */}
          {detalhado.map(m => {
            const pct = m.pct;
            const barColor = m.eliminado ? "bg-red-500" : pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-amber-500";
            return (
              <div key={m.id} className={cn(
                "rounded-xl border p-4",
                m.eliminado ? "bg-red-500/[0.04] border-red-500/15" : "bg-white/[0.03] border-white/[0.06]"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white">{m.nome}</p>
                  <div className="flex items-center gap-2 text-xs">
                    {m.eliminado && (
                      <span className="text-red-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Eliminatória
                      </span>
                    )}
                    <span className={cn("font-bold font-mono", m.eliminado ? "text-red-400" : pct >= notaCorte ? "text-emerald-400" : "text-amber-400")}>
                      {m.acertosReal}/{m.questoes} ({pct}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
                </div>
                {m.eliminado && (
                  <p className="text-[10px] text-red-400 mt-1">
                    Mínimo exigido: {m.minimo} acertos — faltam {m.minimo - m.acertosReal}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl bg-indigo-500/[0.04] border border-indigo-500/10 p-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          💡 <span className="text-gray-400">Dica:</span>{" "}
          {meuDesempenho < notaCorte
            ? `Você precisa melhorar ${notaCorte - meuDesempenho}% no desempenho geral. Foque nas matérias com mais questões e nas que você tem pior taxa de acerto.`
            : `Seu desempenho atual já supera a nota de corte. Mantenha a consistência e pratique para solidificar o resultado.`}
        </p>
      </div>
    </div>
  );
}
