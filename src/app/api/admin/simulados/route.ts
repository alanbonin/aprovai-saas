import { NextResponse } from "next/server";

// Simulados pré-cadastrados foram substituídos por geração on-the-fly via /api/simulado/gerar
// Estas rotas retornam respostas vazias para compatibilidade com código legado

export async function GET() {
  return NextResponse.json([]);
}

export async function PATCH() {
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}
