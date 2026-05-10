import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const { message, history, agentIds } = await req.json();

  // Buscar contexto dos agentes
  const { data: agents } = await db.from("Agent").select("name, categoria, banca, systemPrompt").in("id", agentIds);
  const agentNames = (agents ?? []).map((a: { name: string }) => a.name).join(" e ");

  const systemPrompt = `Você é ${agentNames}, mentores especializados em concursos públicos.

Seu objetivo AGORA é fazer um onboarding do aluno para montar o plano de estudos personalizado.

Pergunte de forma conversacional e natural:
1. Qual cargo e órgão quer prestar
2. Se já tem data da prova
3. Quais suas maiores dificuldades
4. Se já saiu o edital (o aluno pode colar o conteúdo programático)

Quando tiver informações suficientes (pelo menos cargo e órgão), finalize dizendo que vai montar o plano.

IMPORTANTE: Quando decidir que tem informações suficientes, responda normalmente E no final da mensagem inclua a marcação:
__ONBOARDING_DONE__{"profile": {"cargo": "...", "orgao": "...", "dataProva": null, "dificuldades": "..."}, "subjects": []}

Extraia as informações do histórico da conversa para preencher o JSON.
Se o aluno colou um edital, extraia as matérias e liste em "subjects" como: [{"name": "Direito Penal", "slug": "direito-penal"}, ...]

Responda sempre em português brasileiro de forma motivadora e empática.`;

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...history.slice(-10).map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "user", content: message },
          ],
        });

        let fullText = "";
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            fullText += chunk.delta.text;

            if (fullText.includes("__ONBOARDING_DONE__")) {
              const parts = fullText.split("__ONBOARDING_DONE__");
              controller.enqueue(encoder.encode(parts[0]));

              // Salvar o perfil no banco
              try {
                const jsonStr = parts[1].trim();
                const { profile, subjects } = JSON.parse(jsonStr);

                // Salvar StudentProfile
                const { data: existing } = await db.from("StudentProfile").select("id").eq("userId", dbUser.id).single();
                let savedProfile;
                if (existing) {
                  const { data } = await db.from("StudentProfile").update({
                    cargo: profile.cargo,
                    orgao: profile.orgao,
                    dataProva: profile.dataProva,
                    dificuldades: profile.dificuldades,
                    onboardingDone: true,
                    updatedAt: new Date().toISOString(),
                  }).eq("id", existing.id).select().single();
                  savedProfile = data;
                } else {
                  const { data } = await db.from("StudentProfile").insert({
                    userId: dbUser.id,
                    cargo: profile.cargo,
                    orgao: profile.orgao,
                    dataProva: profile.dataProva,
                    dificuldades: profile.dificuldades,
                    onboardingDone: true,
                  }).select().single();
                  savedProfile = data;
                }

                // Salvar matérias extraídas do edital (se houver)
                let savedSubjects: { id: string; name: string; slug: string }[] = [];
                if (subjects && subjects.length > 0) {
                  for (const sub of subjects) {
                    const slug = sub.slug || sub.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
                    const { data: existing } = await db.from("Subject").select("id, name, slug").eq("slug", slug).single();
                    let subjectRecord = existing;
                    if (!subjectRecord) {
                      const { data: created } = await db.from("Subject").insert({ name: sub.name, slug }).select("id, name, slug").single();
                      subjectRecord = created;
                    }
                    if (subjectRecord) {
                      await db.from("StudentSubject").upsert(
                        { userId: dbUser.id, subjectId: subjectRecord.id, fromEdital: true },
                        { onConflict: "userId,subjectId" }
                      );
                      savedSubjects.push(subjectRecord);
                    }
                  }
                }

                controller.enqueue(encoder.encode(`__ONBOARDING_DONE__${JSON.stringify({ profile: savedProfile, subjects: savedSubjects })}`));
              } catch (e) {
                controller.enqueue(encoder.encode("__ONBOARDING_DONE__{}"));
              }
              break;
            } else {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        }
      } catch {
        controller.enqueue(encoder.encode("Erro ao processar. Tente novamente."));
      }
      controller.close();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
