"use client";

import { useState, useEffect, useRef } from "react";

type Metrica = {
  id: string;
  data: string;
  campanha: string;
  variante: string;
  gasto: number;
  impressoes: number;
  cliques: number;
  ctr: number;
  leads: number;
  cpl: number;
  vendas: number;
  cpa: number;
  receita: number;
  roas: number;
};

export default function MetricasPage() {
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campanha, setCampanha] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchMetricas() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (campanha) params.set("campanha", campanha);
      if (dataInicio) params.set("data_inicio", dataInicio);
      if (dataFim) params.set("data_fim", dataFim);
      const res = await fetch(`/api/metricas?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar metricas");
      setMetricas(await res.json());
    } catch {
      setError("Erro ao carregar metricas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMetricas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleImportCSV() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/metricas/importar-csv", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      alert("CSV importado com sucesso!");
      fetchMetricas();
    } catch {
      alert("Erro ao importar CSV");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Metricas</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Campanha</label>
          <input
            type="text"
            value={campanha}
            onChange={(e) => setCampanha(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="Filtrar campanha"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data Inicio</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={fetchMetricas}
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          Filtrar
        </button>
        <div className="ml-auto flex items-end gap-2">
          <input type="file" accept=".csv" ref={fileRef} className="text-sm" />
          <button
            onClick={handleImportCSV}
            className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-800"
          >
            Importar CSV
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-3">Data</th>
                <th className="text-left px-3 py-3">Campanha</th>
                <th className="text-left px-3 py-3">Variante</th>
                <th className="text-right px-3 py-3">Gasto</th>
                <th className="text-right px-3 py-3">Impressoes</th>
                <th className="text-right px-3 py-3">Cliques</th>
                <th className="text-right px-3 py-3">CTR%</th>
                <th className="text-right px-3 py-3">Leads</th>
                <th className="text-right px-3 py-3">CPL</th>
                <th className="text-right px-3 py-3">Vendas</th>
                <th className="text-right px-3 py-3">CPA</th>
                <th className="text-right px-3 py-3">Receita</th>
                <th className="text-right px-3 py-3">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {metricas.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center text-gray-400 py-8">
                    Nenhuma metrica encontrada
                  </td>
                </tr>
              ) : (
                metricas.map((m, i) => (
                  <tr key={m.id ?? i} className="border-t hover:bg-gray-50 even:bg-gray-50/50">
                    <td className="px-3 py-2">{m.data}</td>
                    <td className="px-3 py-2">{m.campanha}</td>
                    <td className="px-3 py-2">{m.variante}</td>
                    <td className="px-3 py-2 text-right">R$ {Number(m.gasto).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{m.impressoes}</td>
                    <td className="px-3 py-2 text-right">{m.cliques}</td>
                    <td className="px-3 py-2 text-right">{Number(m.ctr).toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right">{m.leads}</td>
                    <td className="px-3 py-2 text-right">R$ {Number(m.cpl).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{m.vendas}</td>
                    <td className="px-3 py-2 text-right">R$ {Number(m.cpa).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">R$ {Number(m.receita).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{Number(m.roas).toFixed(2)}x</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
