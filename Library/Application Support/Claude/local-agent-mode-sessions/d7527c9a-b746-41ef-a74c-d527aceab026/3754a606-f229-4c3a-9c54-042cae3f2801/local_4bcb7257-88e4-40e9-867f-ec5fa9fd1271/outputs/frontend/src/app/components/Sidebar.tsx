"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/metricas", label: "Metricas" },
  { href: "/admin/alertas", label: "Alertas" },
  { href: "/admin/testes-ab", label: "Testes A/B" },
  { href: "/admin/editais", label: "Editais" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/concursos", label: "Concursos" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden bg-gray-800 text-white p-2 rounded"
        aria-label="Toggle menu"
      >
        {open ? "\u2715" : "\u2630"}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-60 bg-gray-800 text-white flex flex-col transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-gray-700">
          <Link href="/admin/dashboard" className="text-lg font-bold">
            Concurseiro Virtual
          </Link>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block px-5 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-blue-600 text-white font-medium"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
