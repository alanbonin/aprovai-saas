import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/cadastro", "/planos", "/suporte", "/termos", "/privacidade"],
        disallow: [
          "/workspace",
          "/dashboard",
          "/admin",
          "/api/",
          "/relatorio",
          "/mentor",
          "/questoes",
          "/simulado",
          "/redacao",
          "/caso",
          "/materiais",
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
