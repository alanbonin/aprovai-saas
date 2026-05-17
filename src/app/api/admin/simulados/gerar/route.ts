import { NextResponse } from "next/server";

// Simulados agora são gerados on-the-fly para o aluno via /api/simulado/gerar
// Este endpoint foi desativado pois a tabela "Simulado" não existe no banco
export async function POST() {
  return NextResponse.json(
    { error: "Geração de simulados pré-criados desativada. Use /api/simulado/gerar para gerar on-the-fly." },
    { status: 410 }
  );
}
