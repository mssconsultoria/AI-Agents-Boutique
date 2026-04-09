import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Concurseiro SaaS",
  description: "Produtos digitais para concursos publicos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
