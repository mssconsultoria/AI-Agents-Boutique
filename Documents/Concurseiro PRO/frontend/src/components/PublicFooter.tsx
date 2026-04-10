import Link from "next/link";

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-container-low">
      <div className="flex items-center justify-between px-12 py-8">
        {/* Left: Copyright */}
        <p className="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-medium">
          Project Glasswing © {year}
        </p>

        {/* Right: Links */}
        <div className="flex items-center gap-8">
          <Link
            href="/termos"
            className="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary transition-colors font-medium"
          >
            Termos
          </Link>
          <Link
            href="/privacidade"
            className="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary transition-colors font-medium"
          >
            Privacidade
          </Link>
          <Link
            href="/suporte"
            className="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary transition-colors font-medium"
          >
            Suporte
          </Link>
        </div>
      </div>
    </footer>
  );
}
