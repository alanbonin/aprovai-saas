"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, FileText, CheckCircle, ArrowRight, Calendar, Clock, BookOpen, Target, Zap, Brain, Sparkles } from "lucide-react";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Agent { id: string; name: string; description?: string; categoria?: string | null; banca?: string | null; color?: string | null; }
interface Message { role: "user" | "assistant"; content: string; ts?: number; }
interface RotinaDiaria { questoes: number; flashcards: number; leituraMin: number; revisaoMin: number; simulado: string; dica?: string; }
interface StudyPlan { titulo: string; matérias: string[]; horasPorDia: number; foco: string; editalStatus?: string; rotinaDiaria?: RotinaDiaria; cronograma: { semana: string; tema: string }[]; }

type Stage = "welcome" | "modalidade" | "chat" | "generating" | "plan";


// ── Steps da barra de progresso — por modalidade ─────────────────────────────
const PROGRESS_LABELS_MAP: Record<string, string[]> = {
  CONCURSO_PUBLICO: ["Cargo/Órgão", "Banca", "Data da Prova", "Horas/dia", "Nível", "Horário", "Dificuldades"],
  ENEM:            ["Etapa escolar", "Áreas foco", "Data ENEM",  "Horas/dia", "Nível", "Horário", "Dificuldades"],
  VESTIBULAR:      ["Vestibular",    "Curso/trilha", "Data",     "Horas/dia", "Nível", "Horário", "Dificuldades"],
  OAB:             ["Fase OAB",      "Edição",       "Data",     "Horas/dia", "Nível", "Horário", "Dificuldades"],
  REVALIDA:        ["País formação",  "Etapa",        "Data",     "Horas/dia", "Nível", "Horário", "Dificuldades"],
  CFC:             ["Habilitação",   "Data",         "Horas/dia","Nível",     "Horário","Dificuldades", ""],
};

// ── Marca o texto com **bold** e _italic_ ─────────────────────────────────────
function renderMd(text: string) {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ fontWeight: 700, color: "#ffffff" }}>{p}</strong> : p)}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

// ── Avatar da IA (orb animado) ────────────────────────────────────────────────
function AIOrb({ thinking }: { thinking: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: 38, height: 38 }}>
      <div className={`absolute inset-0 rounded-full transition-all duration-700 ${thinking ? "scale-150 opacity-50" : "scale-125 opacity-30"}`}
        style={{ background: "radial-gradient(circle, #0ab5bd 0%, transparent 70%)", animation: thinking ? "obPulse 1.2s ease-in-out infinite" : "obPulse 3s ease-in-out infinite" }} />
      <div className="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden"
        style={{ background: "radial-gradient(circle at 35% 30%, #b0f0f5, #0ab5bd 40%, #044d52)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)", borderRadius: "50%" }} />
        <div className="absolute inset-0 rounded-full" style={{ border: "1.5px solid rgba(10,181,189,0.5)" }} />
        {thinking && (
          <div className="absolute inset-0 rounded-full" style={{ border: "1.5px solid rgba(10,181,189,0.7)", animation: "orbRing 1.2s ease-out infinite" }} />
        )}
        <span style={{ fontSize: 16, position: "relative", zIndex: 1 }}>✦</span>
      </div>
    </div>
  );
}

// ── Indicador de digitação ────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-teal-400/60"
          style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

// ── Barra de progresso ────────────────────────────────────────────────────────
function ProgressBar({ step, labels }: { step: number; labels: string[] }) {
  const pct = Math.min(100, (step / labels.length) * 100);
  const label = step >= labels.length
    ? "✓ Perfil completo"
    : `Coletando: ${labels[Math.min(step, labels.length - 1)]}`;

  return (
    <div className="px-5 py-3 border-b border-white/5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-slate-300 font-medium">{label}</span>
        <span className="text-xs text-teal-400/70 font-semibold">{Math.round(pct)}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #0ab5bd, #00ffa3)" }} />
      </div>
      {/* Dots indicadores */}
      <div className="flex justify-between mt-1.5 px-0.5">
        {labels.map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < step ? "#0ab5bd" : "rgba(255,255,255,0.1)" }} />
        ))}
      </div>
    </div>
  );
}

