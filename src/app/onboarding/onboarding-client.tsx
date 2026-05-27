"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ChevronRight, ChevronLeft, Check, Calendar, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARGOS, GRUPOS_AREA, buscarCargos, type Cargo, type AreaCargo } from "@/lib/cargos";

// ── Types ──────────────────────────────────────────────────────────────────────
type Step = "nome" | "cargo" | "banca" | "data" | "tempo" | "gerando" | "pronto";

interface WizardState {
  nome: string;
  cargo: Cargo | null;
  banca: string | null;       // null = não definida
  dataProva: string | null;   // YYYY-MM-DD ou null
  horasEstudo: number | null; // minutos por dia
}

interface Props {
  userId: string;
  userName: string;
  agents: { id: string; name: string }[];
  maxConcursos: number;
}

// ── Bancas ─────────────────────────────────────────────────────────────────────
const BANCAS = [
  { slug: "CESPE/CEBRASPE", label: "CESPE / CEBRASPE", emoji: "🎯", desc: "Certo ou Errado, questões abertas" },
  { slug: "FCC",             label: "FCC",               emoji: "📋", desc: "Objetiva, foco em português" },
  { slug: "FGV",             label: "FGV",               emoji: "🏛️", desc: "Raciocínio lógico, atualidades" },
  { slug: "CESGRANRIO",      label: "CESGRANRIO",        emoji: "🏦", desc: "Bancária, questões técnicas" },
  { slug: "VUNESP",          label: "VUNESP",            emoji: "📝", desc: "São Paulo, municipal/estadual" },
  { slug: "IADES",           label: "IADES",             emoji: "🔍", desc: "Regional, interdisciplinar" },
  { slug: "QUADRIX",         label: "QUADRIX",           emoji: "📐", desc: "Conselhos profissionais" },
  { slug: "IDECAN",          label: "IDECAN",            emoji: "📌", desc: "Regional, nível médio e superior" },
];

// ── Opções de tempo ────────────────────────────────────────────────────────────
const OPCOES_TEMPO = [
  { minutos: 30,  label: "30 min",  desc: "Estudos leves, rotina intensa" },
  { minutos: 60,  label: "1 hora",  desc: "Equilíbrio no dia a dia" },
  { minutos: 120, label: "2 horas", desc: "Dedicação consistente" },
  { minutos: 180, label: "3 horas", desc: "Foco intenso, resultado rápido" },
  { minutos: 240, label: "4+ horas",desc: "Imersão total na preparação" },
];

// ── Passos ─────────────────────────────────────────────────────────────────────
const STEPS: Step[] = ["nome", "cargo", "banca", "data", "tempo", "gerando", "pronto"];
const STEP_LABELS: Record<Step, string> = {
  nome: "Boas-vindas", cargo: "Cargo", banca: "Banca",
  data: "Data da prova", tempo: "Tempo de estudo",
  gerando: "Gerando plano", pronto: "Pronto!",
};

// ── Generating steps animation ──────────────────────────────────────────────────
const GEN_STEPS = [
  { icon: "🎯", text: "Analisando seu cargo e área de concurso…" },
  { icon: "📚", text: "Selecionando as matérias mais cobradas pela banca…" },
  { icon: "⚖️",  text: "Calculando peso de cada disciplina…" },
  { icon: "📅", text: "Montando cronograma com base no seu tempo disponível…" },
  { icon: "🧠", text: "Configurando seu perfil de aprendizagem…" },
  { icon: "✨", text: "Finalizando seu plano personalizado…" },
];

