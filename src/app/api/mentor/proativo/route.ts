import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";

// ── GET /api/mentor/proativo ─────────────────────────────────────────────────
// Retorna uma mensagem proativa do mentor se o aluno precisar de contato.
// O cliente chama isso uma vez por sessão (throttled via localStorage).
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: null });

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

    // Lógica de acionamento — só gera em situações relevantes
    const deveGerar =
      diasDesdeOnboarding === 1 ||                        // 1º dia após onboarding
      diasDesdeOnboarding === 7 ||                        // 1 semana
      diasDesdeOnboarding === 30 ||                       // 1 mês
      (diasAteProva !== null && diasAteProva <= 30) ||   // Prova em menos de 30 dias
      (diasAteProva !== null && diasAteProva <= 7);       // Urgência: prova em menos de 1 semana

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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mentor/proativo] error:", msg);
    return NextResponse.json({ message: null });
  }
}
