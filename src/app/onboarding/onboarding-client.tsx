"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, FileText, CheckCircle, ArrowRight, Calendar, Clock, BookOpen, Target, Zap, Brain, Sparkles } from "lucide-react";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Agent { id: string; name: string; description?: string; categoria?: string | null; banca?: string | null; color?: string | null; }
interface Message { role: "user" | "assistant"; content: string; ts?: number; }
interface RotinaDiaria { questoes: number; flashcards: number; leituraMin: number; revisaoMin: number; simulado: string; dica?: string; }
interface StudyPlan { titulo: string; matérias: string[]; horasPorDia: number; foco: string; editalStatus?: string; rotinaDiaria?: RotinaDiaria; cronograma: { semana: string; tema: string }[]; }

type Stage = "welcome" | "chat" | "generating" | "plan";


// ── Steps da barra de progresso — agora 7 perguntas ──────────────────────────
const PROGRESS_LABELS = ["Cargo/Órgão", "Banca", "Data da Prova", "Horas/dia", "Nível", "Horário", "Dificuldades"];

// ── Marca o texto com **bold** e _italic_ ─────────────────────────────────────
function renderMd(text: string) {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-white">{p}</strong> : p)}
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
function ProgressBar({ step }: { step: number }) {
  const pct = Math.min(100, (step / PROGRESS_LABELS.length) * 100);
  const label = step >= PROGRESS_LABELS.length
    ? "✓ Perfil completo"
    : `Coletando: ${PROGRESS_LABELS[Math.min(step, PROGRESS_LABELS.length - 1)]}`;

  return (
    <div className="px-5 py-3 border-b border-white/5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <span className="text-xs text-teal-400/70 font-semibold">{Math.round(pct)}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #0ab5bd, #00ffa3)" }} />
      </div>
      {/* Dots indicadores */}
      <div className="flex justify-between mt-1.5 px-0.5">
        {PROGRESS_LABELS.map((_, i) => (
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

      <p className="text-xs text-slate-600">Isso levará apenas alguns segundos…</p>
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
    <div className={`flex-1 overflow-y-auto transition-all duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ transform: visible ? "none" : "translateY(16px)" }}>
      <div className="max-w-lg mx-auto px-5 py-8 space-y-5">
        {/* Hero */}
        <div className="text-center space-y-2 mb-8">
          <div className="text-5xl mb-3" style={{ animation: "obPulse 3s ease-in-out infinite" }}>🚀</div>
          <h1 className="text-xl font-bold text-white">Seu plano está pronto!</h1>
          <p className="text-sm text-slate-400">Personalizado exclusivamente para você conquistar sua aprovação.</p>
        </div>

        {/* Cargo card */}
        {plan && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(10,181,189,0.15), rgba(10,181,189,0.05))", border: "1px solid rgba(10,181,189,0.3)" }}>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} className="text-teal-400" />
                <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Seu objetivo</span>
              </div>
              <p className="font-bold text-white text-base">{plan.titulo}</p>
              <p className="text-xs text-slate-400 mt-1">{plan.foco}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        {plan && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4 space-y-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Clock size={16} className="text-teal-400 mb-1" />
              <div className="text-2xl font-bold text-white">{plan.horasPorDia}h</div>
              <div className="text-xs text-slate-500">por dia recomendadas</div>
            </div>
            <div className="rounded-xl p-4 space-y-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <BookOpen size={16} className="text-amber-400 mb-1" />
              <div className="text-2xl font-bold text-white">{(plan.matérias ?? []).length}</div>
              <div className="text-xs text-slate-500">matérias prioritárias</div>
            </div>
          </div>
        )}

        {/* Rotina Diária */}
        {plan?.rotinaDiaria && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
              <Brain size={14} className="text-teal-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Rotina diária recomendada</span>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              {[
                { icon: "🎯", label: "Questões/dia", value: `${plan.rotinaDiaria.questoes} questões` },
                { icon: "🃏", label: "Flashcards/dia", value: `${plan.rotinaDiaria.flashcards} cards` },
                { icon: "📖", label: "Leitura", value: `${plan.rotinaDiaria.leituraMin} min` },
                { icon: "🔁", label: "Revisão", value: `${plan.rotinaDiaria.revisaoMin} min` },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 rounded-xl p-3" style={{ background: "rgba(10,181,189,0.06)", border: "1px solid rgba(10,181,189,0.15)" }}>
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">{item.label}</div>
                    <div className="text-sm font-bold text-white">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 flex items-center gap-2.5 rounded-xl">
              <span className="text-lg">📋</span>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide">Simulado</span>
                <div className="text-sm font-semibold text-white capitalize">{plan.rotinaDiaria.simulado}</div>
              </div>
            </div>
            {plan.rotinaDiaria.dica && (
              <div className="px-5 pb-4">
                <div className="px-4 py-2.5 rounded-xl text-xs text-teal-300 italic" style={{ background: "rgba(10,181,189,0.08)", border: "1px solid rgba(10,181,189,0.15)" }}>
                  💡 {plan.rotinaDiaria.dica}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matérias */}
        {plan && (plan.matérias ?? []).length > 0 && (
          <div className="rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
              <BookOpen size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Matérias prioritárias</span>
            </div>
            <div className="px-5 py-4 flex flex-wrap gap-2">
              {(plan.matérias ?? []).map((m, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: "rgba(10,181,189,0.12)", border: "1px solid rgba(10,181,189,0.25)", color: "#7ae8ed" }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cronograma completo */}
        {plan && plan.cronograma.length > 0 && (
          <div className="rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-violet-400" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Cronograma de Estudos</span>
              </div>
              <span className="text-xs text-slate-500">{plan.cronograma.length} semanas</span>
            </div>
            {/* Status do edital */}
            {plan.editalStatus && (
              <div className="px-5 py-2 border-b border-white/5">
                <span className="text-xs px-2 py-1 rounded-full"
                  style={plan.editalStatus === "com_edital"
                    ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" }
                    : { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#fde68a" }}>
                  {plan.editalStatus === "com_edital" ? "✓ Baseado no edital fornecido" : "⚡ Baseado em editais históricos desta banca/cargo"}
                </span>
              </div>
            )}
            <div className="divide-y divide-white/5">
              {plan.cronograma.map((c: { semana: string; tema: string }, i: number) => {
                // Separa dias mesclados pelo delimitador "|"
                const dias = c.tema.split("|").map(d => d.trim()).filter(Boolean);
                return (
                  <div key={i} className="px-5 py-3 flex items-start gap-4">
                    <div className="w-16 flex-shrink-0 text-xs font-bold text-violet-400 pt-0.5">{c.semana}</div>
                    <div className="flex-1 space-y-1">
                      {dias.map((dia, j) => (
                        <div key={j} className="text-sm text-slate-300 flex items-start gap-2">
                          {dias.length > 1 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400/40 flex-shrink-0 mt-2" />
                          )}
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
          <div className="rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
              <Zap size={14} className="text-pink-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Seus mentores IA</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {agents.map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: a.color ? `${a.color}22` : "rgba(10,181,189,0.15)", border: `1px solid ${a.color ?? "#0ab5bd"}44`, color: a.color ?? "#0ab5bd" }}>
                    {a.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{a.name}</p>
                    {a.description && <p className="text-xs text-slate-500 truncate">{a.description}</p>}
                  </div>
                  <CheckCircle size={14} className="text-teal-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button onClick={onEnter}
          className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #0ab5bd, #0891b2)", color: "#fff", boxShadow: "0 0 30px rgba(10,181,189,0.4)" }}>
          Entrar no workspace <ArrowRight size={16} />
        </button>
        <p className="text-center text-xs text-slate-600 pb-4">Você pode ajustar seu plano a qualquer momento no workspace.</p>
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
        <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
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
            <div className="text-xs text-slate-500 leading-tight">{f.label}</div>
          </div>
        ))}
      </div>

      <button onClick={onStart}
        className="w-full max-w-xs py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
        style={{ background: "linear-gradient(135deg, #0ab5bd, #0891b2)", color: "#fff", boxShadow: "0 0 30px rgba(10,181,189,0.35)" }}>
        Começar agora <ArrowRight size={16} />
      </button>
      <p className="text-xs text-slate-600">Leva menos de 3 minutos · Sem necessidade de cartão</p>
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

function detectQuickReplies(lastAiMessage: string): string[] {
  const t = lastAiMessage.toLowerCase();

  // Nível — checa primeiro pois mensagens de nível nunca têm "quantas horas"
  if (t.includes("iniciante") && t.includes("intermediár"))
    return ["Iniciante", "Intermediário", "Avançado"];

  // Horário preferido
  if (t.includes("horário") && (t.includes("manhã") || t.includes("tarde") || t.includes("noite")))
    return ["Manhã", "Tarde", "Noite", "Varia"];

  // Horas/dia — exige que esteja PERGUNTANDO (quantas horas / consegue dedicar)
  if (t.includes("quantas horas") || (t.includes("hora") && (t.includes("consegue") || t.includes("dedicar") || t.includes("disponív"))))
    return ["1 hora", "2 horas", "3 horas", "4 horas ou mais"];

  // Data da prova
  if ((t.includes("data") || t.includes("quando")) && (t.includes("prova") || t.includes("edital")))
    return ["Não tenho data definida", "Em 3 meses", "Em 6 meses", "Em mais de 1 ano"];

  // Banca — exige frase específica de pergunta
  if (t.includes("organizadora") || (t.includes("qual") && t.includes("é a banca")) || t.includes("qual banca"))
    return ["CESPE/CEBRASPE", "FCC", "AOCP", "FGV", "VUNESP", "Não sei a banca"];

  return [];
}

function ChatStage({ messages, input, loading, onInput, onSend, editalVisible, setEditalVisible, editalText, setEditalText, onEditalSubmit }: ChatStageProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Quick replies baseadas no conteúdo real da última mensagem da IA
  const lastAiMsg = [...messages].reverse().find(m => m.role === "assistant")?.content ?? "";
  const quickReplies = !loading ? detectQuickReplies(lastAiMsg) : [];

  return (
    <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "msgIn 0.3s ease-out both" }}>
            {msg.role === "assistant" && <AIOrb thinking={false} />}
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "text-white rounded-br-sm" : "text-slate-200 rounded-bl-sm"}`}
              style={msg.role === "user"
                ? { background: "linear-gradient(135deg, #0891b2, #0ab5bd)", borderRadius: "18px 18px 4px 18px" }
                : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 18px 4px" }}>
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
            className="w-full px-4 py-3 text-xs text-slate-300 bg-transparent resize-none outline-none placeholder-slate-600" />
          <div className="px-4 py-2 flex gap-2 justify-end">
            <button onClick={() => setEditalVisible(false)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-3 py-1.5">Cancelar</button>
            <button onClick={onEditalSubmit} disabled={!editalText.trim()}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all disabled:opacity-40"
              style={{ background: "rgba(10,181,189,0.2)", border: "1px solid rgba(10,181,189,0.4)", color: "#7ae8ed" }}>
              Enviar →
            </button>
          </div>
        </div>
      )}

      {/* Quick replies */}
      {quickReplies.length > 0 && !loading && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {quickReplies.map(r => (
            <button key={r} onClick={() => onSend(r)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
              style={{ background: "rgba(10,181,189,0.1)", border: "1px solid rgba(10,181,189,0.3)", color: "#7ae8ed" }}>
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-5 pt-2">
        <div className="flex gap-2 items-end">
          <button onClick={() => setEditalVisible(!editalVisible)} title="Colar edital"
            className="p-2.5 rounded-xl transition-colors flex-shrink-0"
            style={{ background: editalVisible ? "rgba(10,181,189,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${editalVisible ? "rgba(10,181,189,0.4)" : "rgba(255,255,255,0.08)"}`, color: editalVisible ? "#7ae8ed" : "#4b5563" }}>
            <FileText size={15} />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => onInput(e.target.value)}
              disabled={loading}
              placeholder="Responda aqui…"
              rows={1}
              className="w-full px-4 py-3 pr-12 text-sm text-white placeholder-slate-600 rounded-2xl resize-none outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", minHeight: 48, maxHeight: 120 }}
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
        <p className="text-center text-xs text-slate-700 mt-2">Enter para enviar · Shift+Enter para nova linha</p>
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
  const initSent = useRef(false);

  const isTrial = maxConcursos === 1;

  // Primeira mensagem — gerada pela API para não ter duplicata
  async function startChat() {
    setStage("chat");
    setMessages([{ role: "assistant", content: "" }]); // placeholder de loading
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Mensagem especial de init — a IA gera o primeiro greeting
        body: JSON.stringify({ message: "__INIT__", history: [], maxConcursos, userName }),
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
    setStep(prev => Math.min(prev + 1, PROGRESS_LABELS.length));

    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyToSend, maxConcursos, userName }),
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
        setStep(PROGRESS_LABELS.length);
        await new Promise(r => setTimeout(r, 5500)); // tempo para ler a mensagem final
        setStage("generating");
        try {
          const planoRes = await fetch("/api/onboarding/plano", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile: {
                ...data.profile,
                editalContent: editalText.trim() || null, // conteúdo colado pelo aluno (se houver)
              },
            }),
          });
          if (planoRes.ok) {
            const planoData = await planoRes.json();
            if (planoData.plan) setStudyPlan(planoData.plan as StudyPlan);
          }
        } catch { /* plan generation failed — show anyway */ }
        await new Promise(r => setTimeout(r, 7000));
        setStage("plan");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de conexão.";
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${msg} Tente novamente.` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, maxConcursos]);

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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 10 }}>
          {/* Welcome */}
          {stage === "welcome" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <WelcomeScreen userName={userName} maxConcursos={maxConcursos} onStart={startChat} />
                </div>
          )}

          {/* Chat */}
          {stage === "chat" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <ProgressBar step={step} />
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
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <PlanReveal plan={studyPlan} agents={selectedAgents.length ? selectedAgents : agents.slice(0, 2)} onEnter={handleEnterWorkspace} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
