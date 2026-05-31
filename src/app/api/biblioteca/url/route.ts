import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { db, getUserWithPlan } from "@/lib/db";
import { log } from "@/lib/logger";

// GET /api/biblioteca/url?id=xxx — gera URL assinada de curta duração (30min)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  // Busca o documento
  const { data: doc, error: docError } = await db
    .from("PdfDocument")
    .select("id, title, storagePath, planLevel")
    .eq("id", id)
    .single();

  if (docError || !doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  // Verifica acesso pelo plano
  const plan = (dbUser as unknown as { subscription?: { plan?: { slug?: string } } }).subscription?.plan;
  const planSlug = plan?.slug ?? "trial";
  const planOrder = ["trial", "focado", "aprovacao", "elite", "prova-marcada"];
  const userLevel = planOrder.indexOf(planSlug);
  const docLevel  = planOrder.indexOf(doc.planLevel);
  if (docLevel > userLevel && doc.planLevel !== "trial") {
    return NextResponse.json({ error: "Seu plano não inclui este documento" }, { status: 403 });
  }

  // Gera URL assinada usando service role (bucket privado requer permissão elevada)
  const storageClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: signed, error: signError } = await storageClient.storage
    .from("pdfs")
    .createSignedUrl(doc.storagePath, 1800); // 30 min

  if (signError || !signed) {
    log.error("biblioteca.signed_url_error", { docId: id }, signError);
    return NextResponse.json({ error: "Erro ao gerar URL" }, { status: 500 });
  }

  // Log de acesso (LGPD: registrar quem acessou qual documento)
  log.info("biblioteca.doc_accessed", {
    userId: dbUser.id,
    docId: id,
    docTitle: doc.title,
  });

  return NextResponse.json({
    url: signed.signedUrl,
    title: doc.title,
    expiresIn: 1800,
  });
}
