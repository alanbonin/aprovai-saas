import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";

const MEMORY_PREFIX = "__MENTOR_MEMORY__";


// ── GET — retorna memória do mentor para um agentId ──────────────────────────
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ memory: null });

    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId") ?? "all";

    // Busca nota de memória do agente (armazenada em Note com prefixo especial)
    const { data: note } = await db
      .from("Note")
      .select("content, updatedAt")
      .eq("userId", dbUser.id)
      .like("content", `${MEMORY_PREFIX}:${agentId}:%`)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!note) return NextResponse.json({ memory: null });

    // Extrai o conteúdo real da memória (após o prefixo)
    const raw = note.content.replace(`${MEMORY_PREFIX}:${agentId}:`, "");
    return NextResponse.json({ memory: raw, savedAt: note.updatedAt });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ── POST — gera e salva um resumo da conversa ────────────────────────────────
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const body = await req.json() as {
      agentId: string;
      agentName: string;
      messages: { role: string; content: string }[];
    };
    const { agentId, agentName, messages } = body;

    if (!messages || messages.length < 2) {
      return NextResponse.json({ ok: false, reason: "Conversa muito curta para salvar memória" });
    }

    // Gera resumo com IA — sanitiza conteúdo para evitar prompt injection
    const transcript = messages
      .slice(-20)
      .map(m => {
        const safeContent = String(m.content)
          .replace(/[\x00-\x1F\x7F-\x9F]/g, " ") // chars de controle
          .replace(/\[\[|\]\]/g, "")               // delimitadores de diretiva
          .replace(/```/g, "` ` `")               // code blocks
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);
        return `${m.role === "user" ? "Aluno" : "Mentor"}: ${safeContent}`;
      })
      .join("\n");

    const MEMORY_SYSTEM = "Você é um assistente especializado em criar resumos concisos de sessões de estudo para concursos públicos, identificando pontos fortes, fraquezas e lacunas do aluno.";
    const response = await createWithCache({
      model: MODELS.haiku,
      maxTokens: 500,
      systemPrompt: MEMORY_SYSTEM,
      cacheSystem: true,
      messages: [{
        role: "user",
        content: `Analise esta conversa de estudo e crie um resumo de memória:

Analise esta conversa entre um aluno e o mentor ${agentName} e crie um resumo CONCISO (máx. 200 palavras) com:
1. Principais tópicos estudados/discutidos
2. Dúvidas que o aluno teve
3. Pontos fortes identificados
4. Lacunas ou fraquezas percebidas
5. O que o aluno deve continuar estudando

Seja direto, use bullet points. Esse resumo será usado para que o mentor lembre do aluno nas próximas sessões.

CONVERSA:
${transcript}

RESUMO (em português):`,
      }],
    });

    const summary = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    if (!summary) return NextResponse.json({ ok: false, reason: "Falha ao gerar resumo" });

    // Salva como Note (reutilizando tabela existente)
    const memoryContent = `${MEMORY_PREFIX}:${agentId}:${summary}`;

    // Verifica se já existe uma nota de memória para este agente
    const { data: existing } = await db
      .from("Note")
      .select("id")
      .eq("userId", dbUser.id)
      .like("content", `${MEMORY_PREFIX}:${agentId}:%`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await db.from("Note").update({
        content: memoryContent,
        updatedAt: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await db.from("Note").insert({
        id: crypto.randomUUID(),
        userId: dbUser.id,
        subjectId: "memory",   // campo obrigatório — usamos "memory" como sentinel
        content: memoryContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
