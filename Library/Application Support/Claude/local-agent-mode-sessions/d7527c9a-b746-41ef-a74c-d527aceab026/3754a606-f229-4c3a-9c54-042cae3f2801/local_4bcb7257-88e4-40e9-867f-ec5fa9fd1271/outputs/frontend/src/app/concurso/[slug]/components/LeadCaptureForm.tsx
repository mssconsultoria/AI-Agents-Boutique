"use client";

import { FormEvent, useState } from "react";

type Props = { concurso_id: string };

export default function LeadCaptureForm({ concurso_id }: Props) {
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErro("Email invalido");
      return;
    }

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concurso_id,
        nome: form.get("nome"),
        email,
        whatsapp: form.get("whatsapp"),
      }),
    });

    if (!res.ok) {
      setErro("Erro ao enviar. Tente novamente.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-700 font-semibold">Simulado enviado para seu email!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <h3 className="font-bold text-blue-800">Simulado Gratis</h3>
      <input name="nome" placeholder="Seu nome" required className="w-full border rounded px-3 py-2 text-sm" />
      <input name="email" type="email" placeholder="Seu email" required className="w-full border rounded px-3 py-2 text-sm" />
      <input name="whatsapp" placeholder="WhatsApp (opcional)" className="w-full border rounded px-3 py-2 text-sm" />
      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold">
        Baixar Simulado
      </button>
    </form>
  );
}
