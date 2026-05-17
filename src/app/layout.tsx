import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0ab5bd",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "AprovAI360 — Sua Aprovação em Concursos Públicos",
    template: "%s | AprovAI360",
  },
  description:
    "Plataforma de estudos para concursos públicos com mentores IA especializados por área e banca. Questões adaptativas, simulados, flashcards e cronograma personalizado.",
  keywords: [
    "concursos públicos", "preparatório concurso", "questões concurso",
    "mentor IA", "simulado concurso", "flashcard concurso",
    "CESPE", "FGV", "VUNESP", "Polícia Federal", "TJ", "TRF",
    "direito administrativo", "direito constitucional", "raciocínio lógico",
  ],
  authors: [{ name: "AprovAI360" }],
  creator: "AprovAI360",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: APP_URL,
    siteName: "AprovAI360",
    title: "AprovAI360 — Sua Aprovação em Concursos Públicos",
    description: "Mentores IA especializados por área e banca. Questões adaptativas, simulados, flashcards e cronograma personalizado.",
    images: [{ url: `${APP_URL}/api/icon?size=512`, width: 512, height: 512, alt: "AprovAI360" }],
  },
  twitter: {
    card: "summary",
    title: "AprovAI360 — Sua Aprovação em Concursos Públicos",
    description: "Plataforma de estudos para concursos públicos com IA.",
    images: [`${APP_URL}/api/icon?size=512`],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AprovAI360",
  },
  icons: {
    icon: [
      { url: "/api/icon?size=192", sizes: "192x192", type: "image/png" },
      { url: "/api/icon?size=512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/api/icon?size=192", sizes: "192x192" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} min-h-full bg-[#080c18] antialiased`}>
        {children}
      </body>
    </html>
  );
}
