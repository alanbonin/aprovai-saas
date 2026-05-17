"use client";
import { useState, useEffect } from "react";
import { BookOpen, Search, X, Sparkles, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Termo {
  termo: string;
  definicao: string;
}

interface SearchEntry {
  id: string;
  input: string;
  termos: Termo[];
  timestamp: string;
}

const STORAGE_KEY = "glossario-historico";
const MAX_HISTORY = 10;

function loadHistory(): SearchEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch { return []; }
}

function saveHistory(entries: SearchEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

const EXEMPLOS = [
  "O princípio da autotutela permite à Administração Pública revogar seus próprios atos discricionários.",
  "A licitação na modalidade pregão eletrônico é obrigatória para aquisição de bens e serviços comuns.",
  "O mandado de segurança protege direito líquido e certo não amparado por habeas corpus ou habeas data.",
  "O servidor público estável só perderá o cargo mediante processo administrativo disciplinar.",
];

export default function GlossarioPage() {
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<Termo[] | null>(null);
  const [history, setHistory]   = useState<SearchEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState("");

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function search(text?: string) {
    const enunciado = (text ?? input).trim();
    if (!enunciado) return;
    setLoading(true);
    setResult(null);
    setCurrentInput(enunciado);

    const res = await fetch("/api/workspace/glossario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enunciado }),
    });

    if (res.ok) {
      const d = await res.json();
      const termos: Termo[] = d.termos ?? [];
      setResult(termos);

      if (termos.length > 0) {
        const entry: SearchEntry = {
          id: crypto.randomUUID(),
          input: enunciado.slice(0, 120),
          termos,
          timestamp: new Date().toISOString(),
        };
        const updated = [entry, ...history.filter(h => h.input !== entry.input)];
        setHistory(updated);
        saveHistory(updated);
      }
    }
    setLoading(false);
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function useExample(ex: string) {
    setInput(ex);
    search(ex);
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-400" />
          Glossário Jurídico
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Cole um trecho de questão ou enunciado — a IA identifica e define os termos técnicos
        </p>
      </div>

      {/* Search box */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Cole aqui um enunciado, trecho de lei, ou texto de questão..."
          rows={4}
          maxLength={800}
          className="w-full bg-transparent text-sm text-white placeholder-gray-600 resize-none focus:outline-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
          <span className="text-[10px] text-gray-600">{input.length}/800 caracteres</span>
          <div className="flex gap-2">
            {input && (
              <button
                onClick={() => { setInput(""); setResult(null); }}
                className="p-1.5 text-gray-600 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => search()}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? "Analisando..." : "Identificar termos"}
            </button>
          </div>
        </div>
      </div>

      {/* Example texts */}
      {!result && !loading && (
        <div className="mb-6">
          <p className="text-xs text-gray-600 mb-2 font-medium uppercase tracking-wider">Exemplos de uso</p>
          <div className="grid grid-cols-1 gap-2">
            {EXEMPLOS.map((ex, i) => (
              <button
                key={i}
                onClick={() => useExample(ex)}
                className="text-left text-xs text-gray-500 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/15 hover:text-gray-300 transition-all leading-relaxed"
              >
                "{ex.slice(0, 90)}..."
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-300">
              {result.length === 0
                ? "Nenhum termo técnico identificado"
                : `${result.length} termo${result.length !== 1 ? "s" : ""} identificado${result.length !== 1 ? "s" : ""}`}
            </p>
            {result.length === 0 && (
              <p className="text-xs text-gray-600">Tente um texto mais técnico</p>
            )}
          </div>

          {result.length > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden mb-2">
              <div className="p-3 border-b border-white/[0.04] bg-white/[0.01]">
                <p className="text-[11px] text-gray-600 italic leading-relaxed line-clamp-2">
                  "{currentInput.slice(0, 150)}{currentInput.length > 150 ? "..." : ""}"
                </p>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {result.map((t, i) => (
                  <div key={i} className="p-4">
                    <p className="text-sm font-bold text-indigo-300 mb-1.5">{t.termo}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{t.definicao}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { setResult(null); setInput(""); }}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            ← Nova consulta
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Histórico recente
            </p>
            <button
              onClick={clearHistory}
              className="text-[10px] text-gray-700 hover:text-red-400 transition-colors"
            >
              Limpar
            </button>
          </div>
          <div className="space-y-2">
            {history.map(entry => {
              const isExp = expanded === entry.id;
              return (
                <div
                  key={entry.id}
                  className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden"
                >
                  <button
                    onClick={() => setExpanded(isExp ? null : entry.id)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    <p className="flex-1 text-xs text-gray-400 truncate">{entry.input}</p>
                    <span className="text-[10px] text-gray-700 flex-shrink-0">
                      {entry.termos.length} termo{entry.termos.length !== 1 ? "s" : ""}
                    </span>
                    {isExp ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    )}
                  </button>
                  {isExp && (
                    <div className="px-4 pb-3 border-t border-white/[0.03] divide-y divide-white/[0.03]">
                      {entry.termos.map((t, i) => (
                        <div key={i} className="py-2.5">
                          <p className="text-xs font-bold text-indigo-400 mb-0.5">{t.termo}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{t.definicao}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
