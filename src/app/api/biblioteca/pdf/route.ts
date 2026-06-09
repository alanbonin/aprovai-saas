import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { db, getUserWithPlan } from "@/lib/db";

// GET /api/biblioteca/pdf?id=xxx — proxy do PDF (evita CORS do storage no viewer)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return new NextResponse("Usuário não encontrado", { status: 404 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new NextResponse("id obrigatório", { status: 400 });

  // Busca o documento
  const { data: doc, error: docError } = await db
    .from("PdfDocument")
    .select("id, title, storagePath, planLevel")
    .eq("id", id)
    .single();

  if (docError || !doc) return new NextResponse("Documento não encontrado", { status: 404 });

  // Verifica acesso pelo plano
  const plan = (dbUser as unknown as { subscription?: { plan?: { slug?: string } } }).subscription?.plan;
  const planSlug = plan?.slug ?? "trial";
  const planOrder = ["trial", "focado", "aprovacao", "elite", "prova-marcada"];
  const userLevel = planOrder.indexOf(planSlug);
  const docLevel  = planOrder.indexOf(doc.planLevel);
  // docLevel === -1 significa planLevel desconhecido — bloquear por segurança
  if (docLevel === -1 || docLevel > userLevel) {
    return new NextResponse("Seu plano não inclui este documento", { status: 403 });
  }

  // Verifica limite semanal de PDFs
  const { getAccessLevel } = await import("@/lib/access");
  const { getWeeklyResourceUsage, incrementWeeklyResourceUsage } = await import("@/lib/api-utils");
  const access = await getAccessLevel().catch(() => null);
  const pdfLimit = access?.maxPdfPerWeek ?? -1;
  if (pdfLimit === 0) {
    return new NextResponse("PDFs não disponíveis no seu plano.", { status: 403 });
  }
  if (pdfLimit > 0 && pdfLimit < 9999) {
    const usedThisWeek = await getWeeklyResourceUsage(dbUser.id, "pdf").catch(() => 0);
    if (usedThisWeek >= pdfLimit) {
      return new NextResponse("Limite semanal de PDFs atingido. Faça upgrade para continuar.", { status: 403 });
    }
    void incrementWeeklyResourceUsage(dbUser.id, "pdf").catch(() => {});
  }

  // Baixa o arquivo via service role e faz proxy
  const storageClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: blob, error: downloadError } = await storageClient.storage
    .from("pdfs")
    .download(doc.storagePath);

  if (downloadError || !blob) {
    return new NextResponse("Erro ao baixar documento", { status: 500 });
  }

  const buffer = await blob.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.title)}.pdf"`,
      "Cache-Control": "private, max-age=1800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
