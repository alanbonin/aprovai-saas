import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan } from "@/lib/db";

export interface PlanLimits {
  planSlug: string | null;
  planName: string | null;
  /** Acesso pago ativo (price > 0 e não expirado) */
  isPremium: boolean;
  /** Msgs de mentor por semana (-1 = ilimitado) */
  aiCreditsPerWeek: number;
  maxAgents: number;
  maxProfiles: number;
  /** -1 = ilimitado, 0 = bloqueado */
  maxQuestionsPerWeek: number;
  maxFlashcardsPerWeek: number;
  maxSimuladosPerWeek: number;
  maxRedacoesPerWeek: number;
  maxCasosPerWeek: number;
  /** Documentos PDF/semana (0 = bloqueado, -1 = ilimitado) */
  maxPdfPerWeek: number;
  hasGroupStudy: boolean;
  hasLongTermMemory: boolean;
  /** Feature flags de acesso a módulos */
  hasPdfLibrary: boolean;
  hasArena: boolean;
  hasAdaptativo: boolean;
  hasCompanhia: boolean;
}

const EXPIRED_LIMITS = {
  aiCreditsPerWeek: 0, maxAgents: 0, maxProfiles: 0,
  maxQuestionsPerWeek: 0, maxFlashcardsPerWeek: 0,
  maxSimuladosPerWeek: 0, maxRedacoesPerWeek: 0, maxCasosPerWeek: 0,
  maxPdfPerWeek: 0,
  hasGroupStudy: false, hasLongTermMemory: false,
  hasPdfLibrary: false, hasArena: false, hasAdaptativo: false, hasCompanhia: false,
};

// Fallback para plano trial (caso o banco ainda não tenha os novos campos)
const TRIAL_DEFAULTS = {
  aiCreditsPerWeek: 10, maxAgents: 1, maxProfiles: 1,
  maxQuestionsPerWeek: 200, maxFlashcardsPerWeek: 200,
  maxSimuladosPerWeek: 0, maxRedacoesPerWeek: 2, maxCasosPerWeek: 2,
  maxPdfPerWeek: 0,
  hasGroupStudy: true, hasLongTermMemory: false,
  hasPdfLibrary: false, hasArena: false, hasAdaptativo: false, hasCompanhia: false,
};

function planLimits(plan: any, isTrial: boolean) {
  const def = isTrial ? TRIAL_DEFAULTS : EXPIRED_LIMITS;
  return {
    aiCreditsPerWeek:     plan?.aiCreditsPerWeek     ?? def.aiCreditsPerWeek,
    maxAgents:            plan?.maxAgents             ?? def.maxAgents,
    maxProfiles:          plan?.maxProfiles           ?? def.maxProfiles,
    maxQuestionsPerWeek:  plan?.maxQuestionsPerWeek   ?? def.maxQuestionsPerWeek,
    maxFlashcardsPerWeek: plan?.maxFlashcardsPerWeek  ?? def.maxFlashcardsPerWeek,
    maxSimuladosPerWeek:  plan?.maxSimuladosPerWeek   ?? def.maxSimuladosPerWeek,
    maxRedacoesPerWeek:   plan?.maxRedacoesPerWeek    ?? def.maxRedacoesPerWeek,
    maxCasosPerWeek:      plan?.maxCasosPerWeek       ?? def.maxCasosPerWeek,
    maxPdfPerWeek:        plan?.maxPdfPerWeek         ?? def.maxPdfPerWeek,
    hasGroupStudy:        plan?.hasGroupStudy         ?? def.hasGroupStudy,
    hasLongTermMemory:    plan?.hasLongTermMemory     ?? def.hasLongTermMemory,
    hasPdfLibrary:        plan?.hasPdfLibrary         ?? def.hasPdfLibrary,
    hasArena:             plan?.hasArena              ?? def.hasArena,
    hasAdaptativo:        plan?.hasAdaptativo         ?? def.hasAdaptativo,
    hasCompanhia:         plan?.hasCompanhia          ?? def.hasCompanhia,
  };
}

export const getAccessLevel = cache(async (): Promise<PlanLimits> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { planSlug: null, planName: null, isPremium: false, ...EXPIRED_LIMITS };

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return { planSlug: null, planName: null, isPremium: false, ...EXPIRED_LIMITS };

    const sub = (dbUser as any).subscription;
    const isExpired = !sub || ["CANCELLED", "EXPIRED"].includes(sub.status ?? "") || (sub.endDate && new Date(sub.endDate) < new Date());

    if (isExpired || !sub) {
      return { planSlug: null, planName: null, isPremium: false, ...EXPIRED_LIMITS };
    }

    const plan = sub.plan as any;
    const isTrial = !plan || (plan.price ?? 0) === 0;

    return {
      planSlug:   plan?.slug ?? (isTrial ? "trial" : null),
      planName:   plan?.name ?? (isTrial ? "Trial Gratuito" : null),
      isPremium:  !isTrial,
      ...planLimits(plan, isTrial),
    };
  } catch {
    return { planSlug: null, planName: null, isPremium: false, ...EXPIRED_LIMITS };
  }
});
