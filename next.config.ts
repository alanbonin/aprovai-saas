import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Carrega variáveis de .env.local explicitamente (backup para Next.js 16)
function loadEnvFile(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch { /* ignora erros de leitura */ }
}

const root = path.resolve(process.cwd());
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const nextConfig: NextConfig = {
  // Remove header X-Powered-By: Next.js por segurança
  poweredByHeader: false,

  // Compressão automática (brotli/gzip) para assets estáticos
  compress: true,

  // Otimização de imports de pacotes pesados
  experimental: {
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js"],
  },

  // Domínios permitidos para next/image
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },

  // Headers de segurança + cache
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    // CSP: permite self + Supabase + Anthropic + MercadoPago
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.mercadopago.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    const globalHeaders = [
      { key: "X-Content-Type-Options",  value: "nosniff" },
      { key: "X-Frame-Options",         value: "DENY" },
      { key: "X-XSS-Protection",        value: "1; mode=block" },
      { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
      { key: "Content-Security-Policy", value: csp },
      // HSTS: 2 anos, inclui subdomínios, preload — só em produção (HTTPS obrigatório)
      ...(isProd ? [{
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      }] : []),
    ];

    return [
      // API pública de ícone — pode cachear 1h
      {
        source: "/api/icon",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      // Páginas autenticadas — sem cache (dados do usuário)
      {
        source: "/workspace/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          ...globalHeaders,
        ],
      },
      // Admin — sem cache + headers de segurança
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          ...globalHeaders,
        ],
      },
      // Toda a aplicação — headers de segurança globais
      {
        source: "/:path*",
        headers: globalHeaders,
      },
    ];
  },

  // Rewrites para URLs amigáveis (opcional, mantém compatibilidade)
  async rewrites() {
    return [];
  },
};

export default nextConfig;
