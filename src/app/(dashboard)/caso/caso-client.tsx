"use client";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useUpgradeModal } from "@/components/ui/upgrade-modal-context";
import {
  BookOpen, Play, Send, RefreshCw, AlertCircle, ChevronDown,
  PenLine, Camera, Loader2, X, ImageIcon, CheckCircle2,
  AlertTriangle, Target, Lightbulb, BookOpenCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tema { id: string; label: string; icon: string; }

interface Cenario {
  titulo: string;
  contexto: string;
  pergunta: string;
  dicas: string[];
  criterios: string[];
}

interface Avaliacao {
  nota: number;
  classificacao: string;
  acertos: string[];
  melhorias: string[];
  pontos_criticos: string[];
  dica_banca: string;
  dicas_estudo: string[];
  gabarito_resumido: string;
}

type Modo = "ia" | "tema";
type InputMode = "texto" | "foto";

const TEMAS_FALLBACK: Tema[] = [
  { id: "etica",          label: "Ética no serviço público",    icon: "🤝" },
  { id: "licitacao",      label: "Licitações e contratos",      icon: "📄" },
  { id: "administrativo", label: "Processo administrativo",     icon: "📋" },
  { id: "atendimento",    label: "Atendimento ao cidadão",      icon: "👥" },
  { id: "corrupcao",      label: "Corrupção e desvio de conduta", icon: "⚖️" },
  { id: "organizacao",    label: "Organização administrativa",  icon: "🏛️" },
];

// ─── Foto input reutilizável ──────────────────────────────────────────────────
function FotoInput({
  preview,
  onFile,
  onClear,
  label,
  hint,
}: {
  preview: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
  label: string;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div>
      {!preview ? (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full border-2 border-dashed border-white/10 hover:border-purple-500/40 rounded-xl p-8 flex flex-col items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Camera className="w-8 h-8 opacity-40" />
          <span className="text-sm font-medium">{label}</span>
          {hint && <span className="text-xs opacity-50">{hint}</span>}
        </button>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Imagem" className="w-full max-h-56 object-contain bg-black/30" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1 text-[11px] text-gray-300">
            <ImageIcon className="w-3 h-3" /> Imagem carregada
          </div>
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ─── Toggle texto / foto ──────────────────────────────────────────────────────
function InputModeToggle({ mode, onChange }: { mode: InputMode; onChange: (m: InputMode) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit mb-3">
      {(["texto", "foto"] as InputMode[]).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            mode === m ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
          )}
        >
          {m === "texto" ? <PenLine className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
          {m === "texto" ? "Escrever" : "Foto"}
        </button>
      ))}
    </div>
  );
}

// ─── Bloco de avaliação completo ──────────────────────────────────────────────
function AvaliacaoView({ av, onNovo }: { av: Avaliacao; onNovo: () => void }) {
  const [showGabarito, setShowGabarito] = useState(false);

  const classColor =
    av.classificacao === "Aprovado" ? "text-green-400 border-green-500/30 bg-green-500/5" :
    av.classificacao === "Recuperação" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/5" :
    "text-red-400 border-red-500/30 bg-red-500/5";

  return (
    <div className="space-y-4">
      {/* Nota + classificação + dica banca */}
      <div className="rounded-xl bg-white/5 border border-white/5 p-5 flex items-center gap-5">
        <div className="text-center flex-shrink-0">
          <p className={cn("text-5xl font-bold",
            av.nota >= 7 ? "text-green-400" : av.nota >= 5 ? "text-yellow-400" : "text-red-400"
          )}>{av.nota.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-0.5">/ 10</p>
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn("inline-block text-xs font-semibold px-2.5 py-1 rounded-full border mb-2", classColor)}>
            {av.classificacao}
          </span>
          <p className="text-xs text-amber-400 font-semibold mb-1 flex items-center gap-1">
            <Target className="w-3 h-3" /> Dica da banca
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">{av.dica_banca}</p>
        </div>
      </div>

      {/* Pontos críticos */}
      {av.pontos_criticos?.length > 0 && (
        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Pontos críticos que não podem faltar
          </h3>
          <ul className="space-y-1.5">
            {av.pontos_criticos.map((p, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                <span className="text-red-500 flex-shrink-0 mt-0.5">•</span>{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Acertos */}
        <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Acertos
          </h3>
          <ul className="space-y-1.5">
            {av.acertos.map((a, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                <span className="text-green-500 flex-shrink-0">•</span>{a}
              </li>
            ))}
          </ul>
        </div>

        {/* A melhorar */}
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
            <PenLine className="w-3.5 h-3.5" /> A melhorar
          </h3>
          <ul className="space-y-1.5">
            {av.melhorias.map((m, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                <span className="text-amber-500 flex-shrink-0">•</span>{m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dicas de estudo */}
      {av.dicas_estudo?.length > 0 && (
        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4">
          <h3 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" /> Dicas de estudo
          </h3>
          <ul className="space-y-1.5">
            {av.dicas_estudo.map((d, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                <span className="text-indigo-400 flex-shrink-0">•</span>{d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gabarito */}
      <div className="rounded-xl bg-white/5 border border-white/5 overflow-hidden">
        <button
          onClick={() => setShowGabarito(r => !r)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2"><BookOpenCheck className="w-4 h-4 text-purple-400" /> Gabarito resumido</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", showGabarito && "rotate-180")} />
        </button>
        {showGabarito && (
          <div className="px-5 pb-5 border-t border-white/5">
            <p className="text-sm text-gray-300 leading-relaxed mt-4">{av.gabarito_resumido}</p>
          </div>
        )}
      </div>

      <button
        onClick={onNovo}
        className="flex items-center gap-2 px-5 py-2.5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
      >
        <RefreshCw className="w-4 h-4" /> Novo caso
      </button>
    </div>
  );
}

// ─── Hook para foto ───────────────────────────────────────────────────────────
function useFoto() {
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState("");
  const [type, setType] = useState("image/jpeg");

  function load(file: File) {
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      const [meta, b64] = result.split(",");
      setType(meta.split(":")[1]?.split(";")[0] ?? "image/jpeg");
      setBase64(b64);
      setPreview(result);
    };
    reader.readAsDataURL(file);
  }

  function clear() { setPreview(null); setBase64(""); setType("image/jpeg"); }

  return { preview, base64, type, load, clear };
}

// ─── Seção de resposta (texto ou foto) ───────────────────────────────────────
function RespostaSection({
  respostaMode,
  setRespostaMode,
  respostaTexto,
  setRespostaTexto,
  respostaFoto,
  onSubmit,
  loading,
  fotoError,
  tentativas,
}: {
  respostaMode: InputMode;
  setRespostaMode: (m: InputMode) => void;
  respostaTexto: string;
  setRespostaTexto: (v: string) => void;
  respostaFoto: ReturnType<typeof useFoto>;
  onSubmit: () => void;
  loading: boolean;
  fotoError: string;
  tentativas: number;
}) {
  const podeEnviar = respostaMode === "texto"
    ? respostaTexto.trim().length > 0
    : !!respostaFoto.base64;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-300">
          Sua resposta
          {respostaMode === "texto" && (
            <span className="text-gray-600 font-normal ml-1">({respostaTexto.length} caracteres)</span>
          )}
        </label>
        <InputModeToggle mode={respostaMode} onChange={setRespostaMode} />
      </div>

      {respostaMode === "texto" ? (
        <textarea
          value={respostaTexto}
          onChange={e => setRespostaTexto(e.target.value)}
          rows={10}
          placeholder="Escreva sua resposta ao caso. Identifique o problema, fundamente tecnicamente/juridicamente e proponha uma solução..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
        />
      ) : (
        <div>
          <FotoInput
            preview={respostaFoto.preview}
            onFile={respostaFoto.load}
            onClear={respostaFoto.clear}
            label="Fotografar resposta escrita no papel"
            hint="Garanta boa iluminação e imagem nítida"
          />
          {fotoError && (
            <div className={cn(
              "mt-3 flex items-start gap-2 p-3 rounded-lg text-sm",
              tentativas >= 2
                ? "bg-red-500/10 border border-red-500/20 text-red-300"
                : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
            )}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{fotoError}</span>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || !podeEnviar}
        className="mt-4 flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Avaliando...</>
          : <><Send className="w-4 h-4" /> Enviar para avaliação</>
        }
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function CasoClient() {
  const { showUpgrade } = useUpgradeModal();
  const [modo, setModo] = useState<Modo>("ia");

  // Modo IA
  const [temas, setTemas] = useState<Tema[]>(TEMAS_FALLBACK);
  const [temasLoading, setTemasLoading] = useState(true);
  const [tema, setTema] = useState("");
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [loadingGerar, setLoadingGerar] = useState(false);

  // Modo Tema próprio
  const [temaCustom, setTemaCustom] = useState("");
  const [casoMode, setCasoMode] = useState<InputMode>("texto");
  const [casoTexto, setCasoTexto] = useState("");
  const casoFoto = useFoto();

  // Resposta (compartilhado)
  const [respostaMode, setRespostaMode] = useState<InputMode>("texto");
  const [respostaTexto, setRespostaTexto] = useState("");
  const respostaFoto = useFoto();

  // Avaliação
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [loadingAvaliar, setLoadingAvaliar] = useState(false);
  const [error, setError] = useState("");
  const [fotoError, setFotoError] = useState("");
  const [fotoTentativas, setFotoTentativas] = useState(0);
  const [showDicas, setShowDicas] = useState(false);

  // Carrega temas personalizados
  useEffect(() => {
    setTemasLoading(true);
    fetch("/api/caso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sugerir_temas" }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.temas?.length > 0) {
          setTemas(d.temas as Tema[]);
          setTema((d.temas[0] as Tema).id);
        } else {
          setTema(TEMAS_FALLBACK[0].id);
        }
      })
      .catch(() => setTema(TEMAS_FALLBACK[0].id))
      .finally(() => setTemasLoading(false));
  }, []);

  function resetState() {
    setCenario(null);
    setAvaliacao(null);
    setRespostaTexto("");
    respostaFoto.clear();
    casoFoto.clear();
    setCasoTexto("");
    setTemaCustom("");
    setError("");
    setFotoError("");
    setFotoTentativas(0);
    setShowDicas(false);
    setRespostaMode("texto");
    setCasoMode("texto");
  }

  // Gerar cenário (modo IA)
  async function gerarCenario() {
    setLoadingGerar(true);
    setError("");
    setCenario(null);
    setAvaliacao(null);
    setRespostaTexto("");
    respostaFoto.clear();
    setFotoError("");
    setFotoTentativas(0);
    try {
      const res = await fetch("/api/caso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gerar", tema }),
      });
      if (res.status === 403) { showUpgrade("Estudo de Caso"); return; }
      const data = await res.json() as Cenario & { error?: string };
      if (data.error) { setError(data.error); return; }
      setCenario(data);
    } catch { setError("Erro de conexão."); }
    finally { setLoadingGerar(false); }
  }

  // Enviar avaliação (unificado)
  async function avaliar(cenarioTexto?: string, cenarioFotoBase64?: string, cenarioFotoType?: string) {
    setLoadingAvaliar(true);
    setFotoError("");

    const body: Record<string, string> = {};

    // Caso
    if (cenarioFotoBase64) {
      body.cenarioFotoBase64 = cenarioFotoBase64;
      body.cenarioFotoType = cenarioFotoType ?? "image/jpeg";
    } else if (cenarioTexto) {
      body.cenarioTexto = cenarioTexto;
    }

    // Resposta
    if (respostaMode === "foto" && respostaFoto.base64) {
      body.respostaFotoBase64 = respostaFoto.base64;
      body.respostaFotoType = respostaFoto.type;
    } else {
      body.respostaTexto = respostaTexto;
    }

    try {
      const res = await fetch("/api/caso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "avaliar", ...body }),
      });
      if (res.status === 403) { showUpgrade("Estudo de Caso"); setLoadingAvaliar(false); return; }

      const data = await res.json() as Avaliacao & {
        error?: string;
        ilegivel?: boolean;
        motivo?: string;
      };

      if (res.status === 422 && data.ilegivel) {
        const novaTentativa = fotoTentativas + 1;
        setFotoTentativas(novaTentativa);
        respostaFoto.clear(); // Limpa a foto para nova tentativa

        if (novaTentativa >= 2) {
          setFotoError("Não foi possível avaliar. A imagem não está nítida o suficiente. Tente escrever a resposta no campo de texto.");
        } else {
          setFotoError("Imagem ilegível. Por favor, tire uma foto mais nítida, com boa iluminação e enquadramento.");
        }
        setLoadingAvaliar(false);
        return;
      }

      if (data.error) { setError(data.error); setLoadingAvaliar(false); return; }
      setAvaliacao(data);
    } catch { setError("Erro de conexão."); }
    finally { setLoadingAvaliar(false); }
  }

  // Handlers por modo
  function submeterModoIA() {
    if (!cenario) return;
    const textoCase = `${cenario.titulo}\n\n${cenario.contexto}\n\nPergunta: ${cenario.pergunta}`;
    void avaliar(textoCase, undefined, undefined);
  }

  function submeterModoTema() {
    const textoCase = casoMode === "texto" ? casoTexto : undefined;
    const fotoBase64 = casoMode === "foto" ? casoFoto.base64 : undefined;
    const fotoType = casoMode === "foto" ? casoFoto.type : undefined;
    void avaliar(textoCase, fotoBase64, fotoType);
  }

  const temaSel = temas.find(t => t.id === tema) ?? temas[0];

  // Abas
  const abas = [
    { id: "ia" as Modo,    label: "IA gera o caso",   icon: <Play className="w-3.5 h-3.5" /> },
    { id: "tema" as Modo,  label: "Traga seu tema",   icon: <PenLine className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-purple-400" /> Estudo de Caso
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Resolva casos práticos e receba avaliação detalhada com IA</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 w-fit">
        {abas.map(aba => (
          <button
            key={aba.id}
            onClick={() => { setModo(aba.id); resetState(); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              modo === aba.id ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
            )}
          >
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      {/* Erro geral */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ══ MODO IA ═══════════════════════════════════════════════════════════ */}
      {modo === "ia" && !avaliacao && (
        <>
          {/* Seleção de tema */}
          {!cenario && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Temas sugeridos para seu perfil
              </label>

              {temasLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
                  <Loader2 className="w-4 h-4 animate-spin" /> Personalizando temas...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-5">
                  {temas.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTema(t.id)}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-xl border text-center transition-all",
                        tema === t.id
                          ? "border-purple-500/60 bg-purple-500/10 text-purple-300"
                          : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20"
                      )}
                    >
                      <span className="text-xl mb-1">{t.icon}</span>
                      <span className="text-[11px] leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={gerarCenario}
                disabled={loadingGerar || temasLoading || !tema}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
              >
                {loadingGerar
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando caso...</>
                  : <><Play className="w-4 h-4" /> Gerar caso sobre {temaSel?.icon} {temaSel?.label}</>
                }
              </button>
            </div>
          )}

          {/* Cenário gerado */}
          {cenario && (
            <div>
              <div className="rounded-xl bg-white/5 border border-white/5 p-6 mb-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-lg font-bold text-white">{cenario.titulo}</h2>
                  <button
                    onClick={resetState}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors flex-shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" /> Novo caso
                  </button>
                </div>
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mb-5">{cenario.contexto}</div>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-xs font-semibold mb-1 text-purple-700 dark:text-purple-400">❓ Pergunta:</p>
                  <p className="text-sm font-medium text-gray-950 dark:text-white">{cenario.pergunta}</p>
                </div>

                <button
                  onClick={() => setShowDicas(r => !r)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
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

              {/* Seção de resposta com toggle texto/foto */}
              <RespostaSection
                respostaMode={respostaMode}
                setRespostaMode={m => { setRespostaMode(m); respostaFoto.clear(); setFotoError(""); setFotoTentativas(0); }}
                respostaTexto={respostaTexto}
                setRespostaTexto={setRespostaTexto}
                respostaFoto={respostaFoto}
                onSubmit={submeterModoIA}
                loading={loadingAvaliar}
                fotoError={fotoError}
                tentativas={fotoTentativas}
              />
            </div>
          )}
        </>
      )}

      {/* ══ MODO TEMA PRÓPRIO ═════════════════════════════════════════════════ */}
      {modo === "tema" && !avaliacao && (
        <div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Tem um caso do seu material de estudo, prova anterior ou situação real que quer praticar?
              Adicione o tema, descreva ou fotografe o enunciado e avalie sua resposta com a IA.
            </p>

            {/* Tema */}
            <label className="block text-sm font-medium text-gray-300 mb-1">Tema do caso</label>
            <input
              type="text"
              value={temaCustom}
              onChange={e => setTemaCustom(e.target.value)}
              placeholder="Ex: Incidente de segurança da informação, Licitação irregular, Ética no atendimento..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors mb-4"
            />

            {/* Caso — texto ou foto */}
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Enunciado do caso</label>
              <InputModeToggle mode={casoMode} onChange={m => { setCasoMode(m); casoFoto.clear(); setCasoTexto(""); }} />
            </div>

            {casoMode === "texto" ? (
              <textarea
                value={casoTexto}
                onChange={e => setCasoTexto(e.target.value)}
                rows={7}
                placeholder="Cole ou escreva o enunciado do caso aqui — pode ser de um livro, prova anterior, apostila ou situação que você criou..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
              />
            ) : (
              <FotoInput
                preview={casoFoto.preview}
                onFile={casoFoto.load}
                onClear={casoFoto.clear}
                label="Fotografar enunciado do caso"
                hint="Foto nítida de livro, apostila ou papel — boa iluminação"
              />
            )}
          </div>

          {/* Resposta — só aparece quando o caso está preenchido */}
          {(casoTexto.trim().length > 20 || !!casoFoto.base64) && (
            <RespostaSection
              respostaMode={respostaMode}
              setRespostaMode={m => { setRespostaMode(m); respostaFoto.clear(); setFotoError(""); setFotoTentativas(0); }}
              respostaTexto={respostaTexto}
              setRespostaTexto={setRespostaTexto}
              respostaFoto={respostaFoto}
              onSubmit={submeterModoTema}
              loading={loadingAvaliar}
              fotoError={fotoError}
              tentativas={fotoTentativas}
            />
          )}
        </div>
      )}

      {/* ══ AVALIAÇÃO ════════════════════════════════════════════════════════ */}
      {avaliacao && (
        <AvaliacaoView av={avaliacao} onNovo={resetState} />
      )}
    </div>
  );
}
