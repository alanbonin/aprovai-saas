import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/admin/subjects-list — lista matérias (público para sidebar da biblioteca)
export async function GET() {
  const { data } = await db.from("Subject").select("id, name, categoria").order("categoria").order("name");
  return NextResponse.json(data ?? []);
}
