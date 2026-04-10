"use client";

import { useState, useEffect } from "react";

type Lead = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  status: string;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
};

const statusColors: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800",
  contatado: "bg-yellow-100 text-yellow-800",
  convertido: "bg-green-100 text-green-800",
  perdido: "bg-gray-100 text-gray-600",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [concurso, setConcurso] = useState("");

  async function fetchLeads() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (concurso) params.set("concurso_id", concurso);
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error();
      setLeads(await res.json());
    } catch {
      setError("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leads</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Concurso</label>
          <input
            type="text"
            value={concurso}
            onChange={(e) => setConcurso(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="ID do concurso"
          />
        </div>
        <button onClick={fetchLeads} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
          Filtrar
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">WhatsApp</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">UTM Source</th>
              <th className="text-left px-4 py-3">UTM Campaign</th>
              <th className="text-left px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">Nenhum lead encontrado</td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="border-t hover:bg-gray-50 even:bg-gray-50/50">
                  <td className="px-4 py-2">{l.nome}</td>
                  <td className="px-4 py-2">{l.email}</td>
                  <td className="px-4 py-2">{l.whatsapp}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[l.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{l.utm_source ?? "-"}</td>
                  <td className="px-4 py-2">{l.utm_campaign ?? "-"}</td>
                  <td className="px-4 py-2">{new Date(l.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
