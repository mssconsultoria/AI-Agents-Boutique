"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function PublicNav() {
  const { isSignedIn } = useAuth();

  return (
    <header className="glass-panel fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-12 border-0">
      {/* Left: Logo/Brand */}
      <div className="flex-shrink-0">
        <h1 className="font-headline font-bold italic text-primary text-lg">
          Project Glasswing
        </h1>
      </div>

      {/* Center: Navigation Links */}
      <nav className="flex-1 flex items-center justify-center gap-12">
        <Link
          href="#editais"
          className="text-[12px] uppercase tracking-[0.15em] text-on-surface hover:text-primary transition-colors font-medium"
        >
          Editais
        </Link>
        <Link
          href="#precos"
          className="text-[12px] uppercase tracking-[0.15em] text-on-surface hover:text-primary transition-colors font-medium"
        >
          Preços
        </Link>
        <Link
          href="#blog"
          className="text-[12px] uppercase tracking-[0.15em] text-on-surface hover:text-primary transition-colors font-medium"
        >
          Blog
        </Link>
      </nav>

      {/* Right: Auth Links */}
      <div className="flex-shrink-0 flex items-center gap-4">
        {!isSignedIn ? (
          <>
            <Link
              href="/login"
              className="text-[12px] uppercase tracking-[0.15em] text-on-surface hover:text-primary transition-colors font-medium"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="text-[12px] uppercase tracking-[0.15em] text-primary bg-primary/10 px-6 py-2 rounded-sm hover:bg-primary/20 transition-colors font-medium"
            >
              Começar Grátis
            </Link>
          </>
        ) : (
          <Link
            href="/dashboard"
            className="text-[12px] uppercase tracking-[0.15em] text-primary bg-primary/10 px-6 py-2 rounded-sm hover:bg-primary/20 transition-colors font-medium"
          >
            Meu Painel
          </Link>
        )}
      </div>
    </header>
  );
}
