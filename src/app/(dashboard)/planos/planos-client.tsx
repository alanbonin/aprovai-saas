"use client";
import { useState } from "react";
import { Check, Zap, Star, Trophy, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "./checkout-button";

interface Plan {
  id: string; name: string; slug: string;
  price: number; intervalDays: number;
  aiCreditsPerWeek: number; maxAgents: number; maxProfiles: number;
  maxQuestionsPerWeek?: number; maxFlashcardsPerWeek?: number;
  maxSimuladosPerWeek?: number; maxRedacoesPerWeek?: number; maxCasosPerWeek?: number;
  hasPdfLibrary?: boolean; hasArena?: boolean; hasAdaptativo?: boolean; hasCompanhia?: boolean;
  hasGroupStudy?: boolean; hasLongTermMemory?: boolean;
  features: string[]; active: boolean;
}

interface Props {
  plans: Plan[];
  currentPlanId: string | null;
  subscriptionEndDate?: string | null;
  trialExpired?: boolean;
  paymentError?: boolean;
}

const SLUG_CONFIG: Record<string, {
  icon: typeof Zap; tagline: string; highlight: string;
  popular: boolean; color: string; accentColor: string;
}> = {
  "trial":    { icon: Clock,   tagline: "7 dias grátis, sem cartão",       highlight: "",             popular: false, color: "border-white/10",     accentColor: "text-gray-400"   },
  "focado":   { icon: Zap,     tagline: "1 concurso em foco total",        highlight: "",             popular: false, color: "border-blue-500/30",  accentColor: "text-blue-400"   },
  "aprovacao":{ icon: Star,    tagline: "Até 2 concursos simultâneos",     highlight: "Mais popular", popular: true,  color: "border-indigo-500",   accentColor: "text-indigo-400" },
  "elite":    { icon: Trophy,  tagline: "Sem limites, máxima performance", highlight: "Completo",     popular: false, color: "border-amber-500/40", accentColor: "text-amber-400"  },
};

function getSlugConfig(slug: string) {
  return SLUG_CONFIG[slug] ?? SLUG_CONFIG["focado"];
}

function fmtLimit(n?: number, suffix = "") {
  if (n === undefined || n === null) return "—";
  if (n === -1) return `Ilimitado${suffix ? " " + suffix : ""}`;
  if (n === 0) return "Bloqueado";
  return `${n}${suffix ? " " + suffix : ""}`;
}

function isOneTime(plan: Plan) { return plan.intervalDays >= 365 || plan.slug === "prova-marcada"; }
function isAnual(plan: Plan) { return plan.intervalDays >= 360 && plan.intervalDays < 3650 && plan.slug !== "prova-marcada"; }
function isMensal(plan: Plan) { return !isOneTime(plan) && !isAnual(plan); }

export function PlanosClient({ plans, currentPlanId, subscriptionEndDate, trialExpired, paymentError }: Props) {
  const mensais  = plans.filter(isMensal);
  const anuais   = plans.filter(isAnual);
  const temAnuais = anuais.length > 0;
  const [periodo, setPeriodo] = useState<"mensal" | "anual">("mensal");
  const recorrentes = periodo === "anual" && temAnuais ? anuais : mensais;

  const colsClass =
    recorrentes.length <= 2 ? "md:grid-cols-2" :
    recorrentes.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <div className="min-h-screen text-white p-6 max-w-6xl mx-auto">

      {/* Banner: acesso expirado (trial ou plano pago) */}
      {trialExpired && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Seu acesso foi encerrado</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              Assine um plano abaixo para retomar seus estudos. Seu progresso, flashcards e histórico estão salvos e aguardando você.
            </p>
          </div>
        </div>
      )}

      {/* Banner: erro de pagamento */}
      {paymentError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 flex items-start gap-3">
          <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Pagamento não aprovado</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              Houve um problema ao processar seu pagamento. Verifique os dados do cartão e tente novamente.
            </p>
          </div>
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Escolha seu plano</h1>
        <p className="text-gray-400 text-sm">Do trial gratuito ao Elite — evolua no seu ritmo.</p>

        {temAnuais && (
          <div className="inline-flex items-center mt-6 rounded-xl border border-white/10 bg-white/5 p-1 gap-1">
            <button onClick={() => setPeriodo("mensal")}
              className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-all",
                periodo === "mensal" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white")}>
              Mensal
            </button>
            <button onClick={() => setPeriodo("anual")}
              className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                periodo === "anual" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white")}>
              Anual
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full font-semibold">-20%</span>
            </button>
          </div>
        )}
      </div>

      <div className={cn("grid grid-cols-1 gap-5 mb-8", colsClass)}>
        {recorrentes.map(plan => {
          const cfg = getSlugConfig(plan.slug);
          const Icon = cfg.icon;
          const isCurrent = plan.id === currentPlanId;
          const monthsDuration = plan.intervalDays / 30;
          const priceMonth = monthsDuration > 0 ? (plan.price / monthsDuration).toFixed(0) : plan.price.toFixed(0);
          const isFree = plan.price === 0;

          return (
            <div key={plan.id} className={cn(
              "relative rounded-2xl border flex flex-col p-6 transition-all",
              cfg.popular ? "border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10" : cn("bg-white/3", cfg.color)
            )}>
              {cfg.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={cn("text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap",
                    cfg.popular ? "bg-indigo-600 text-white" : "bg-amber-500 text-white")}>
                    <Icon className="w-3 h-3" />
                    {cfg.highlight}
                  </span>
                </div>
              )}

              {/* Cabeçalho */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("w-5 h-5", cfg.accentColor)} />
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                </div>
                <p className="text-xs text-gray-500 mb-5">{cfg.tagline}</p>

                <div className="flex items-baseline gap-1">
                  {isFree ? (
                    <span className="text-4xl font-black">Grátis</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black">R$ {priceMonth}</span>
                      <span className="text-gray-500 text-sm">/mês</span>
                    </>
                  )}
                </div>
                {!isFree && plan.intervalDays > 30 && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    R$ {plan.price.toFixed(0)} cobrado anualmente
                  </p>
                )}
              </div>

              {/* Destaque: mentores + msgs */}
              <div className={cn("rounded-xl p-3 mb-5 border text-center",
                cfg.popular ? "bg-indigo-500/10 border-indigo-500/20" : "bg-white/5 border-white/8")}>
                <p className={cn("text-sm font-semibold", cfg.accentColor)}>
                  {plan.aiCreditsPerWeek === -1 ? "Mensagens ilimitadas" : `${plan.aiCreditsPerWeek} msgs/semana`}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {plan.maxAgents} mentor{plan.maxAgents !== 1 ? "es" : ""} IA ·{" "}
                  {plan.maxProfiles} concurso{plan.maxProfiles !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Limites por semana */}
              <div className="space-y-1.5 mb-5">
                {[
                  { label: "Questões/semana",  val: plan.maxQuestionsPerWeek  },
                  { label: "Flashcards/semana",val: plan.maxFlashcardsPerWeek },
                  { label: "Simulados/semana", val: plan.maxSimuladosPerWeek  },
                  { label: "Redações/semana",  val: plan.maxRedacoesPerWeek   },
                  { label: "Casos práticos/sem",val: plan.maxCasosPerWeek     },
                ].map(({ label, val }) => {
                  const blocked = val === 0;
                  const unlimited = val === -1;
                  return (
                    <div key={label} className={cn(
                      "flex items-center justify-between text-xs rounded-lg px-3 py-1.5",
                      blocked ? "text-gray-600 bg-white/2" : "text-gray-300 bg-white/4"
                    )}>
                      <span className={blocked ? "line-through" : ""}>{label}</span>
                      <span className={cn("font-semibold",
                        unlimited ? "text-green-400" : blocked ? "text-gray-600" : cfg.accentColor)}>
                        {fmtLimit(val)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Recursos extras */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-400">
                    <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full rounded-xl border border-green-500/30 text-green-400 text-sm text-center font-medium">
                  <div className="py-2.5">Plano atual ✓</div>
                  {subscriptionEndDate && (
                    <div className="border-t border-green-500/20 py-1.5 text-xs text-green-600">
                      Válido até {new Date(subscriptionEndDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
              ) : (
                <CheckoutButton planId={plan.id} planName={plan.name} isPopular={cfg.popular} isFree={isFree} />
              )}
            </div>
          );
        })}
      </div>

      {/* Garantia + segurança */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap justify-center">
          <span className="flex items-center gap-1.5">🔒 Pagamento seguro via Mercado Pago</span>
          <span className="flex items-center gap-1.5">↩️ Cancelamento a qualquer momento, sem multa</span>
          <span className="flex items-center gap-1.5">💾 Seu progresso e histórico ficam salvos</span>
        </div>
        <p className="text-center text-gray-700 text-xs mt-1">
          Ao clicar em assinar, você será redirecionado para o Mercado Pago para concluir o pagamento com segurança.
        </p>
      </div>
    </div>
  );
}
