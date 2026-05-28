"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, ChevronLeft, Check, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CARGOS, GRUPOS_AREA, getOrgaosParaArea, getCargosParaOrgao,
  ESTADOS, type Cargo, type AreaCargo
} from "@/lib/cargos";

// ── Types ──────────────────────────────────────────────────────────────────────
type Modalidade = "CONCURSO_PUBLICO" | "ENEM" | "OAB";
type Step = "nome" | "modalidade" | "cargo" | "estado" | "banca" | "data" | "tempo" | "gerando" | "pronto";

interface WizardState {
  nome: string;
  modalidade: Modalidade | null;
  cargo: Cargo | null;
  estado: string | null;       // sigla do estado (BA, SP…) — só para cargos hasEstado
  banca: string | null;
  dataProva: string | null;
  horasEstudo: number | null;  // em minutos/dia
}

interface Props {
  userId: string;
  userName: string;
  agents: { id: string; name: string }[];
  maxConcursos: number;
}

// ── Bancas ─────────────────────────────────────────────────────────────────────
const BANCAS = [
  { slug: "CESPE/CEBRASPE", label: "CESPE / CEBRASPE", emoji: "🎯", desc: "Certo ou Errado, questões abertas — federal/estadual" },
  { slug: "FCC",            label: "FCC",               emoji: "📋", desc: "Objetiva, foco em português — TRTs, estaduais" },
  { slug: "FGV",            label: "FGV",               emoji: "🏛️", desc: "Raciocínio lógico — OAB, STF, tribunais" },
  { slug: "CESGRANRIO",     label: "CESGRANRIO",        emoji: "🏦", desc: "Bancária — BB, CEF, BNDES, Petrobras" },
  { slug: "VUNESP",         label: "VUNESP",            emoji: "📝", desc: "São Paulo — TJ-SP, municípios, estadual" },
  { slug: "IADES",          label: "IADES",             emoji: "🔍", desc: "Regional, interdisciplinar — CRMs, conselhos" },
  { slug: "QUADRIX",        label: "QUADRIX",           emoji: "📐", desc: "Conselhos profissionais — CRO, CFM, CFF" },
  { slug: "IDECAN",         label: "IDECAN",            emoji: "📌", desc: "Regional — nível médio e superior" },
  { slug: "IBFC",           label: "IBFC",              emoji: "🔵", desc: "Ativo em todo Brasil — saúde, segurança, prefeituras" },
  { slug: "AOCP",           label: "AOCP",              emoji: "🟣", desc: "Norte/Nordeste — universidades, prefeituras" },
  { slug: "IBADE",          label: "IBADE",             emoji: "🟠", desc: "Centro-Oeste e Norte — estados e municípios" },
  { slug: "CONSULPLAN",     label: "CONSULPLAN",        emoji: "🔶", desc: "Nacional — CFO, conselhos, saúde" },
  { slug: "FUNRIO",         label: "FUNRIO",            emoji: "🟡", desc: "Rio de Janeiro — federal e estadual" },
  { slug: "FEPESE",         label: "FEPESE",            emoji: "🌿", desc: "Santa Catarina — UFSC, municípios SC" },
  { slug: "FUNDATEC",       label: "FUNDATEC",          emoji: "🦆", desc: "Rio Grande do Sul — PROCERGS, RS" },
  { slug: "CS-UFG",         label: "CS-UFG",            emoji: "🟢", desc: "Goiás — concursos de Goiás e entorno" },
  { slug: "NC-UFPR",        label: "NC-UFPR",           emoji: "🟤", desc: "Paraná — UFPR, municípios PR" },
  { slug: "UECE-CEV",       label: "UECE-CEV",          emoji: "☀️", desc: "Ceará — concursos estaduais CE" },
  { slug: "NUCEPE",         label: "NUCEPE",            emoji: "🌵", desc: "Piauí — concursos estaduais PI" },
  { slug: "FAPEC",          label: "FAPEC",             emoji: "🌎", desc: "Mato Grosso do Sul — MS" },
  { slug: "UPENET/IAUPE",   label: "UPENET / IAUPE",   emoji: "🦁", desc: "Pernambuco — concursos PE" },
  { slug: "INSTITUTO ACESSO", label: "INSTITUTO ACESSO",emoji: "🔑", desc: "Espírito Santo — ES" },
  { slug: "AVANÇA SP",      label: "AVANÇA SP",         emoji: "🏙️", desc: "São Paulo — municípios paulistas" },
  { slug: "FUMARC",         label: "FUMARC",            emoji: "⛏️", desc: "Minas Gerais — PMMG, municípios MG" },
  { slug: "OBJETIVA",       label: "OBJETIVA",          emoji: "🎯", desc: "Sul do Brasil — municípios RS/SC" },
  { slug: "ESAF",           label: "ESAF",              emoji: "🏅", desc: "Escola de Administração Federal — histórica" },
  { slug: "INAZ DO PARÁ",   label: "INAZ DO PARÁ",     emoji: "🌿", desc: "Pará — concursos Norte" },
];

