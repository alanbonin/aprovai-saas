"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, Play, Send, RefreshCw, AlertCircle, ChevronDown } from "lucide-react";

const TEMAS = [
  { id: "corrupcao",      label: "Corrupção e desvio de conduta",          icon: "⚖️" },
  { id: "administrativo", label: "Processo administrativo disciplinar",     icon: "📋" },
  { id: "flagrante",      label: "Prisão em flagrante",                     icon: "🚨" },
  { id: "inquerito",      label: "Inquérito policial",                      icon: "🔍" },
  { id: "direitos",       label: "Direitos fundamentais e abuso de poder",  icon: "🛡️" },
  { id: "etica",          label: "Ética no serviço público",                icon: "🤝" },
  { id: "licitacao",      label: "Licitações e contratos",                  icon: "📄" },
  { id: "ambiental",      label: "Crime ambiental",                         icon: "🌿" },
  { id: "organizacao",    label: "Organização administrativa",              icon: "🏛️" },
  { id: "atendimento",    label: "Atendimento ao cidadão",                  icon: "👥" },
];

interface Cenario {
  titulo: string;
  contexto: string;
  pergunta: string;
  dicas: string[];
  criterios: string[];
}

interface Avaliacao {
  nota: number;
  acertos: string[];
  melhorias: string[];
  dica_banca: string;
  gabarito_resumido: string;
}

export function CasoClient() {
  const [tema, setTema] = useState(TEMAS[0].id);
  const [cargo, setCargo] = useState("");
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [resposta, setResposta] = useState("");
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [loadingGerar, setLoadingGerar] = useState(false);
  const [loadingAvaliar, setLoadingAvaliar] = useState(false);
  const [error, setError] = useState("");
  const [showGabarito, setShowGabarito] = useState(false);
  const [showDicas, setShowDicas] = useState(false);

  async function gerarCenario() {
    setLoadingGerar(true);
    setError("");
    setCenario(null);
    setAvaliacao(null);
    setResposta("");
    try {
      const res = await fetch("/api/caso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gerar", tema, cargo }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setCenario(data);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoadingGerar(false);
    }
  }

  async function avaliarResposta(e: React.FormEvent) {
    e.preventDefault();
    if (!cenario || !resposta.trim() || loadingAvaliar) return;
    setLoadingAvaliar(true);
    setError("");
    try {
      const res = await fetch("/api/caso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "avaliar",
          cenario: `${cenario.titulo}\n\n${cenario.contexto}\n\nPergunta: ${cenario.pergunta}`,
          resposta,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setAvaliacao(data);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoadingAvaliar(false);
    }
  }

  const temaSel = TEMAS.find(t => t.id === tema) ?? TEMAS[0];

  return (
    <div className="p-8 text-white max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-purple-400" /> Estudo de Caso
        </h1>
        <p className="text-gray-400 mt-1">Resolva casos práticos e receba feedback detalhado com IA</p>
      </div>

      {/* Seleção de tema */}
      {!cenario && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Escolha o tema do caso</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-5">
            {TEMAS.map(t => (
              <button key={t.id} onClick={() => setTema(t.id)}
                className={cn(
                  "flex flex-col items-center p-3 rounded-xl border text-center transition-all",
                  tema === t.id
                    ? "border-purple-500/60 bg-purple-500/10 text-purple-300"
                    : "border-white/10 bg-white/3 text-gray-400 hover:border-white/20"
                )}>
                <span className="text-xl mb-1">{t.icon}</span>
                <span className="text-[11px] leading-tight">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Cargo / concurso <span className="text-gray-600 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={cargo}
              onChange={e => setCargo(e.target.value)}
              placeholder="Ex: Delegado de Polícia Federal, Auditor da Receita..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button onClick={gerarCenario} disabled={loadingGerar}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium">
            {loadingGerar ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando caso...</>
            ) : (
              <><Play className="w-4 h-4" /> Gerar caso sobre {temaSel.icon} {temaSel.label}</>
            )}
          </button>
        </div>
      )}

      {/* Cenário */}
      {cenario && (
        <div>
          <div className="rounded-xl bg-white/5 border border-white/5 p-6 mb-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-white">{cenario.titulo}</h2>
              <button onClick={() => { setCenario(null); setAvaliacao(null); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors flex-shrink-0">
                <RefreshCw className="w-3 h-3" /> Novo caso
              </button>
            </div>
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mb-5">{cenario.contexto}</div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <p className="text-xs text-purple-400 font-semibold mb-1">❓ Pergunta:</p>
              <p className="text-sm text-purple-200">{cenario.pergunta}</p>
            </div>

            {/* Dicas */}
            <button onClick={() => setShowDicas(r => !r)}
              className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors">
              <ChevronDown className={cn("w-3 h-3 transition-transform", showDicas && "rotate-180")} />
              {showDicas ? "Ocultar dicas" : "Ver dicas do que avaliar"}
            </button>
            {showDicas && (
              <ul className="mt-2 space-y-1">
                {cenario.dicas.map((d, i) => (
                  <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                    <span className="text-purple-600">•</span>{d}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Resposta */}
          {!avaliacao && (
            <form onSubmit={avaliarResposta}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sua resposta <span className="text-gray-600 font-normal">({resposta.length} caracteres)</span>
              </label>
              <textarea
                value={resposta}
                onChange={e => setResposta(e.target.value)}
                rows={12}
                required
                placeholder="Escreva sua resposta ao caso. Identifique o problema, fundamente juridicamente e proponha uma solução..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed mb-4"
              />
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <button type="submit" disabled={loadingAvaliar || !resposta.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium">
                {loadingAvaliar ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Avaliando...</>
                ) : (
                  <><Send className="w-4 h-4" /> Enviar para avaliação</>
                )}
              </button>
            </form>
          )}

          {/* Avaliação */}
          {avaliacao && (
            <div className="space-y-4">
              {/* Nota */}
              <div className="rounded-xl bg-white/5 border border-white/5 p-6 flex items-center gap-6">
                <div className="text-center">
                  <p className={cn(
                    "text-5xl font-bold",
                    avaliacao.nota >= 8 ? "text-green-400" :
                    avaliacao.nota >= 6 ? "text-yellow-400" : "text-red-400"
                  )}>{avaliacao.nota.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">nota / 10</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-amber-400 font-semibold mb-1">⚡ Dica da banca</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{avaliacao.dica_banca}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
                  <h3 className="text-sm font-semibold text-green-400 mb-2">✅ Acertos</h3>
                  <ul className="space-y-1.5">
                    {avaliacao.acertos.map((a, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                        <span className="text-green-500 flex-shrink-0">•</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                  <h3 className="text-sm font-semibold text-amber-400 mb-2">📝 A melhorar</h3>
                  <ul className="space-y-1.5">
                    {avaliacao.melhorias.map((m, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                        <span className="text-amber-500 flex-shrink-0">•</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                <button onClick={() => setShowGabarito(r => !r)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  <span>🏆 Gabarito resumido</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showGabarito && "rotate-180")} />
                </button>
                {showGabarito && (
                  <div className="px-5 pb-5 border-t border-white/5">
                    <p className="text-sm text-gray-300 leading-relaxed mt-4">{avaliacao.gabarito_resumido}</p>
                  </div>
                )}
              </div>

              <button onClick={() => { setCenario(null); setAvaliacao(null); setResposta(""); setShowGabarito(false); }}
                className="flex items-center gap-2 px-5 py-2.5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors">
                <RefreshCw className="w-4 h-4" /> Novo caso
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
