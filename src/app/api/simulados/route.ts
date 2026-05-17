import { NextResponse } from "next/server";

// Simulados pré-cadastrados foram substituídos por geração on-the-fly via /api/simulado/gerar
export async function GET() {
  return NextResponse.json([]);
}
