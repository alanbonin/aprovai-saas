import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  themeColor: "#0ab5bd",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Android gesture nav + iPhone notch
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
    images: [{ url: `${APP_URL}/api/og`, width: 1200, height: 630, alt: "AprovAI360" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AprovAI360 — Sua Aprovação em Concursos Públicos",
    description: "Plataforma de estudos para concursos públicos com IA.",
    images: [{ url: `${APP_URL}/api/og`, width: 1200, height: 630, alt: "AprovAI360" }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AprovAI360",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        {/* Aplica dark mode ANTES do React hidratar — evita flash branco no Android PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light')}else{document.documentElement.classList.remove('light')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full antialiased`} style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