// ── Opções de tempo ────────────────────────────────────────────────────────────
const OPCOES_TEMPO = [
  { minutos: 30,  label: "30 min",  desc: "Estudos leves, rotina intensa" },
  { minutos: 60,  label: "1 hora",  desc: "Equilíbrio no dia a dia" },
  { minutos: 120, label: "2 horas", desc: "Dedicação consistente" },
  { minutos: 180, label: "3 horas", desc: "Foco intenso, resultado rápido" },
  { minutos: 240, label: "4+ horas",desc: "Imersão total na preparação" },
];

// ── Steps ──────────────────────────────────────────────────────────────────────
const STEPS: Step[] = ["nome", "modalidade", "cargo", "estado", "banca", "data", "tempo", "gerando", "pronto"];
const STEP_LABELS: Record<Step, string> = {
  nome: "Boas-vindas", modalidade: "Modalidade", cargo: "Cargo",
  estado: "Estado", banca: "Banca", data: "Data da prova",
  tempo: "Tempo de estudo", gerando: "Gerando plano", pronto: "Pronto!",
};

/** Passos que só aparecem para concurso público */
const STEPS_CONCURSO_ONLY: Step[] = ["cargo", "estado"];

function nextStep(current: Step, state: WizardState): Step {
  const idx = STEPS.indexOf(current);
  for (let i = idx + 1; i < STEPS.length; i++) {
    const s = STEPS[i];
    if (STEPS_CONCURSO_ONLY.includes(s) && state.modalidade !== "CONCURSO_PUBLICO") continue;
    if (s === "estado" && !state.cargo?.hasEstado) continue;
    return s;
  }
  return STEPS[STEPS.length - 1];
}

function prevStep(current: Step, state: WizardState): Step {
  const idx = STEPS.indexOf(current);
  for (let i = idx - 1; i >= 0; i--) {
    const s = STEPS[i];
    if (STEPS_CONCURSO_ONLY.includes(s) && state.modalidade !== "CONCURSO_PUBLICO") continue;
    if (s === "estado" && !state.cargo?.hasEstado) continue;
    return s;
  }
  return STEPS[0];
}

// ── Animações de geração ────────────────────────────────────────────────────────
const GEN_STEPS_CONCURSO = [
  { icon: "🎯", text: "Analisando seu cargo e área de concurso…" },
  { icon: "📚", text: "Selecionando as matérias mais cobradas pela banca…" },
  { icon: "⚖️",  text: "Calculando peso de cada disciplina…" },
  { icon: "📅", text: "Montando cronograma com base no seu tempo disponível…" },
  { icon: "🧠", text: "Configurando seu perfil de aprendizagem…" },
  { icon: "✨", text: "Finalizando seu plano personalizado…" },
];

