"use client";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  FileText, Send, ChevronDown, CheckCircle2, AlertCircle,
  Camera, PenLine, Loader2, X, ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TipoDoc { id: string; label: string; desc: string; }

interface Resultado {
  notas: Record<string, number>;
  nota_final: number;
  criterios: string[];
  pontos_fortes: string[];
  pontos_melhoria: string[];
  versao_corrigida: string;
  parecer: string;
}

type InputMode = "texto" | "foto";

const TIPOS_FALLBACK: TipoDoc[] = [
  { id: "oficio",       label: "Ofício",          desc: "Comunicação entre órgãos" },
  { id: "memorando",    label: "Memorando",        desc: "Comunicação interna" },
  { id: "relatorio",    label: "Relatório",        desc: "Relatório técnico/administrativo" },
  { id: "requerimento", label: "Requerimento",     desc: "Pedido formal à autoridade" },
  { id: "portaria",     label: "Portaria",         desc: "Ato normativo interno" },
  { id: "despacho",     label: "Despacho",         desc: "Decisão em processo" },
];

// ─── Barra de nota ────────────────────────────────────────────────────────────
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

// ─── Toggle modo de input ─────────────────────────────────────────────────────
function InputModeToggle({ mode, onChange }: { mode: InputMode; onChange: (m: InputMode) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
      {(["texto", "foto"] as InputMode[]).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            mode === m ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
          )}
        >
          {m === "texto" ? <PenLine className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
          {m === "texto" ? "Escrever" : "Foto da redação"}
        </button>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function RedacaoClient() {
  // Tipos personalizados
  const [tipos, setTipos] = useState<TipoDoc[]>(TIPOS_FALLBACK);
  const [tiposLoading, setTiposLoading] = useState(true);

  // Form
  const [tipo, setTipo] = useState(TIPOS_FALLBACK[0].id);
  const [tema, setTema] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("texto");
  const [texto, setTexto] = useState("");

  // Foto
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState("");
  const [fotoType, setFotoType] = useState("image/jpeg");
  const [fotoError, setFotoError] = useState("");
  const [fotoTentativas, setFotoTentativas] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Estado
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");
  const [showCorrigida, setShowCorrigida] = useState(false);

  // Carrega tipos personalizados pelo perfil do aluno
  useEffect(() => {
    setTiposLoading(true);
    fetch("/api/redacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sugerir_tipos" }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.tipos?.length > 0) {
          setTipos(d.tipos as TipoDoc[]);
          setTipo((d.tipos[0] as TipoDoc).id);
        }
      })
      .catch(() => { /* mantém fallback */ })
      .finally(() => setTiposLoading(false));
  }, []);

  // Processa arquivo de foto
  function handleFotoFile(file: File) {
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      const [meta, b64] = result.split(",");
      setFotoType(meta.split(":")[1]?.split(";")[0] ?? "image/jpeg");
      setFotoBase64(b64);
      setFotoPreview(result);
      setFotoError(""); // limpa erro ao selecionar nova foto
    };
    reader.readAsDataURL(file);
  }

  function clearFoto() { setFotoPreview(null); setFotoBase64(""); setFotoType("image/jpeg"); }

  function resetTudo() {
    setResultado(null);
    setTexto("");
    clearFoto();
    setError("");
    setFotoError("");
    setFotoTentativas(0);
    setShowCorrigida(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (inputMode === "texto" && !texto.trim()) return;
    if (inputMode === "foto" && !fotoBase64) return;

    setLoading(true);
    setResultado(null);
    setError("");
    setFotoError("");

    try {
      const res = await fetch("/api/redacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          tema: tema.trim() || undefined,
          texto: inputMode === "texto" ? texto : undefined,
          fotoBase64: inputMode === "foto" ? fotoBase64 : undefined,
          fotoType: inputMode === "foto" ? fotoType : undefined,
        }),
      });

      const data = await res.json() as Resultado & {
        error?: string;
        ilegivel?: boolean;
        motivo?: string;
      };

      if (res.status === 422 && data.ilegivel) {
        const novaTentativa = fotoTentativas + 1;
        setFotoTentativas(novaTentativa);
        clearFoto();

        if (novaTentativa >= 2) {
          setFotoError("Não foi possível avaliar. A imagem não está nítida o suficiente. Use o modo \"Escrever\" para digitar o texto.");
        } else {
          setFotoError("Imagem ilegível. Por favor, tire uma foto mais nítida com boa iluminação e enquadramento.");
        }
        setLoading(false);
        return;
      }

      if (data.error) { setError(data.error); setLoading(false); return; }
      setResultado(data);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const tipoSel = tipos.find(t => t.id === tipo) ?? tipos[0];
  const podeEnviar = inputMode === "texto" ? texto.trim().length > 0 : !!fotoBase64;

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-400" /> Redação Oficial
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Escreva ou fotografe sua redação e receba correção completa com IA
        </p>
      </div>

      {!resultado ? (
        <form onSubmit={handleSubmit}>
          {/* Tipo de documento */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de documento
              {tiposLoading && <span className="ml-2 text-xs text-gray-600 font-normal">Personalizando...</span>}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tipos.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    tipo === t.id
                      ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                      : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20"
                  )}
                >
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tema */}
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

          {/* Input mode toggle */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                {inputMode === "texto"
                  ? `Seu ${tipoSel?.label ?? "documento"}`
                  : "Foto da redação manuscrita"}
                {inputMode === "texto" && (
                  <span className="ml-2 text-xs text-gray-600 font-normal">{texto.length} caracteres</span>
                )}
              </label>
              <InputModeToggle
                mode={inputMode}
                onChange={m => { setInputMode(m); clearFoto(); setFotoError(""); setFotoTentativas(0); }}
              />
            </div>

            {inputMode === "texto" ? (
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                rows={14}
                required
                placeholder={`Digite seu ${tipoSel?.label ?? "documento"} aqui. Inclua todas as partes obrigatórias (cabeçalho, corpo, assinatura)...`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono leading-relaxed"
              />
            ) : (
              <div>
                {!fotoPreview ? (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-xl p-10 flex flex-col items-center gap-3 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Camera className="w-10 h-10 opacity-40" />
                    <span className="text-sm font-medium">Fotografar redação escrita no papel</span>
                    <span className="text-xs opacity-50">Garanta boa iluminação e imagem nítida — câmera ou galeria</span>
                  </button>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fotoPreview} alt="Redação" className="w-full max-h-72 object-contain bg-black/30" />
                    <button
                      type="button"
                      onClick={clearFoto}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1 text-[11px] text-gray-300">
                      <ImageIcon className="w-3 h-3" /> Imagem carregada
                    </div>
                  </div>
                )}

                {fotoError && (
                  <div className={cn(
                    "mt-3 flex items-start gap-2 p-3 rounded-lg text-sm",
                    fotoTentativas >= 2
                      ? "bg-red-500/10 border border-red-500/20 text-red-300"
                      : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                  )}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{fotoError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoFile(f); e.target.value = ""; }}
          />

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !podeEnviar || (inputMode === "foto" && fotoTentativas >= 2)}
            className="mt-4 flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Corrigindo com IA...</>
              : <><Send className="w-4 h-4" /> Enviar para correção</>
            }
          </button>
        </form>
      ) : (
        /* ── Resultado ───────────────────────────────────────────────────────── */
        <div className="space-y-5">
          {/* Nota final + parecer */}
          <div className="rounded-xl bg-white/5 border border-white/5 p-6 flex items-center gap-6">
            <div className="text-center flex-shrink-0">
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
            <button
              onClick={() => setShowCorrigida(r => !r)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <span>📝 Versão corrigida pela IA</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showCorrigida && "rotate-180")} />
            </button>
            {showCorrigida && (
              <div className="px-5 pb-5 border-t border-white/5">
                <pre className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono mt-4 bg-white/[0.03] rounded-lg p-4 overflow-x-auto">
                  {resultado.versao_corrigida}
                </pre>
              </div>
            )}
          </div>

          <button
            onClick={resetTudo}
            className="flex items-center gap-2 px-5 py-2.5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
          >
            <FileText className="w-4 h-4" /> Nova redação
          </button>
        </div>
      )}
    </div>
  );
}
