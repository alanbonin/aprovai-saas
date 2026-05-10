import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aprovai — Plataforma de Concursos Públicos",
  description: "Prepare-se para concursos públicos com mentores IA especializados por área e banca.",
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