const GEN_STEPS_ENEM = [
  { icon: "📘", text: "Mapeando as áreas do ENEM…" },
  { icon: "📚", text: "Selecionando conteúdos mais cobrados no Exame…" },
  { icon: "⚖️",  text: "Equilibrando as cinco áreas do conhecimento…" },
  { icon: "📅", text: "Montando cronograma com base no seu tempo disponível…" },
  { icon: "🧠", text: "Configurando seu perfil de aprendizagem…" },
  { icon: "✨", text: "Finalizando seu plano para o ENEM…" },
];

const GEN_STEPS_OAB = [
  { icon: "⚖️",  text: "Analisando as áreas do Exame de Ordem…" },
  { icon: "📚", text: "Selecionando as disciplinas mais cobradas pela FGV…" },
  { icon: "🔍", text: "Priorizando Direito Civil, Penal, Constitucional…" },
  { icon: "📅", text: "Montando cronograma com base no seu tempo disponível…" },
  { icon: "🧠", text: "Configurando seu perfil de aprendizagem…" },
  { icon: "✨", text: "Finalizando seu plano para a OAB…" },
];

// ── Component principal ────────────────────────────────────────────────────────
export function OnboardingClient({ userId, userName }: Props) {
  const [step, setStep] = useState<Step>("nome");
  const [state, setState] = useState<WizardState>({
    nome: userName.split(" ")[0] ?? "",
    modalidade: null,
    cargo: null,
    estado: null,
    banca: null,
    dataProva: null,
    horasEstudo: null,
  });

  const [genStep, setGenStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Barra de progresso (exclui gerando/pronto)
  const visibleSteps = STEPS.filter(s => {
    if (s === "gerando" || s === "pronto") return false;
    if (STEPS_CONCURSO_ONLY.includes(s) && state.modalidade !== "CONCURSO_PUBLICO") return false;
    if (s === "estado" && !state.cargo?.hasEstado) return false;
    return true;
  });
  const visibleIdx = visibleSteps.indexOf(step);
  const progress = Math.round(((visibleIdx) / (visibleSteps.length - 1)) * 100);

  function goNext() { setStep(s => nextStep(s, state)); }
  function goBack() { setStep(s => prevStep(s, state)); }

  function getCategoriaByModalidade(): string | null {
    if (state.modalidade === "ENEM") return "enem";
    if (state.modalidade === "OAB") return "oab";
    return state.cargo?.categoria ?? null;
  }

  const genStepsAnim = state.modalidade === "ENEM"
    ? GEN_STEPS_ENEM
    : state.modalidade === "OAB"
      ? GEN_STEPS_OAB
      : GEN_STEPS_CONCURSO;

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);

    for (let i = 0; i < genStepsAnim.length; i++) {
      setGenStep(i);
      await new Promise(r => setTimeout(r, 1100));
    }

    // Formata órgão com estado quando necessário: "PC-BA", "PM-SP", "SEFAZ-MG"
    let orgaoFinal = state.cargo?.orgao ?? null;
    if (state.cargo?.hasEstado && state.estado && state.cargo.sigla) {
      orgaoFinal = `${state.cargo.sigla}-${state.estado}`;
    }

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomePreferido: state.nome.trim() || userName,
          modalidade: state.modalidade ?? "CONCURSO_PUBLICO",
          cargo: state.cargo?.nome ?? null,
          orgao: orgaoFinal,
          banca: state.banca,
          dataProva: state.dataProva,
          horasEstudo: state.horasEstudo ? Math.round(state.horasEstudo / 60) : null,
          categoria: getCategoriaByModalidade(),
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, userName]);

  useEffect(() => {
    if (step === "gerando") save();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === "pronto") {
      const t = setTimeout(() => { window.location.href = "/hoje"; }, 2200);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(10,181,189,0.08) 0%, transparent 60%), #0a0d12" }}>

      <div className="w-full max-w-2xl">
        {/* Barra de progresso */}
        {step !== "gerando" && step !== "pronto" && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">
                {visibleIdx + 1} de {visibleSteps.length} — {STEP_LABELS[step]}
              </span>
              <span className="text-xs text-teal-400 font-semibold">{progress}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#0ab5bd] to-[#00ffa3] transition-all duration-700"
                style={{ width: `${progress}%` }} />
            </div>
            <div className="flex gap-2 mt-2 justify-center">
              {visibleSteps.map((s, i) => (
                <div key={s} className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i < visibleIdx ? "bg-[#0ab5bd] w-6" : i === visibleIdx ? "bg-[#0ab5bd] w-4" : "bg-white/10 w-3"
                )} />
              ))}
            </div>
          </div>
        )}

        {step === "nome" && (
          <StepNome nome={state.nome} onChange={nome => setState(s => ({ ...s, nome }))} onNext={goNext} />
        )}

        {step === "modalidade" && (
          <StepModalidade
            nome={state.nome}
            modalidade={state.modalidade}
            onSelect={m => { setState(s => ({ ...s, modalidade: m, cargo: null, estado: null })); setTimeout(goNext, 300); }}
            onBack={goBack}
          />
        )}

        {step === "cargo" && (
          <StepCargo
            cargo={state.cargo}
            onSelect={cargo => { setState(s => ({ ...s, cargo, estado: null, banca: cargo.banca ?? null })); setTimeout(goNext, 300); }}
            onBack={goBack}
          />
        )}

        {step === "estado" && (
          <StepEstado
            cargo={state.cargo}
            estado={state.estado}
            onSelect={est => { setState(s => ({ ...s, estado: est })); setTimeout(goNext, 300); }}
            onBack={goBack}
          />
        )}

        {step === "banca" && (
          <StepBanca
            banca={state.banca}
            sugestao={state.modalidade === "OAB" ? "FGV" : (state.cargo?.banca ?? null)}
            modalidade={state.modalidade}
            onSelect={banca => { setState(s => ({ ...s, banca })); setTimeout(goNext, 300); }}
            onBack={goBack}
          />
        )}

        {step === "data" && (
          <StepData
            dataProva={state.dataProva}
            onChange={dataProva => setState(s => ({ ...s, dataProva }))}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === "tempo" && (
          <StepTempo
            horasEstudo={state.horasEstudo}
            onSelect={minutos => { setState(s => ({ ...s, horasEstudo: minutos })); setTimeout(goNext, 300); }}
            onBack={goBack}
            error={saveError}
          />
        )}

        {step === "gerando" && <StepGerando genStep={genStep} saving={saving} steps={genStepsAnim} />}
        {step === "pronto" && <StepPronto nome={state.nome} modalidade={state.modalidade} cargo={state.cargo} />}
      </div>
    </div>
  );
}