// ── Component ──────────────────────────────────────────────────────────────────
export function OnboardingClient({ userId, userName }: Props) {
  const [step, setStep] = useState<Step>("nome");
  const [state, setState] = useState<WizardState>({
    nome: userName.split(" ")[0] ?? "",
    cargo: null,
    banca: null,
    dataProva: null,
    horasEstudo: null,
  });

  // Cargo search
  const [search, setSearch] = useState("");
  const [areaFiltro, setAreaFiltro] = useState<AreaCargo | null>(null);

  // Generating animation
  const [genStep, setGenStep] = useState(0);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const progress = Math.round((stepIndex / (STEPS.length - 2)) * 100);

  // ── Cargo filtering ──────────────────────────────────────────────────────────
  const cargosVisiveis = search.trim().length >= 2
    ? buscarCargos(search)
    : areaFiltro
      ? CARGOS.filter(c => c.area === areaFiltro)
      : CARGOS;

  // ── Navigate steps ───────────────────────────────────────────────────────────
  function goNext() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }
  function goBack() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  // ── Save & generate ──────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);

    // Animate generating steps
    for (let i = 0; i < GEN_STEPS.length; i++) {
      setGenStep(i);
      await new Promise(r => setTimeout(r, 1100));
    }

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomePreferido: state.nome.trim() || userName,
          cargo: state.cargo?.nome ?? null,
          orgao: state.cargo?.orgao ?? null,
          banca: state.banca,
          dataProva: state.dataProva,
          horasEstudo: state.horasEstudo ? Math.round(state.horasEstudo / 60) : null,
          categoria: state.cargo?.categoria ?? null,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setSaveError(d.error ?? "Erro ao salvar. Tente novamente.");
        setStep("tempo");
        return;
      }
      setStep("pronto");
    } catch {
      setSaveError("Erro de rede. Tente novamente.");
      setStep("tempo");
    } finally {
      setSaving(false);
    }
  }, [state, userName]);

  // Trigger save when entering "gerando"
  useEffect(() => {
    if (step === "gerando") save();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Redirect after "pronto"
  useEffect(() => {
    if (step === "pronto") {
      const t = setTimeout(() => { window.location.href = "/hoje"; }, 2200);
      return () => clearTimeout(t);
    }
  }, [step]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(10,181,189,0.08) 0%, transparent 60%), #0a0d12" }}>

      {/* Card principal */}
      <div className="w-full max-w-2xl">

        {/* Progress bar (oculto em gerando/pronto) */}
        {step !== "gerando" && step !== "pronto" && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">
                {stepIndex + 1} de {STEPS.length - 2} — {STEP_LABELS[step]}
              </span>
              <span className="text-xs text-teal-400 font-semibold">{progress}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#0ab5bd] to-[#00ffa3] transition-all duration-700"
                style={{ width: `${progress}%` }} />
            </div>
            {/* Step dots */}
            <div className="flex gap-2 mt-2 justify-center">
              {STEPS.slice(0, -2).map((s, i) => (
                <div key={s} className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i < stepIndex ? "bg-[#0ab5bd] w-6" : i === stepIndex ? "bg-[#0ab5bd] w-4" : "bg-white/10 w-3"
                )} />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: NOME ────────────────────────────────────────────────────── */}
        {step === "nome" && (
          <StepNome
            nome={state.nome}
            onChange={nome => setState(s => ({ ...s, nome }))}
            onNext={goNext}
          />
        )}

        {/* ── STEP: CARGO ───────────────────────────────────────────────────── */}
        {step === "cargo" && (
          <StepCargo
            cargo={state.cargo}
            search={search}
            setSearch={setSearch}
            areaFiltro={areaFiltro}
            setAreaFiltro={setAreaFiltro}
            cargosVisiveis={cargosVisiveis}
            onSelect={cargo => {
              setState(s => ({ ...s, cargo, banca: cargo.banca ?? null }));
              setTimeout(goNext, 300);
            }}
            onBack={goBack}
          />
        )}

        {/* ── STEP: BANCA ───────────────────────────────────────────────────── */}
        {step === "banca" && (
          <StepBanca
            banca={state.banca}
            sugestao={state.cargo?.banca ?? null}
            onSelect={banca => {
              setState(s => ({ ...s, banca }));
              setTimeout(goNext, 300);
            }}
            onBack={goBack}
          />
        )}

        {/* ── STEP: DATA ────────────────────────────────────────────────────── */}
        {step === "data" && (
          <StepData
            dataProva={state.dataProva}
            onChange={dataProva => setState(s => ({ ...s, dataProva }))}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {/* ── STEP: TEMPO ───────────────────────────────────────────────────── */}
        {step === "tempo" && (
          <StepTempo
            horasEstudo={state.horasEstudo}
            onSelect={minutos => {
              setState(s => ({ ...s, horasEstudo: minutos }));
              setTimeout(goNext, 300);
            }}
            onBack={goBack}
            error={saveError}
          />
        )}

        {/* ── STEP: GERANDO ─────────────────────────────────────────────────── */}
        {step === "gerando" && <StepGerando genStep={genStep} saving={saving} />}

        {/* ── STEP: PRONTO ──────────────────────────────────────────────────── */}
        {step === "pronto" && <StepPronto nome={state.nome} cargo={state.cargo} />}
      </div>
    </div>
  );
}

// ── Step Components ────────────────────────────────────────────────────────────

function StepNome({ nome, onChange, onNext }: {
  nome: string; onChange: (v: string) => void; onNext: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="text-center space-y-8">
      {/* Orb */}
      <div className="flex justify-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full opacity-30 animate-pulse"
            style={{ background: "radial-gradient(circle, #0ab5bd, transparent 70%)", transform: "scale(1.5)" }} />
          <div className="w-full h-full rounded-full flex items-center justify-center text-4xl"
            style={{ background: "radial-gradient(circle at 35% 30%, #b0f0f5, #0ab5bd 40%, #044d52)" }}>
            ✦
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo ao AprovAI!</h1>
        <p className="text-gray-400">Vamos montar seu plano de estudos personalizado em menos de 1 minuto.</p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <label className="block text-sm text-gray-400 text-left">Como posso te chamar?</label>
        <input
          ref={ref}
          type="text"
          value={nome}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && nome.trim() && onNext()}
          placeholder="Seu nome ou apelido"
          maxLength={30}
          className="w-full px-4 py-3 rounded-xl text-white text-lg bg-white/5 border border-white/10 outline-none focus:border-[#0ab5bd]/60 focus:bg-white/8 transition-all placeholder-gray-600"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!nome.trim()}
        className="px-8 py-3.5 rounded-xl text-sm font-semibold bg-[#0ab5bd] text-black hover:bg-[#09a3aa] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 mx-auto"
      >
        Começar <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function StepCargo({ cargo, search, setSearch, areaFiltro, setAreaFiltro, cargosVisiveis, onSelect, onBack }: {
  cargo: Cargo | null;
  search: string;
  setSearch: (v: string) => void;
  areaFiltro: AreaCargo | null;
  setAreaFiltro: (v: AreaCargo | null) => void;
  cargosVisiveis: Cargo[];
  onSelect: (c: Cargo) => void;
  onBack: () => void;
}) {
  const grupoAtual = areaFiltro ? GRUPOS_AREA.find(g => g.area === areaFiltro) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Qual cargo você vai prestar?</h2>
        <p className="text-sm text-gray-500">Selecione seu cargo para personalizarmos seu plano.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setAreaFiltro(null); }}
          placeholder="Buscar cargo ou órgão (ex: INSS, Delegado, TRF…)"
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#0ab5bd]/60 placeholder-gray-600 transition-all"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filtro por área (só quando não pesquisando) */}
      {!search && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAreaFiltro(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              !areaFiltro
                ? "bg-[#0ab5bd]/20 border-[#0ab5bd]/40 text-[#0ab5bd]"
                : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
            )}
          >
            Todos
          </button>
          {GRUPOS_AREA.map(g => (
            <button
              key={g.area}
              onClick={() => setAreaFiltro(g.area)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                areaFiltro === g.area
                  ? "bg-[#0ab5bd]/20 border-[#0ab5bd]/40 text-[#0ab5bd]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              )}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista de cargos */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {cargosVisiveis.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">
            Nenhum cargo encontrado para "{search}"
          </div>
        )}
        {cargosVisiveis.map(c => {
          const grupo = GRUPOS_AREA.find(g => g.area === c.area);
          const isSelected = cargo?.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                isSelected
                  ? "bg-[#0ab5bd]/15 border-[#0ab5bd]/50"
                  : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
              )}
            >
              <span className="text-xl flex-shrink-0">{grupo?.emoji ?? "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", isSelected ? "text-[#0ab5bd]" : "text-white")}>
                  {c.nome}
                </p>
                <p className="text-xs text-gray-500 truncate">{c.orgao}</p>
              </div>
              {c.banca && (
                <span className="text-xs text-gray-600 flex-shrink-0 hidden sm:block">{c.banca}</span>
              )}
              {isSelected && <Check className="w-4 h-4 text-[#0ab5bd] flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Cargo selecionado + navegar */}
      <div className="flex items-center gap-3 pt-2">
        <button onClick={onBack} className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        {cargo && (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0ab5bd]/10 border border-[#0ab5bd]/25">
            <Check className="w-4 h-4 text-[#0ab5bd] flex-shrink-0" />
            <span className="text-sm text-[#0ab5bd] font-medium truncate">{cargo.nome}</span>
          </div>
        )}
        {!cargo && <div className="flex-1 text-sm text-gray-600">Selecione um cargo acima</div>}
      </div>
    </div>
  );
}

function StepBanca({ banca, sugestao, onSelect, onBack }: {
  banca: string | null;
  sugestao: string | null;
  onSelect: (b: string | null) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Qual é a banca do seu concurso?</h2>
        <p className="text-sm text-gray-500">Cada banca tem um estilo único. Isso ajuda a calibrar seu treinamento.</p>
      </div>

      {sugestao && (
        <div className="px-4 py-2.5 rounded-lg bg-[#0ab5bd]/10 border border-[#0ab5bd]/25 text-sm text-[#0ab5bd]">
          💡 Sugestão com base no cargo: <strong>{sugestao}</strong>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BANCAS.map(b => (
          <button
            key={b.slug}
            onClick={() => onSelect(b.slug)}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all",
              banca === b.slug
                ? "bg-[#0ab5bd]/15 border-[#0ab5bd]/50"
                : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
            )}
          >
            <span className="text-2xl">{b.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold", banca === b.slug ? "text-[#0ab5bd]" : "text-white")}>
                {b.label}
              </p>
              <p className="text-xs text-gray-500">{b.desc}</p>
            </div>
            {banca === b.slug && <Check className="w-4 h-4 text-[#0ab5bd] flex-shrink-0" />}
          </button>
        ))}

        {/* Não definida */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all sm:col-span-2",
            banca === null
              ? "bg-white/8 border-white/20"
              : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
          )}
        >
          <span className="text-2xl">🤷</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-300">Ainda não sei / Não definida</p>
            <p className="text-xs text-gray-500">Treinaremos com questões variadas de todas as bancas</p>
          </div>
          {banca === null && <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
      </div>

      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
    </div>
  );
}

function StepData({ dataProva, onChange, onNext, onBack }: {
  dataProva: string | null;
  onChange: (v: string | null) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  // Calcula dias restantes
  const diasRestantes = dataProva
    ? Math.ceil((new Date(dataProva + "T00:00:00").getTime() - Date.now()) / 86400000)
    : null;

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);
  const minStr = minDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Quando é sua prova?</h2>
        <p className="text-sm text-gray-500">Isso nos ajuda a calcular a intensidade ideal de estudos.</p>
      </div>

      <div className="space-y-3">
        {/* Date picker */}
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="date"
            value={dataProva ?? ""}
            min={minStr}
            onChange={e => onChange(e.target.value || null)}
            className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#0ab5bd]/60 transition-all [color-scheme:dark]"
          />
        </div>

        {/* Indicador de dias */}
        {diasRestantes !== null && diasRestantes > 0 && (
          <div className="px-4 py-3 rounded-xl bg-[#0ab5bd]/10 border border-[#0ab5bd]/25 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0ab5bd]" />
            <span className="text-[#0ab5bd] font-semibold">{diasRestantes} dias</span>
            <span className="text-gray-400">até a prova — vamos aproveitar bem!</span>
          </div>
        )}

        {/* Não sabe */}
        <button
          onClick={() => { onChange(null); onNext(); }}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all",
            !dataProva
              ? "bg-white/8 border-white/20"
              : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
          )}
        >
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-sm font-semibold text-gray-300">Data ainda não definida</p>
            <p className="text-xs text-gray-500">Estudaremos com ritmo contínuo sem pressão de prazo</p>
          </div>
          {!dataProva && <Check className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        {dataProva && (
          <button
            onClick={onNext}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0ab5bd] text-black hover:bg-[#09a3aa] transition-all flex items-center gap-2"
          >
            Continuar <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function StepTempo({ horasEstudo, onSelect, onBack, error }: {
  horasEstudo: number | null;
  onSelect: (min: number) => void;
  onBack: () => void;
  error: string | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Quanto tempo você estuda por dia?</h2>
        <p className="text-sm text-gray-500">Em média — não precisa ser exato. Você pode ajustar depois.</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-2">
        {OPCOES_TEMPO.map(o => (
          <button
            key={o.minutos}
            onClick={() => onSelect(o.minutos)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all",
              horasEstudo === o.minutos
                ? "bg-[#0ab5bd]/15 border-[#0ab5bd]/50"
                : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
              horasEstudo === o.minutos ? "bg-[#0ab5bd] text-black" : "bg-white/8 text-gray-400"
            )}>
              {o.label.replace(" ", "")}
            </div>
            <div>
              <p className={cn("text-sm font-semibold", horasEstudo === o.minutos ? "text-[#0ab5bd]" : "text-white")}>
                {o.label} por dia
              </p>
              <p className="text-xs text-gray-500">{o.desc}</p>
            </div>
            {horasEstudo === o.minutos && <Check className="w-4 h-4 text-[#0ab5bd] ml-auto flex-shrink-0" />}
          </button>
        ))}
      </div>

      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
    </div>
  );
}

function StepGerando({ genStep, saving }: { genStep: number; saving: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-10">
      {/* Orb animada */}
      <div className="relative" style={{ width: 120, height: 120 }}>
        <div className="absolute inset-0 rounded-full opacity-30 animate-ping"
          style={{ background: "radial-gradient(circle, #0ab5bd, transparent 70%)" }} />
        <div className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 35% 30%, #b0f0f5, #0ab5bd 40%, #044d52)" }}>
          <div className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)", borderRadius: "50%" }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl z-10">🧠</div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Montando seu plano…</h2>
        <p className="text-sm text-gray-500">A IA está personalizando tudo para você.</p>
      </div>

      <div className="space-y-3 w-full max-w-xs text-left">
        {GEN_STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-3 transition-all duration-500"
            style={{ opacity: i <= genStep ? 1 : 0.2 }}>
            <span className="text-lg flex-shrink-0">{s.icon}</span>
            <span className="text-sm text-gray-300 flex-1">{s.text}</span>
            {i < genStep && <Check className="w-4 h-4 text-[#0ab5bd] flex-shrink-0" />}
            {i === genStep && saving && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0ab5bd]/30 border-t-[#0ab5bd] animate-spin flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepPronto({ nome, cargo }: { nome: string; cargo: Cargo | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-[#0ab5bd]/20 border-2 border-[#0ab5bd]/50 flex items-center justify-center text-4xl">
        🎉
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Pronto, {nome.split(" ")[0]}!
        </h2>
        <p className="text-gray-400">
          {cargo
            ? `Seu plano para ${cargo.nome} está pronto.`
            : "Seu plano de estudos está pronto."}
        </p>
        <p className="text-sm text-gray-600 mt-1">Redirecionando para seu painel…</p>
      </div>
      <div className="flex gap-1 mt-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-[#0ab5bd]/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
