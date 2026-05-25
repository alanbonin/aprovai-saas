import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.SUPABASE_ANON_KEY;
  const hasNextPublicAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSvcKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    supabaseUrl: supabaseUrl ? supabaseUrl.slice(0, 30) + "..." : "MISSING",
    nextPublicUrl: nextPublicUrl ? nextPublicUrl.slice(0, 30) + "..." : "MISSING",
    hasAnonKey,
    hasNextPublicAnonKey,
    hasSvcKey,
    nodeEnv: process.env.NODE_ENV,
  });
}
