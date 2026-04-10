"use client";

import { useState, useEffect } from "react";

type Alerta = {
  id: string;
  tipo: string;
  campanha: string;
  mensagem: string;
  status: string;
};

const badgeColor: Record<string, string> = {
  ctr_baixo: "bg-yellow-100 text-yellow-800",
  cpl_alto: "bg-orange-100 text-orange-800",
  cpa_alto: "bg-red-100 text-red-800",
  roas_baixo: "bg-red-100 text-red-800",
};

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchAlertas() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/alertas");
      if (!res.ok) throw new Error();
      setAlertas(await res.json());
    } catch {
      setError("Erro ao carregar alertas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlertas();
  }, []);

  async function handleSuprimir(id: string) {
    try {
      const res = await fetch(`/api/alertas/${id}/suprimir`, { method: "PUT" });
      if (!res.ok) throw new Error();
      fetchAlertas();
    } catch {
      alert("Erro ao suprimir alerta");
    }
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Alertas</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Campanha</th>
              <th className="text-left px-4 py-3">Mensagem</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Acao</th>
            </tr>
          </thead>
          <tbody>
            {alertas.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-8">
                  Nenhum alerta ativo
                </td>
              </tr>
            ) : (
              alertas.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50 even:bg-gray-50/50">
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeColor[a.tipo] ?? "bg-gray-100 text-gray-700"}`}>
                      {a.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-2">{a.campanha}</td>
                  <td className="px-4 py-2">{a.mensagem}</td>
                  <td className="px-4 py-2">{a.status}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleSuprimir(a.id)}
                      className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded"
                    >
                      Suprimir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
