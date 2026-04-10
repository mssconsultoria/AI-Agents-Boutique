import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Glasswing — Concurseiro PRO",
  description:
    "Plataforma premium de preparação para concursos públicos. Editais monitorados, questões comentadas e plano de estudo personalizado.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="pt-BR"
        className={`${newsreader.variable} ${inter.variable} dark`}
      >
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased min-h-screen">
          {children}
          <div className="fixed top-4 left-4 w-1 h-1 bg-primary/20 z-[60] pointer-events-none" />
          <div className="fixed top-4 right-4 w-1 h-1 bg-primary/20 z-[60] pointer-events-none" />
          <div className="fixed bottom-4 left-4 w-1 h-1 bg-primary/20 z-[60] pointer-events-none" />
          <div className="fixed bottom-4 right-4 w-1 h-1 bg-primary/20 z-[60] pointer-events-none" />
        </body>
      </html>
    </ClerkProvider>
  );
}