// ── Tela de geração do plano ──────────────────────────────────────────────────
function GeneratingScreen() {
  const steps = [
    { icon: "🔍", text: "Analisando seu perfil e objetivos…" },
    { icon: "📚", text: "Selecionando matérias prioritárias…" },
    { icon: "⏰", text: "Calibrando carga horária diária…" },
    { icon: "📅", text: "Montando cronograma semanal…" },
    { icon: "🎯", text: "Configurando seus mentores IA…" },
    { icon: "✨", text: "Finalizando seu plano personalizado…" },
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= steps.length - 1) return;
    const t = setTimeout(() => setActive(a => a + 1), 1200);
    return () => clearTimeout(t);
  }, [active, steps.length]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-10">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #0ab5bd 0%, transparent 70%)", animation: "obPulse 2s ease-in-out infinite", opacity: 0.4 }} />
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #b0f0f5, #0ab5bd 40%, #044d52)" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)", borderRadius: "50%" }} />
        </div>
        <div className="absolute inset-0 rounded-full flex items-center justify-center text-4xl">🧠</div>
        <div className="absolute inset-0 rounded-full" style={{ border: "2px solid rgba(10,181,189,0.4)", animation: "orbRing 2s ease-out infinite" }} />
        <div className="absolute inset-0 rounded-full" style={{ border: "2px solid rgba(10,181,189,0.25)", animation: "orbRing 2s 0.7s ease-out infinite" }} />
      </div>

      <div className="space-y-2 w-full max-w-xs">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3 transition-all duration-500"
            style={{ opacity: i <= active ? 1 : 0.2, transform: i <= active ? "none" : "translateY(4px)" }}>
            <span className="text-lg flex-shrink-0">{s.icon}</span>
            <div className="flex-1 text-left">
              <span className="text-sm text-slate-300">{s.text}</span>
            </div>
            {i < active && <CheckCircle size={14} className="text-teal-400 flex-shrink-0" />}
            {i === active && (
              <div className="w-3.5 h-3.5 flex-shrink-0 border-2 border-teal-400/40 border-t-teal-400 rounded-full" style={{ animation: "spin 0.7s linear infinite" }} />
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-300">Isso levará apenas alguns segundos…</p>
    </div>
  );
}

