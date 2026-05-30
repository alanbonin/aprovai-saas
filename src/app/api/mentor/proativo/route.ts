import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";
import { log } from "@/lib/logger";
import { defaultAiLimiter } from "@/lib/rate-limit";
import { getConfig } from "@/lib/system-config";

// ── GET /api/mentor/proativo ─────────────────────────────────────────────────
// Retorna uma mensagem proativa do mentor se o aluno precisar de contato.
// O cliente chama isso uma vez por sessão (throttled via localStorage).
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: null });

    // Rate limit — 10 req/min (o cliente já faz throttle de 8h via localStorage, mas proteção server-side)
    const rl = await defaultAiLimiter.check(user.id);
    if (!rl.ok) return NextResponse.json({ message: null }); // silencioso: não precisa mostrar erro ao usuário

    const { data: dbUser } = await db.from("User").select("id, name, createdAt").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ message: null });

    const { data: profile } = await db
      .from("StudentProfile")
      .select("cargo, orgao, dataProva, dificuldades, onboardingDone, updatedAt")
      .eq("userId", dbUser.id)
      .maybeSingle();

    // Só gera mensagem proativa se o onboarding foi feito
    if (!profile?.onboardingDone) return NextResponse.json({ message: null });

    const hoje = new Date();
    const onboardingDate = profile.updatedAt ? new Date(profile.updatedAt) : new Date(dbUser.createdAt);
    const diasDesdeOnboarding = Math.floor((hoje.getTime() - onboardingDate.getTime()) / 86_400_000);

    // Dias até a prova
    let diasAteProva: number | null = null;
    if (profile.dataProva) {
      const prova = new Date(profile.dataProva);
      diasAteProva = Math.ceil((prova.getTime() - hoje.getTime()) / 86_400_000);
    }

    // Lógica de acionamento — lê configurações dinâmicas
    const diasProativo  = await getConfig("mentor.dias_proativo") as unknown as number[];
    const diasAntesProva = await getConfig("mentor.dias_antes_prova") as number;

    const deveGerar =
      diasProativo.includes(diasDesdeOnboarding) ||
      (diasAteProva !== null && diasAteProva <= diasAntesProva) ||
      (diasAteProva !== null && diasAteProva <= 7); // urgência sempre ativa

    if (!deveGerar) return NextResponse.json({ message: null });

    // Contexto para a IA
    const contexto = [
      `Aluno: ${(dbUser.name as string | null) ?? "estudante"}`,
      `Cargo desejado: ${profile.cargo ?? "não informado"}`,
      `Órgão: ${profile.orgao ?? "não informado"}`,
      `Dias desde o início dos estudos: ${diasDesdeOnboarding}`,
      diasAteProva !== null ? `Dias até a prova: ${diasAteProva}` : "Data da prova: não definida",
      profile.dificuldades ? `Dificuldades relatadas: ${profile.dificuldades}` : "",
    ].filter(Boolean).join("\n");

    const systemPrompt = `Você é o Mentor Aprovai, um coach pessoal de concursos públicos que acompanha o aluno proativamente.
Gere UMA mensagem curta, motivadora e personalizada para o aluno com base no contexto.

A mensagem deve:
- Ser como uma mensagem de WhatsApp de um mentor humano (informal, direto, caloroso)
- Ter no máximo 3 parágrafos curtos
- Incluir emojis com moderação
- Mencionar o cargo específico quando relevante
- Dar uma dica prática ou motivação baseada no momento (quantos dias até a prova, tempo de estudo, etc.)

Retorne APENAS o texto da mensagem, sem explicações, sem JSON.`;

    const response = await createWithCache({
      model: MODELS.haiku,
      maxTokens: 300,
      systemPrompt,
      cacheSystem: true,
      messages: [{ role: "user", content: contexto }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    return NextResponse.json({ message: text, diasDesdeOnboarding, diasAteProva });

  } catch (err) {
    log.error("ai.mentor_proativo_error", {}, err);
    return NextResponse.json({ message: null });
  }
}
