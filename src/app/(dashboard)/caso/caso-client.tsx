"use client";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen, Play, Send, RefreshCw, AlertCircle, ChevronDown,
  PenLine, Camera, Loader2, X, ImageIcon,
} from "lucide-react";

interface Tema { id: string; label: string; icon: string; }
interface Cenario { titulo: string; contexto: string; pergunta: string; dicas: string[]; criterios: string[]; }
interface Avaliacao {
  nota: number;
  acertos: string[];
  melhorias: string[];
  dica_banca: string;
  gabarito_resumido: string;
  caso_lido?: string; // presente na avaliação por foto
}

type Modo = "ia" | "manual" | "foto";

const TEMAS_FALLBACK: Tema[] = [
  { id: "etica",         label: "Ética no serviço público",    icon: "🤝" },
  { id: "licitacao",     label: "Licitações e contratos",      icon: "📄" },
  { id: "administrativo",label: "Processo administrativo",     icon: "📋" },
  { id: "atendimento",   label: "Atendimento ao cidadão",      icon: "👥" },
  { id: "corrupcao",     label: "Corrupção e desvio de conduta", icon: "⚖️" },
  { id: "organizacao",   label: "Organização administrativa",  icon: "🏛️" },
];

// ─── Bloco de avaliação (compartilhado pelos 3 modos) ────────────────────────
function AvaliacaoView({ av, onNovo }: { av: Avaliacao; onNovo: () => void }) {
  const [showGabarito, setShowGabarito] = useState(false);

  return (
    <div className="space-y-4">
      {/* Nota */}
      <div className="rounded-xl bg-white/5 border border-white/5 p-6 flex items-center gap-6">
        <div className="text-center">
          <p className={cn(
            "text-5xl font-bold",
            av.nota >= 8 ? "text-green-400" : av.nota >= 6 ? "text-yellow-400" : "text-red-400"
          )}>{av.nota.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">nota / 10</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-amber-400 font-semibold mb-1">⚡ Dica da banca</p>
          <p className="text-sm text-gray-300 leading-relaxed">{av.dica_banca}</p>
        </div>
      </div>

      {/* Caso lido da foto */}
      {av.caso_lido && (
        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4">
          <p className="text-xs text-indigo-400 font-semibold mb-1">📸 Caso lido da foto</p>
          <p className="text-sm text-gray-300 leading-relaxed">{av.caso_lido}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-2">✅ Acertos</h3>
          <ul className="space-y-1.5">
            {av.acertos.map((a, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                <span className="text-green-500 flex-shrink-0">•</span>{a}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">📝 A melhorar</h3>
          <ul className="space-y-1.5">
            {av.melhorias.map((m, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                <span className="text-amber-500 flex-shrink-0">•</span>{m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/5 overflow-hidden">
        <button
          onClick={() => setShowGabarito(r => !r)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <span>🏆 Gabarito resumido</span>
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

// ─── Formulário de resposta (compartilhado) ───────────────────────────────────
function RespostaForm({
  resposta,
  setResposta,
  onSubmit,
  loading,
  error,
}: {
  resposta: string;
  setResposta: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Sua resposta <span className="text-gray-600 font-normal">({resposta.length} caracteres)</span>
      </label>
      <textarea
        value={resposta}
        onChange={e => setResposta(e.target.value)}
        rows={12}
        required
        placeholder="Escreva sua resposta ao caso. Identifique o problema, fundamente tecnicamente/juridicamente e proponha uma solução..."
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed mb-4"
      />
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !resposta.trim()}
        className="flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Avaliando...</>
          : <><Send className="w-4 h-4" /> Enviar para avaliação</>
        }
      </button>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function CasoClient() {
  const [modo, setModo] = useState<Modo>("ia");

  // IA mode
  const [temas, setTemas] = useState<Tema[]>(TEMAS_FALLBACK);
  const [temasLoading, setTemasLoading] = useState(true);
  const [tema, setTema] = useState("");
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [loadingGerar, setLoadingGerar] = useState(false);

  // Manual mode
  const [cenarioManual, setCenarioManual] = useState("");

  // Foto mode
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string>("");
  const [imagemType, setImagemType] = useState<string>("image/jpeg");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resposta + avaliação (compartilhados)
  const [resposta, setResposta] = useState("");
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [loadingAvaliar, setLoadingAvaliar] = useState(false);
  const [error, setError] = useState("");
  const [showDicas, setShowDicas] = useState(false);

  // Carrega temas personalizados ao montar
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
          setTema(d.temas[0].id as string);
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
    setResposta("");
    setCenarioManual("");
    setImagemPreview(null);
    setImagemBase64("");
    setError("");
    setShowDicas(false);
  }

  // ── Gerar cenário (modo IA) ──────────────────────────────────────────────────
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
        body: JSON.stringify({ action: "gerar", tema }),
      });
      const data = await res.json() as Cenario & { error?: string };
      if (data.error) { setError(data.error); return; }
      setCenario(data);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoadingGerar(false);
    }
  }

  // ── Avaliar (modos IA e Manual) ──────────────────────────────────────────────
  async function avaliarResposta(e: React.FormEvent) {
    e.preventDefault();
    if (loadingAvaliar) return;
    setLoadingAvaliar(true);
    setError("");
    try {
      const cenarioTexto = cenario
        ? `${cenario.titulo}\n\n${cenario.contexto}\n\nPergunta: ${cenario.pergunta}`
        : undefined;

      const res = await fetch("/api/caso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "avaliar",
          cenario: cenarioTexto,
          cenarioManual: modo === "manual" ? cenarioManual : undefined,
          resposta,
        }),
      });
      const data = await res.json() as Avaliacao & { error?: string };
      if (data.error) { setError(data.error); return; }
      setAvaliacao(data);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoadingAvaliar(false);
    }
  }

  // ── Avaliar via foto ─────────────────────────────────────────────────────────
  async function avaliarFoto(e: React.FormEvent) {
    e.preventDefault();
    if (!imagemBase64 || !resposta.trim() || loadingAvaliar) return;
    setLoadingAvaliar(true);
    setError("");
    try {
      const res = await fetch("/api/caso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "avaliar_foto",
          imageBase64: imagemBase64,
          imageType: imagemType,
          resposta,
        }),
      });
      const data = await res.json() as Avaliacao & { error?: string };
      if (data.error) { setError(data.error); return; }
      setAvaliacao(data);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoadingAvaliar(false);
    }
  }

  // ── Processar arquivo de imagem ──────────────────────────────────────────────
  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      // result = "data:image/jpeg;base64,XXXX"
      const [meta, b64] = result.split(",");
      const mime = meta.split(":")[1]?.split(";")[0] ?? "image/jpeg";
      setImagemType(mime);
      setImagemBase64(b64);
      setImagemPreview(result);
    };
    reader.readAsDataURL(file);
  }

  const temaSel = temas.find(t => t.id === tema) ?? temas[0];

  // ─ Abas de modo ──────────────────────────────────────────────────────────────
  const abas: { id: Modo; label: string; icon: React.ReactNode }[] = [
    { id: "ia",     label: "IA gera o caso",       icon: <Play className="w-3.5 h-3.5" /> },
    { id: "manual", label: "Escrever manualmente",  icon: <PenLine className="w-3.5 h-3.5" /> },
    { id: "foto",   label: "Enviar foto",           icon: <Camera className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-purple-400" /> Estudo de Caso
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Resolva casos práticos e receba feedback detalhado com IA</p>
      </div>

      {/* Abas de modo */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 w-fit">
        {abas.map(aba => (
          <button
            key={aba.id}
            onClick={() => { setModo(aba.id); resetState(); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              modo === aba.id
                ? "bg-purple-600 text-white shadow"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      {/* ══ MODO IA ════════════════════════════════════════════════════════════ */}
      {modo === "ia" && !avaliacao && (
        <>
          {!cenario && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Temas sugeridos para seu perfil
              </label>

              {temasLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando temas personalizados...
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

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
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
                  <p className="text-xs text-purple-400 font-semibold mb-1">❓ Pergunta:</p>
                  <p className="text-sm text-purple-200">{cenario.pergunta}</p>
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

              <RespostaForm
                resposta={resposta}
                setResposta={setResposta}
                onSubmit={avaliarResposta}
                loading={loadingAvaliar}
                error={error}
              />
            </div>
          )}
        </>
      )}

      {/* ══ MODO MANUAL ════════════════════════════════════════════════════════ */}
      {modo === "manual" && !avaliacao && (
        <div>
          <p className="text-sm text-gray-400 mb-4">
            Escreva ou cole o enunciado do caso abaixo — pode ser de um livro, prova anterior ou situação real.
          </p>

          <label className="block text-sm font-medium text-gray-300 mb-2">Enunciado / caso</label>
          <textarea
            value={cenarioManual}
            onChange={e => setCenarioManual(e.target.value)}
            rows={8}
            placeholder="Cole aqui o texto do caso, enunciado da prova ou escreva sua própria situação..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed mb-4"
          />

          {cenarioManual.trim().length > 30 && (
            <RespostaForm
              resposta={resposta}
              setResposta={setResposta}
              onSubmit={avaliarResposta}
              loading={loadingAvaliar}
              error={error}
            />
          )}
        </div>
      )}

      {/* ══ MODO FOTO ══════════════════════════════════════════════════════════ */}
      {modo === "foto" && !avaliacao && (
        <div>
          <p className="text-sm text-gray-400 mb-4">
            Tire uma foto nítida do caso (livro, prova, apostila) e escreva sua resposta abaixo.
          </p>

          {/* Upload / câmera */}
          {!imagemPreview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/10 hover:border-purple-500/40 rounded-xl p-10 flex flex-col items-center gap-3 text-gray-500 hover:text-gray-300 transition-colors mb-4"
            >
              <Camera className="w-10 h-10 opacity-40" />
              <span className="text-sm font-medium">Tirar foto ou selecionar imagem</span>
              <span className="text-xs opacity-60">JPG, PNG ou WEBP — câmera ou galeria</span>
            </button>
          ) : (
            <div className="relative mb-4 rounded-xl overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagemPreview} alt="Caso" className="w-full max-h-64 object-contain bg-black/30" />
              <button
                onClick={() => { setImagemPreview(null); setImagemBase64(""); }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1 text-[11px] text-gray-300">
                <ImageIcon className="w-3 h-3" /> Imagem carregada
              </div>
            </div>
          )}

          {/* Input file oculto — aceita câmera e galeria */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
            }}
          />

          {/* Formulário de resposta só aparece depois de ter imagem */}
          {imagemBase64 && (
            <RespostaForm
              resposta={resposta}
              setResposta={setResposta}
              onSubmit={avaliarFoto}
              loading={loadingAvaliar}
              error={error}
            />
          )}
        </div>
      )}

      {/* ══ AVALIAÇÃO (todos os modos) ═════════════════════════════════════════ */}
      {avaliacao && (
        <AvaliacaoView av={avaliacao} onNovo={resetState} />
      )}
    </div>
  );
}