// ── STEP: NOME ─────────────────────────────────────────────────────────────────
function StepNome({ nome, onChange, onNext }: {
  nome: string; onChange: (v: string) => void; onNext: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="text-center space-y-8">
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

// ── STEP: MODALIDADE ──────────────────────────────────────────────────────────
function StepModalidade({ nome, modalidade, onSelect, onBack }: {
  nome: string; modalidade: Modalidade | null;
  onSelect: (m: Modalidade) => void; onBack: () => void;
}) {
  const opcoes: { id: Modalidade; emoji: string; titulo: string; desc: string; detalhe: string }[] = [
    { id: "CONCURSO_PUBLICO", emoji: "🏛️", titulo: "Concurso Público", desc: "Prefeituras, tribunais, polícia, fiscal, bancário e muito mais.", detalhe: "Selecionaremos o cargo, órgão, estado e banca do seu concurso." },
    { id: "ENEM",             emoji: "📘", titulo: "ENEM",              desc: "Exame Nacional do Ensino Médio — acesso à universidade federal.", detalhe: "Treinaremos as 5 áreas do conhecimento com foco no estilo ENEM." },
    { id: "OAB",              emoji: "⚖️", titulo: "OAB — Exame de Ordem", desc: "Primeiro exame da OAB para exercer a advocacia.", detalhe: "Foco nas disciplinas cobradas pela FGV na 1ª e 2ª fases." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Ótimo, {nome.split(" ")[0] || "você"}! O que você vai estudar?</h2>
        <p className="text-sm text-gray-500">Escolha o tipo de prova para personalizarmos seu plano.</p>
      </div>
      <div className="space-y-3">
        {opcoes.map(op => (
          <button key={op.id} onClick={() => onSelect(op.id)}
            className={cn(
              "w-full flex items-start gap-4 px-5 py-4 rounded-xl border text-left transition-all",
              modalidade === op.id ? "bg-[#0ab5bd]/15 border-[#0ab5bd]/50" : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/20"
            )}>
            <span className="text-3xl flex-shrink-0 mt-0.5">{op.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={cn("text-base font-bold mb-0.5", modalidade === op.id ? "text-[#0ab5bd]" : "text-white")}>{op.titulo}</p>
              <p className="text-sm text-gray-400 mb-1">{op.desc}</p>
              <p className="text-xs text-gray-600">{op.detalhe}</p>
            </div>
            {modalidade === op.id ? <Check className="w-5 h-5 text-[#0ab5bd] flex-shrink-0 mt-1" /> : <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />}
          </button>
        ))}
      </div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
    </div>
  );
}

// ── STEP: CARGO — Cascata: Área → Órgão → Cargo ────────────────────────────────
function StepCargo({ cargo, onSelect, onBack }: {
  cargo: Cargo | null;
  onSelect: (c: Cargo) => void;
  onBack: () => void;
}) {
  const [nivel, setNivel] = useState<"area" | "orgao" | "cargo">("area");
  const [areaSel, setAreaSel] = useState<AreaCargo | null>(null);
  const [orgaoSel, setOrgaoSel] = useState<string | null>(null);

  // Órgãos únicos para a área selecionada
  const orgaosParaArea = areaSel ? getOrgaosParaArea(areaSel) : [];

  // Cargos para área+órgão selecionados
  const cargosParaOrgao = (areaSel && orgaoSel) ? getCargosParaOrgao(areaSel, orgaoSel) : [];

  // Emoji e cor da área
  const grupoAtual = areaSel ? GRUPOS_AREA.find(g => g.area === areaSel) : null;

  function selecionarArea(area: AreaCargo) {
    setAreaSel(area);
    setOrgaoSel(null);
    setNivel("orgao");
  }

  function selecionarOrgao(orgao: string) {
    setOrgaoSel(orgao);
    setNivel("cargo");
  }

  function voltarNivel() {
    if (nivel === "cargo") { setNivel("orgao"); setOrgaoSel(null); }
    else if (nivel === "orgao") { setNivel("area"); setAreaSel(null); }
    else { onBack(); }
  }

  return (
    <div className="space-y-5">
      {/* Header com breadcrumb */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">
          {nivel === "area" ? "Qual é a sua área de concurso?" : nivel === "orgao" ? "Qual é o órgão?" : "Qual cargo você vai prestar?"}
        </h2>
        <p className="text-sm text-gray-500">
          {nivel === "area" ? "Selecione a área para ver os órgãos disponíveis." : nivel === "orgao" ? "Selecione o órgão para ver os cargos." : "Selecione o cargo exato para personalizar seu plano."}
        </p>
      </div>

      {/* Breadcrumb trail */}
      {nivel !== "area" && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button onClick={() => { setNivel("area"); setAreaSel(null); setOrgaoSel(null); }}
            className="text-[#0ab5bd] hover:underline">
            {grupoAtual?.emoji} {grupoAtual?.label}
          </button>
          {nivel === "cargo" && orgaoSel && (
            <>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <button onClick={() => { setNivel("orgao"); setOrgaoSel(null); }}
                className="text-[#0ab5bd] hover:underline truncate max-w-[200px]">
                {orgaoSel}
              </button>
            </>
          )}
        </div>
      )}

      {/* NÍVEL 1: Áreas */}
      {nivel === "area" && (
        <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
          {GRUPOS_AREA.map(g => (
            <button key={g.area} onClick={() => selecionarArea(g.area)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15 text-left transition-all">
              <span className="text-2xl flex-shrink-0">{g.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-tight">{g.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {CARGOS.filter(c => c.area === g.area).length} cargos
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* NÍVEL 2: Órgãos da área */}
      {nivel === "orgao" && areaSel && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
          {orgaosParaArea.map(orgao => {
            const qtd = getCargosParaOrgao(areaSel, orgao).length;
            return (
              <button key={orgao} onClick={() => selecionarOrgao(orgao)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15 text-left transition-all">
                <span className="text-xl flex-shrink-0">{grupoAtual?.emoji ?? "🏛️"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{orgao}</p>
                  <p className="text-xs text-gray-600">{qtd} cargo{qtd !== 1 ? "s" : ""} disponíve{qtd !== 1 ? "is" : "l"}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* NÍVEL 3: Cargos do órgão */}
      {nivel === "cargo" && (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
          {cargosParaOrgao.map(c => {
            const isSelected = cargo?.id === c.id;
            return (
              <button key={c.id} onClick={() => onSelect(c)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all",
                  isSelected ? "bg-[#0ab5bd]/15 border-[#0ab5bd]/50" : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
                )}>
                <span className="text-xl flex-shrink-0">{grupoAtual?.emoji ?? "📋"}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", isSelected ? "text-[#0ab5bd]" : "text-white")}>{c.nome}</p>
                  {c.hasEstado && <p className="text-xs text-amber-500/80 mt-0.5">Selecionar estado na próxima etapa</p>}
                </div>
                {isSelected ? <Check className="w-4 h-4 text-[#0ab5bd] flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Cargo selecionado (resumo) + botão voltar */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={voltarNivel} className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all flex items-center gap-1.5 text-sm">
          <ChevronLeft className="w-4 h-4" />
          {nivel === "area" ? "Voltar" : nivel === "orgao" ? "Áreas" : "Órgãos"}
        </button>
        {cargo && nivel === "cargo" && (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0ab5bd]/10 border border-[#0ab5bd]/25">
            <Check className="w-4 h-4 text-[#0ab5bd] flex-shrink-0" />
            <span className="text-sm text-[#0ab5bd] font-medium truncate">{cargo.nome}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── STEP: ESTADO ──────────────────────────────────────────────────────────────
function StepEstado({ cargo, estado, onSelect, onBack }: {
  cargo: Cargo | null;
  estado: string | null;
  onSelect: (est: string) => void;
  onBack: () => void;
}) {
  const labelCargo = cargo?.sigla ?? cargo?.nome ?? "cargo";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Em qual estado?</h2>
        <p className="text-sm text-gray-500">
          Selecione o estado do seu concurso para <strong className="text-gray-300">{labelCargo}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
        {ESTADOS.map(est => {
          const isSelected = estado === est.sigla;
          return (
            <button key={est.sigla} onClick={() => onSelect(est.sigla)}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-3.5 rounded-xl border text-center transition-all",
                isSelected ? "bg-[#0ab5bd]/15 border-[#0ab5bd]/50" : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
              )}>
              <span className={cn("text-base font-bold", isSelected ? "text-[#0ab5bd]" : "text-white")}>{est.sigla}</span>
              <span className="text-xs text-gray-500 mt-0.5 leading-tight">{est.nome}</span>
            </button>
          );
        })}
      </div>

      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
    </div>
  );
}

// ── STEP: BANCA ───────────────────────────────────────────────────────────────
function StepBanca({ banca, sugestao, modalidade, onSelect, onBack }: {
  banca: string | null;
  sugestao: string | null;
  modalidade: Modalidade | null;
  onSelect: (b: string | null) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">
          {modalidade === "OAB" ? "A banca da OAB é a FGV" : "Qual é a banca do seu concurso?"}
        </h2>
        <p className="text-sm text-gray-500">
          {modalidade === "OAB"
            ? "Confirme ou altere se quiser treinar com outra banca."
            : "Cada banca tem um estilo único. Isso calibra seu treinamento."}
        </p>
      </div>

      {sugestao && (
        <div className="px-4 py-2.5 rounded-lg bg-[#0ab5bd]/10 border border-[#0ab5bd]/25 text-sm text-[#0ab5bd]">
          💡 Sugestão com base no cargo selecionado: <strong>{sugestao}</strong>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {BANCAS.map(b => (
          <button key={b.slug} onClick={() => onSelect(b.slug)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all",
              banca === b.slug ? "bg-[#0ab5bd]/15 border-[#0ab5bd]/50" : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
            )}>
            <span className="text-xl flex-shrink-0">{b.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold", banca === b.slug ? "text-[#0ab5bd]" : "text-white")}>{b.label}</p>
              <p className="text-xs text-gray-500 truncate">{b.desc}</p>
            </div>
            {banca === b.slug && <Check className="w-4 h-4 text-[#0ab5bd] flex-shrink-0" />}
          </button>
        ))}

        {/* Não definida */}
        <button onClick={() => onSelect(null)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all",
            banca === null ? "bg-white/8 border-white/20" : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
          )}>
          <span className="text-xl flex-shrink-0">🤷</span>
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

// ── STEP: DATA ────────────────────────────────────────────────────────────────
function StepData({ dataProva, onChange, onNext, onBack }: {
  dataProva: string | null; onChange: (v: string | null) => void; onNext: () => void; onBack: () => void;
}) {
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
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input type="date" value={dataProva ?? ""} min={minStr}
            onChange={e => onChange(e.target.value || null)}
            className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#0ab5bd]/60 transition-all [color-scheme:dark]" />
        </div>
        {diasRestantes !== null && diasRestantes > 0 && (
          <div className="px-4 py-3 rounded-xl bg-[#0ab5bd]/10 border border-[#0ab5bd]/25 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0ab5bd]" />
            <span className="text-[#0ab5bd] font-semibold">{diasRestantes} dias</span>
            <span className="text-gray-400">até a prova — vamos aproveitar bem!</span>
          </div>
        )}
        <button onClick={() => { onChange(null); onNext(); }}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all",
            !dataProva ? "bg-white/8 border-white/20" : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
          )}>
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
          <button onClick={onNext}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0ab5bd] text-black hover:bg-[#09a3aa] transition-all flex items-center gap-2">
            Continuar <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── STEP: TEMPO ───────────────────────────────────────────────────────────────
function StepTempo({ horasEstudo, onSelect, onBack, error }: {
  horasEstudo: number | null; onSelect: (min: number) => void; onBack: () => void; error: string | null;
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
          <button key={o.minutos} onClick={() => onSelect(o.minutos)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all",
              horasEstudo === o.minutos ? "bg-[#0ab5bd]/15 border-[#0ab5bd]/50" : "bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/15"
            )}>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
              horasEstudo === o.minutos ? "bg-[#0ab5bd] text-black" : "bg-white/8 text-gray-400"
            )}>
              {o.label.replace(" ", "")}
            </div>
            <div>
              <p className={cn("text-sm font-semibold", horasEstudo === o.minutos ? "text-[#0ab5bd]" : "text-white")}>{o.label} por dia</p>
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

// ── STEP: GERANDO ─────────────────────────────────────────────────────────────
function StepGerando({ genStep, saving, steps }: {
  genStep: number; saving: boolean; steps: { icon: string; text: string }[];
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-10">
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
        {steps.map((s, i) => (
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

// ── STEP: PRONTO ──────────────────────────────────────────────────────────────
function StepPronto({ nome, modalidade, cargo }: {
  nome: string; modalidade: Modalidade | null; cargo: Cargo | null;
}) {
  const subtitulo = () => {
    if (modalidade === "ENEM") return "Seu plano de estudos para o ENEM está pronto.";
    if (modalidade === "OAB") return "Seu plano para o Exame de Ordem (OAB) está pronto.";
    if (cargo) return `Seu plano para ${cargo.nome} está pronto.`;
    return "Seu plano de estudos está pronto.";
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-[#0ab5bd]/20 border-2 border-[#0ab5bd]/50 flex items-center justify-center text-4xl">🎉</div>
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Pronto, {nome.split(" ")[0]}!</h2>
        <p className="text-gray-400">{subtitulo()}</p>
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
