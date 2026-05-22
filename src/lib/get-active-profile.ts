import { db } from "@/lib/db";

export interface StudentProfileRow {
  id: string;
  userId: string;
  label: string | null;
  isDefault: boolean;
  cargo: string | null;
  orgao: string | null;
  dataProva: string | null;
  dificuldades: string | null;
  nomePreferido: string | null;
  horasEstudo: number | null;
  nivelAtual: string | null;
  disponibilidade: string | null;
  modalidade: string;
  vestibular: string | null;
  trilha: string | null;
  oabFase: string | null;
  banca: string | null;
  onboardingDone: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Retorna o perfil ativo do usuário.
 *
 * Ordem de prioridade:
 *  1. User.activeProfileId (atualizado quando o aluno troca de perfil)
 *  2. Perfil marcado como isDefault=true
 *  3. Primeiro perfil encontrado
 *
 * @param userId — ID interno do usuário (User.id, não supabaseId)
 */
export async function getActiveProfile(userId: string): Promise<StudentProfileRow | null> {
  // Busca todos os perfis do usuário + activeProfileId do User em uma query
  const [{ data: user }, { data: profiles }] = await Promise.all([
    db.from("User").select("activeProfileId").eq("id", userId).maybeSingle(),
    db.from("StudentProfile").select("*").eq("userId", userId).order("isDefault", { ascending: false }).order("createdAt", { ascending: true }),
  ]);

  if (!profiles || profiles.length === 0) return null;

  // 1. Tenta o perfil ativo salvo
  if (user?.activeProfileId) {
    const active = profiles.find((p: StudentProfileRow) => p.id === user.activeProfileId);
    if (active) return active as StudentProfileRow;
  }

  // 2. Tenta o padrão
  const def = profiles.find((p: StudentProfileRow) => p.isDefault);
  if (def) return def as StudentProfileRow;

  // 3. Primeiro encontrado
  return profiles[0] as StudentProfileRow;
}

/**
 * Retorna TODOS os perfis do usuário.
 */
export async function getAllProfiles(userId: string): Promise<StudentProfileRow[]> {
  const { data } = await db
    .from("StudentProfile")
    .select("*")
    .eq("userId", userId)
    .order("isDefault", { ascending: false })
    .order("createdAt", { ascending: true });
  return (data ?? []) as StudentProfileRow[];
}

/**
 * Calcula o número máximo de perfis permitidos pelo plano do usuário.
 */
export function maxProfilesForSubscription(
  subscription: { plan?: { maxProfiles?: number; price?: number; slug?: string } | null } | null
): number {
  if (!subscription || !subscription.plan) return 1; // sem plano = gratuito
  const plan = subscription.plan;
  // Campo explícito no plano (set pela migration)
  if (typeof plan.maxProfiles === "number") return plan.maxProfiles;
  // Fallback: plano pago = 2 perfis
  return (plan.price ?? 0) > 0 ? 2 : 1;
}