// ── Tela de revelação do plano ────────────────────────────────────────────────
function PlanReveal({ plan, agents, onEnter }: { plan: StudyPlan | null; agents: Agent[]; onEnter: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      minHeight: 0,               /* ← obrigatório para flex+scroll funcionar */
      transition: "opacity 0.7s, transform 0.7s",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(16px)",
    }}>
      {/* Plano scrollável */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
      <div style={{ maxWidth: 512, margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "obPulse 3s ease-in-out infinite" }}>🚀</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>
            {plan ? "Seu plano está pronto!" : "Perfil criado com sucesso!"}
          </h1>
          <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>
            {plan ? "Personalizado exclusivamente para você conquistar sua aprovação." : "Seu workspace foi configurado. O plano detalhado ficará disponível dentro da plataforma."}
          </p>
        </div>

        {/* Fallback quando plano não carregou */}
        {!plan && agents.length > 0 && (
          <div style={{ borderRadius: 16, padding: 20, textAlign: "center", background: "rgba(10,181,189,0.08)", border: "1px solid rgba(10,181,189,0.2)" }}>
            <p style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 8 }}>Seus mentores IA foram selecionados e suas matérias foram configuradas.</p>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Dentro do workspace você poderá ver seu plano completo, estudar questões e conversar com seus mentores.</p>
          </div>
        )}

        {/* Cargo card */}
        {plan && (
          <div style={{ borderRadius: 16, overflow: "hidden", background: "linear-gradient(135deg, rgba(10,181,189,0.15), rgba(10,181,189,0.05))", border: "1px solid rgba(10,181,189,0.3)" }}>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Target size={14} color="#2dd4bf" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#2dd4bf", textTransform: "uppercase", letterSpacing: "0.06em" }}>Seu objetivo</span>
              </div>
              <p style={{ fontWeight: 700, color: "#ffffff", fontSize: 15, marginBottom: 4 }}>{plan.titulo}</p>
              <p style={{ fontSize: 12, color: "#cbd5e1" }}>{plan.foco}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        {plan && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ borderRadius: 14, padding: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Clock size={16} color="#2dd4bf" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>{plan.horasPorDia}h</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>por dia recomendadas</div>
            </div>
            <div style={{ borderRadius: 14, padding: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <BookOpen size={16} color="#f59e0b" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>{(plan.matérias ?? []).length}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>matérias prioritárias</div>
            </div>
          </div>
        )}

        {/* Rotina Diária */}
        {plan?.rotinaDiaria && (
          <div style={{ borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
              <Brain size={14} color="#2dd4bf" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rotina diária recomendada</span>
            </div>
            <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { icon: "🎯", label: "Questões/dia", value: `${plan.rotinaDiaria.questoes} questões` },
                { icon: "🃏", label: "Flashcards/dia", value: `${plan.rotinaDiaria.flashcards} cards` },
                { icon: "📖", label: "Leitura", value: `${plan.rotinaDiaria.leituraMin} min` },
                { icon: "🔁", label: "Revisão", value: `${plan.rotinaDiaria.revisaoMin} min` },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 12, padding: "10px 12px", background: "rgba(10,181,189,0.08)", border: "1px solid rgba(10,181,189,0.18)" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Simulado</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", textTransform: "capitalize" }}>{plan.rotinaDiaria.simulado}</div>
              </div>
            </div>
            {plan.rotinaDiaria.dica && (
              <div style={{ padding: "0 20px 16px" }}>
                <div style={{ padding: "10px 14px", borderRadius: 12, fontSize: 12, color: "#5eead4", fontStyle: "italic", background: "rgba(10,181,189,0.08)", border: "1px solid rgba(10,181,189,0.15)" }}>
                  💡 {plan.rotinaDiaria.dica}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matérias */}
        {plan && (plan.matérias ?? []).length > 0 && (
          <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={14} color="#f59e0b" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Matérias prioritárias</span>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(plan.matérias ?? []).map((m, i) => (
                <span key={i} style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500, background: "rgba(10,181,189,0.12)", border: "1px solid rgba(10,181,189,0.25)", color: "#7ae8ed" }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cronograma completo */}
        {plan && plan.cronograma.length > 0 && (
          <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={14} color="#a78bfa" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cronograma de Estudos</span>
              </div>
              <span style={{ fontSize: 11, color: "#64748b" }}>{plan.cronograma.length} semanas</span>
            </div>
            {plan.editalStatus && (
              <div style={{ padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99,
                  ...(plan.editalStatus === "com_edital"
                    ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" }
                    : { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#fde68a" }) }}>
                  {plan.editalStatus === "com_edital" ? "✓ Baseado no edital fornecido" : "⚡ Baseado em editais históricos desta banca/cargo"}
                </span>
              </div>
            )}
            <div>
              {plan.cronograma.map((c: { semana: string; tema: string }, i: number) => {
                const dias = c.tema.split("|").map(d => d.trim()).filter(Boolean);
                return (
                  <div key={i} style={{ padding: "12px 20px", display: "flex", alignItems: "flex-start", gap: 16, borderBottom: i < plan.cronograma.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div style={{ width: 56, flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>{c.semana}</div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      {dias.map((dia, j) => (
                        <div key={j} style={{ fontSize: 13, color: "#cbd5e1", display: "flex", alignItems: "flex-start", gap: 8 }}>
                          {dias.length > 1 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(167,139,250,0.4)", flexShrink: 0, marginTop: 6 }} />}
                          <span>{dia}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mentores */}
        {agents.length > 0 && (
          <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={14} color="#f472b6" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Seus mentores IA</span>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {agents.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0, background: a.color ? `${a.color}22` : "rgba(10,181,189,0.15)", border: `1px solid ${a.color ?? "#0ab5bd"}44`, color: a.color ?? "#0ab5bd" }}>
                    {a.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 2 }}>{a.name}</p>
                    {a.description && <p style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</p>}
                  </div>
                  <CheckCircle size={14} color="#2dd4bf" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BOTÃO PRINCIPAL — dentro do scroll, sempre acessível ── */}
        <div style={{ paddingTop: 8, paddingBottom: 24 }}>
          <button
            onClick={onEnter}
            style={{
              width: "100%", padding: "18px 24px", borderRadius: 18, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #0ab5bd, #0891b2)",
              color: "#ffffff", fontSize: 16, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 0 40px rgba(10,181,189,0.5), 0 4px 20px rgba(0,0,0,0.4)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            🚀 Entrar no workspace
            <ArrowRight size={18} />
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "#475569", marginTop: 10 }}>
            Você pode ajustar seu plano a qualquer momento dentro da plataforma.
          </p>
        </div>

      </div>
      </div>
    </div>
  );
}

// ── Seletor de modalidade ─────────────────────────────────────────────────────
const MODALIDADE_OPTIONS = [
  { id: "CONCURSO_PUBLICO", icon: "🏛️", title: "Concurso Público",  desc: "Federal, estadual ou municipal. Qualquer cargo e banca.",         color: "#0ab5bd" },
  { id: "ENEM",             icon: "📋", title: "ENEM",               desc: "Plano personalizado por área de conhecimento e Redação.",          color: "#6366f1" },
  { id: "VESTIBULAR",       icon: "🎓", title: "Vestibular",          desc: "Para qualquer vestibular. Medicina, Engenharia, Direito e mais.",  color: "#8b5cf6" },
  { id: "OAB",              icon: "⚖️", title: "OAB",                 desc: "1ª fase (objetiva) ou 2ª fase (peça processual).",                color: "#f59e0b" },
  { id: "REVALIDA",         icon: "🩺", title: "REVALIDA",            desc: "Revalidação de diploma médico estrangeiro no Brasil.",             color: "#10b981" },
  { id: "CFC",              icon: "📊", title: "CFC",                 desc: "Exame de Suficiência do Conselho Federal de Contabilidade.",       color: "#ec4899" },
];

function ModalidadeChooser({ onSelect }: { onSelect: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  function confirm() {
    if (selected) onSelect(selected);
  }

  return (
    <div className={`flex-1 overflow-y-auto transition-all duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ transform: visible ? "none" : "translateY(16px)" }}>
      <div className="max-w-lg mx-auto px-5 py-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎯</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>
            Para qual exame você vai se preparar?
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
            Vou personalizar todo o seu plano de estudos com base na sua escolha.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {MODALIDADE_OPTIONS.map(opt => {
            const isSelected = selected === opt.id;
            return (
              <button key={opt.id} onClick={() => setSelected(opt.id)}
                className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: isSelected ? `${opt.color}22` : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${isSelected ? opt.color : "rgba(255,255,255,0.14)"}`,
                  boxShadow: isSelected ? `0 0 24px ${opt.color}35` : "none",
                }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${opt.color}28`, border: `1px solid ${opt.color}50` }}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p style={{ fontWeight: 700, fontSize: 14, color: "#ffffff", margin: 0 }}>{opt.title}</p>
                    {isSelected && (
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: `${opt.color}30`, color: opt.color }}>
                        ✓ Selecionado
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, marginTop: 3, lineHeight: 1.5, color: isSelected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)" }}>
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={confirm} disabled={!selected}
          className="w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontWeight: 700, background: "linear-gradient(135deg, #0ab5bd, #0891b2)", color: "#fff", boxShadow: selected ? "0 0 30px rgba(10,181,189,0.4)" : "none" }}>
          Continuar <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Tela de boas-vindas ───────────────────────────────────────────────────────
function WelcomeScreen({ userName, maxConcursos, onStart }: { userName: string; maxConcursos: number; onStart: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const isTrial = maxConcursos === 1;

  return (
    <div className={`flex-1 flex flex-col items-center justify-center px-8 text-center gap-8 transition-all duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
      {/* Logo orb grande */}
      <div className="relative" style={{ width: 100, height: 100 }}>
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #0ab5bd40 0%, transparent 70%)", animation: "obPulse 3s ease-in-out infinite" }} />
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #0ab5bd22 0%, transparent 70%)", animation: "obPulse 3s 1s ease-in-out infinite" }} />
        <div className="relative w-full h-full rounded-full flex items-center justify-center"
          style={{ background: "radial-gradient(circle at 35% 30%, #b0f0f5, #0ab5bd 40%, #044d52)", border: "2px solid rgba(10,181,189,0.5)" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)", borderRadius: "50%" }} />
          <Image src="/logo-icon.svg" alt="Aprovai" width={60} height={60} style={{ position: "relative", zIndex: 1, opacity: 0.9 }} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: "rgba(10,181,189,0.12)", border: "1px solid rgba(10,181,189,0.3)", color: "#7ae8ed" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" style={{ animation: "obPulse 1.5s ease-in-out infinite" }} />
          Mentor IA disponível
        </div>
        <h1 className="text-2xl font-bold text-white">
          {userName ? `Olá, ${userName.split(" ")[0]}! 👋` : "Bem-vindo à Aprovai! 👋"}
        </h1>
        <p className="text-slate-200 text-sm leading-relaxed max-w-sm">
          Vou ser sua estrategista pessoal de concursos. Em menos de 3 minutos, monto um{" "}
          <strong className="text-white">plano de estudos personalizado</strong> para você.
        </p>

        {/* Badge do plano */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
          style={{ background: isTrial ? "rgba(251,191,36,0.08)" : "rgba(99,102,241,0.1)", border: isTrial ? "1px solid rgba(251,191,36,0.25)" : "1px solid rgba(99,102,241,0.3)", color: isTrial ? "#fbbf24" : "#a5b4fc" }}>
          {isTrial ? (
            <><Brain size={12} /> Trial: 1 concurso foco — direto ao ponto!</>
          ) : (
            <><Sparkles size={12} /> Seu plano permite até {maxConcursos} concursos simultâneos!</>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {[
          { icon: "🎯", label: "Plano personalizado" },
          { icon: "📊", label: "Cronograma semanal" },
          { icon: "🤖", label: "Mentor proativo" },
        ].map(f => (
          <div key={f.label} className="rounded-xl p-3 text-center space-y-1.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-xl">{f.icon}</div>
            <div className="text-xs text-slate-300 leading-tight">{f.label}</div>
          </div>
        ))}
      </div>

      <button onClick={onStart}
        className="w-full max-w-xs py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
        style={{ background: "linear-gradient(135deg, #0ab5bd, #0891b2)", color: "#fff", boxShadow: "0 0 30px rgba(10,181,189,0.35)" }}>
        Começar agora <ArrowRight size={16} />
      </button>
      <p className="text-xs text-slate-300">Leva menos de 3 minutos · Sem necessidade de cartão</p>
    </div>
  );
}

// ── Chat stage ────────────────────────────────────────────────────────────────
interface ChatStageProps {
  messages: Message[];
  input: string;
  loading: boolean;
  onInput: (v: string) => void;
  onSend: (msg?: string) => void;
  editalVisible: boolean;
  setEditalVisible: (v: boolean) => void;
  editalText: string;
  setEditalText: (v: string) => void;
  onEditalSubmit: () => void;
}


function ChatStage({ messages, input, loading, onInput, onSend, editalVisible, setEditalVisible, editalText, setEditalText, onEditalSubmit }: ChatStageProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "msgIn 0.3s ease-out both" }}>
            {msg.role === "assistant" && <AIOrb thinking={false} />}
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
              style={msg.role === "user"
                ? { background: "linear-gradient(135deg, #0891b2, #0ab5bd)", borderRadius: "18px 18px 4px 18px", color: "#fff" }
                : { background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: "18px 18px 18px 4px", color: "#e2e8f0" }}>
              {msg.content ? renderMd(msg.content) : <TypingDots />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start" style={{ animation: "msgIn 0.3s ease-out both" }}>
            <AIOrb thinking={true} />
            <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 18px 4px" }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Edital textarea */}
      {editalVisible && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden" style={{ background: "rgba(10,181,189,0.06)", border: "1px solid rgba(10,181,189,0.25)" }}>
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-teal-500/15">
            <FileText size={12} className="text-teal-400" />
            <span className="text-xs font-semibold text-teal-400">Conteúdo programático do edital</span>
          </div>
          <textarea value={editalText} onChange={e => setEditalText(e.target.value)} rows={5}
            placeholder="Cole aqui o conteúdo programático ou as matérias do edital…"
            className="w-full px-4 py-3 text-xs bg-transparent resize-none outline-none placeholder-slate-400" style={{ color: "#e2e8f0" }} />
          <div className="px-4 py-2 flex gap-2 justify-end">
            <button onClick={() => setEditalVisible(false)} className="text-xs text-slate-300 hover:text-slate-200 transition-colors px-3 py-1.5">Cancelar</button>
            <button onClick={onEditalSubmit} disabled={!editalText.trim()}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all disabled:opacity-40"
              style={{ background: "rgba(10,181,189,0.2)", border: "1px solid rgba(10,181,189,0.4)", color: "#7ae8ed" }}>
              Enviar →
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-5 pt-2">
        <div className="flex gap-2 items-end">
          <button onClick={() => setEditalVisible(!editalVisible)} title="Colar edital"
            className="p-2.5 rounded-xl transition-colors flex-shrink-0"
            style={{ background: editalVisible ? "rgba(10,181,189,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${editalVisible ? "rgba(10,181,189,0.4)" : "rgba(255,255,255,0.15)"}`, color: editalVisible ? "#7ae8ed" : "#94a3b8" }}>
            <FileText size={15} />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => onInput(e.target.value)}
              disabled={loading}
              placeholder="Responda aqui…"
              rows={1}
              className="onboarding-input w-full px-4 py-3 pr-12 text-sm rounded-2xl resize-none outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", minHeight: 48, maxHeight: 120 }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} />
            <button disabled={loading || !input.trim()} onClick={() => onSend()}
              className="absolute right-2.5 bottom-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{ background: loading || !input.trim() ? "rgba(10,181,189,0.2)" : "linear-gradient(135deg, #0ab5bd, #0891b2)", opacity: loading || !input.trim() ? 0.5 : 1 }}>
              {loading
                ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" style={{ animation: "spin 0.7s linear infinite" }} />
                : <Send size={14} color="#fff" />}
            </button>
          </div>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function OnboardingClient({
  userId,
  userName,
  agents,
  maxConcursos = 1,
}: {
  userId: string;
  userName: string;
  agents: Agent[];
  maxConcursos?: number;
}) {
  void userId;

  const [stage, setStage] = useState<Stage>("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [editalVisible, setEditalVisible] = useState(false);
  const [editalText, setEditalText] = useState("");
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [modalidade, setModalidade] = useState("CONCURSO_PUBLICO");
  const initSent = useRef(false);

  const isTrial = maxConcursos === 1;

  // Primeira mensagem — gerada pela API para não ter duplicata
  async function startChat(selectedModalidade: string) {
    setModalidade(selectedModalidade);
    setStage("chat");
    setMessages([{ role: "assistant", content: "" }]); // placeholder de loading
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Mensagem especial de init — a IA gera o primeiro greeting
        body: JSON.stringify({ message: "__INIT__", history: [], maxConcursos, userName, modalidade: selectedModalidade }),
      });
      const data = await res.json();
      const text: string = data.text ?? "";
      // Anima o texto letra a letra
      let built = "";
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        built += (i === 0 ? "" : " ") + words[i];
        const snap = built;
        setMessages([{ role: "assistant", content: snap }]);
        await new Promise(r => setTimeout(r, 16));
      }
    } catch {
      setMessages([{ role: "assistant", content: "Olá! 😊 Como você prefere ser chamado(a)?" }]);
    } finally {
      setLoading(false);
    }
  }

const send = useCallback(async (customMsg?: string) => {
    const text = (customMsg ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text, ts: Date.now() };
    const historyToSend = messages.slice(-14);
    const newMessages: Message[] = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    const progressLabels = PROGRESS_LABELS_MAP[modalidade] ?? PROGRESS_LABELS_MAP.CONCURSO_PUBLICO;
    setStep(prev => Math.min(prev + 1, progressLabels.length));

    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyToSend, maxConcursos, userName, modalidade }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${data.error ?? "Erro ao processar. Tente novamente."}` }]);
        return;
      }

      const responseText: string = data.text ?? "";

      // Animated text reveal
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      const words = responseText.split(" ");
      let built = "";
      for (let i = 0; i < words.length; i++) {
        built += (i === 0 ? "" : " ") + words[i];
        const current = built;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: current };
          return updated;
        });
        await new Promise(r => setTimeout(r, 16));
      }

      if (data.done) {
        if (data.agents?.length) setSelectedAgents(data.agents as Agent[]);
        setStep((PROGRESS_LABELS_MAP[modalidade] ?? PROGRESS_LABELS_MAP.CONCURSO_PUBLICO).length);
        await new Promise(r => setTimeout(r, 5500)); // tempo para ler a mensagem final
        setStage("generating");
        try {
          // Roda fetch e animação mínima em paralelo — plano aparece assim que a IA terminar
          const [planoRes] = await Promise.all([
            fetch("/api/onboarding/plano", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                profile: {
                  ...data.profile,
                  editalContent: editalText.trim() || null,
                },
              }),
            }),
            new Promise(r => setTimeout(r, 3000)), // mínimo 3s de animação
          ]);
          if (planoRes.ok) {
            const planoData = await planoRes.json();
            if (planoData.plan) setStudyPlan(planoData.plan as StudyPlan);
          }
        } catch { /* plan generation failed — show anyway */ }
        setStage("plan");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de conexão.";
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${msg} Tente novamente.` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, maxConcursos, modalidade]);

  function handleEditalSubmit() {
    const msg = `Aqui está o conteúdo programático do edital:\n\n${editalText}`;
    setEditalText("");
    setEditalVisible(false);
    send(msg);
  }

  function handleEnterWorkspace() {
    window.location.replace("/workspace?welcome=1");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes obPulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes orbRing { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.2);opacity:0} }
        @keyframes typingBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes bgDrift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-20px)} }
        @keyframes bgDrift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,15px)} }
        @keyframes bgDrift3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,25px)} }
      `}</style>

      <div style={{ height: "100dvh", background: "#050511", color: "#e2e8f0", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* Ambient background orbs */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(10,181,189,0.07) 0%, transparent 70%)", top: "-20%", left: "-10%", animation: "bgDrift1 18s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", bottom: "-10%", right: "-5%", animation: "bgDrift2 22s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,163,0.04) 0%, transparent 70%)", top: "40%", right: "15%", animation: "bgDrift3 15s ease-in-out infinite" }} />
        </div>

        {/* Header */}
        <div style={{ position: "relative", zIndex: 10, padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", background: "rgba(5,5,17,0.8)", display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/logo-icon.svg" alt="Aprovai" width={28} height={28} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>AprovAI360</span>
            <span style={{ fontSize: 11, color: "#0ab5bd", marginLeft: 6, fontWeight: 500 }}>· Onboarding IA</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#0ab5bd", background: "rgba(10,181,189,0.1)", border: "1px solid rgba(10,181,189,0.25)", borderRadius: 99, padding: "3px 10px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0ab5bd", display: "inline-block", animation: "obPulse 1.5s ease-in-out infinite" }} />
            Estrategista IA online
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, position: "relative", zIndex: 10 }}>
          {/* Welcome */}
          {stage === "welcome" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <WelcomeScreen userName={userName} maxConcursos={maxConcursos} onStart={() => setStage("modalidade")} />
            </div>
          )}

          {/* Modalidade chooser */}
          {stage === "modalidade" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <ModalidadeChooser onSelect={(id) => startChat(id)} />
            </div>
          )}

          {/* Chat */}
          {stage === "chat" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <ProgressBar step={step} labels={PROGRESS_LABELS_MAP[modalidade] ?? PROGRESS_LABELS_MAP.CONCURSO_PUBLICO} />
              <ChatStage
                messages={messages}
                input={input}
                loading={loading}
                onInput={setInput}
                onSend={send}
                editalVisible={editalVisible}
                setEditalVisible={setEditalVisible}
                editalText={editalText}
                setEditalText={setEditalText}
                onEditalSubmit={handleEditalSubmit}
              />
            </div>
          )}

          {/* Generating */}
          {stage === "generating" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <GeneratingScreen />
            </div>
          )}

          {/* Plan reveal */}
          {stage === "plan" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              <PlanReveal plan={studyPlan} agents={selectedAgents.length ? selectedAgents : agents.slice(0, 2)} onEnter={handleEnterWorkspace} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
