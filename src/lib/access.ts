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
  /** Questões por semana (-1 = ilimitado) */
  maxQuestionsPerWeek: number;
  maxFlashcardsPerWeek: number;
  /** 0 = bloqueado */
  maxSimuladosPerWeek: number;
  maxRedacoesPerWeek: number;
  maxCasosPerWeek: number;
  hasEditalDecoder: boolean;
  hasPdfLibrary: boolean;
  hasGroupStudy: boolean;
  hasLongTermMemory: boolean;
}

const EXPIRED_LIMITS = {
  aiCreditsPerWeek: 0, maxAgents: 0, maxProfiles: 0,
  maxQuestionsPerWeek: 0, maxFlashcardsPerWeek: 0,
  maxSimuladosPerWeek: 0, maxRedacoesPerWeek: 0, maxCasosPerWeek: 0,
  hasEditalDecoder: false, hasPdfLibrary: false, hasGroupStudy: false, hasLongTermMemory: false,
};

const TRIAL_LIMITS = {
  aiCreditsPerWeek: 10, maxAgents: 2, maxProfiles: 1,
  maxQuestionsPerWeek: 10, maxFlashcardsPerWeek: 10,
  maxSimuladosPerWeek: 0, maxRedacoesPerWeek: 0, maxCasosPerWeek: 0,
  hasEditalDecoder: false, hasPdfLibrary: false, hasGroupStudy: false, hasLongTermMemory: false,
};

export const getAccessLevel = cache(async (): Promise<PlanLimits> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { planSlug: null, planName: null, isPremium: false, ...EXPIRED_LIMITS };

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return { planSlug: null, planName: null, isPremium: false, ...EXPIRED_LIMITS };

    const sub = (dbUser as any).subscription;
    const isExpired = !sub || (sub.endDate && new Date(sub.endDate) < new Date());

    if (isExpired || !sub) {
      return { planSlug: null, planName: null, isPremium: false, ...EXPIRED_LIMITS };
    }

    const plan = sub.plan as any;
    if (!plan || (plan.price ?? 0) === 0) {
      // Trial
      return {
        planSlug: plan?.slug ?? "trial",
        planName: plan?.name ?? "Trial Gratuito",
        isPremium: false,
        ...TRIAL_LIMITS,
        // override com valores do banco se existirem
        aiCreditsPerWeek:     plan?.aiCreditsPerWeek     ?? TRIAL_LIMITS.aiCreditsPerWeek,
        maxAgents:            plan?.maxAgents             ?? TRIAL_LIMITS.maxAgents,
        maxProfiles:          plan?.maxProfiles           ?? TRIAL_LIMITS.maxProfiles,
        maxQuestionsPerWeek:  plan?.maxQuestionsPerWeek   ?? TRIAL_LIMITS.maxQuestionsPerWeek,
        maxFlashcardsPerWeek: plan?.maxFlashcardsPerWeek  ?? TRIAL_LIMITS.maxFlashcardsPerWeek,
        maxSimuladosPerWeek:  plan?.maxSimuladosPerWeek   ?? 0,
        maxRedacoesPerWeek:   plan?.maxRedacoesPerWeek    ?? 0,
        maxCasosPerWeek:      plan?.maxCasosPerWeek       ?? 0,
        hasEditalDecoder:     plan?.hasEditalDecoder      ?? false,
        hasPdfLibrary:        plan?.hasPdfLibrary         ?? false,
        hasGroupStudy:        plan?.hasGroupStudy         ?? false,
        hasLongTermMemory:    plan?.hasLongTermMemory     ?? false,
      };
    }

    return {
      planSlug:             plan.slug ?? null,
      planName:             plan.name ?? null,
      isPremium:            true,
      aiCreditsPerWeek:     plan.aiCreditsPerWeek     ?? 10,
      maxAgents:            plan.maxAgents             ?? 2,
      maxProfiles:          plan.maxProfiles           ?? 1,
      maxQuestionsPerWeek:  plan.maxQuestionsPerWeek   ?? -1,
      maxFlashcardsPerWeek: plan.maxFlashcardsPerWeek  ?? -1,
      maxSimuladosPerWeek:  plan.maxSimuladosPerWeek   ?? 2,
      maxRedacoesPerWeek:   plan.maxRedacoesPerWeek    ?? 2,
      maxCasosPerWeek:      plan.maxCasosPerWeek       ?? 2,
      hasEditalDecoder:     plan.hasEditalDecoder      ?? false,
      hasPdfLibrary:        plan.hasPdfLibrary         ?? false,
      hasGroupStudy:        plan.hasGroupStudy         ?? false,
      hasLongTermMemory:    plan.hasLongTermMemory     ?? false,
    };
  } catch {
    return { planSlug: null, planName: null, isPremium: false, ...EXPIRED_LIMITS };
  }
});
