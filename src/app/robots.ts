import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/cadastro"],
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
          "/planos",
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
