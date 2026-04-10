"use client";

import { useState, useEffect } from "react";

type Edital = {
  id: string;
  orgao: string;
  banca: string;
  ano: number;
  edital: string;
  vagas: number;
  salario: number;
  data_prova: string | null;
  link: string | null;
};

export default function EditaisPage() {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banca, setBanca] = useState("");
  const [orgao, setOrgao] = useState("");
  const [scraping, setScraping] = useState(false);

  async function fetchEditais() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (banca) params.set("banca", banca);
      if (orgao) params.set("orgao", orgao);
      const res = await fetch(`/api/editais?${params}`);
      if (!res.ok) throw new Error();
      setEditais(await res.json());
    } catch {
      setError("Erro ao carregar editais");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEditais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScrape() {
    setScraping(true);
    try {
      const res = await fetch("/api/editais/scrape", { method: "POST" });
      if (!res.ok) throw new Error();
      alert("Scraping executado com sucesso!");
      fetchEditais();
    } catch {
      alert("Erro ao executar scraping");
    } finally {
      setScraping(false);
    }
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editais</h1>
        <button
          onClick={handleScrape}
          disabled={scraping}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {scraping ? "Executando..." : "Executar Scraping"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Banca</label>
          <input
            type="text"
            value={banca}
            onChange={(e) => setBanca(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="Filtrar banca"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Orgao</label>
          <input
            type="text"
            value={orgao}
            onChange={(e) => setOrgao(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="Filtrar orgao"
          />
        </div>
        <button onClick={fetchEditais} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
          Filtrar
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Orgao</th>
              <th className="text-left px-4 py-3">Banca</th>
              <th className="text-left px-4 py-3">Ano</th>
              <th className="text-left px-4 py-3">Edital</th>
              <th className="text-right px-4 py-3">Vagas</th>
              <th className="text-right px-4 py-3">Salario</th>
              <th className="text-left px-4 py-3">Data Prova</th>
              <th className="text-left px-4 py-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {editais.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-8">Nenhum edital encontrado</td>
              </tr>
            ) : (
              editais.map((e) => (
                <tr key={e.id} className="border-t hover:bg-gray-50 even:bg-gray-50/50">
                  <td className="px-4 py-2">{e.orgao}</td>
                  <td className="px-4 py-2">{e.banca}</td>
                  <td className="px-4 py-2">{e.ano}</td>
                  <td className="px-4 py-2">{e.edital}</td>
                  <td className="px-4 py-2 text-right">{e.vagas}</td>
                  <td className="px-4 py-2 text-right">R$ {Number(e.salario).toFixed(2)}</td>
                  <td className="px-4 py-2">{e.data_prova ?? "A definir"}</td>
                  <td className="px-4 py-2">
                    {e.link ? (
                      <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Ver
                      </a>
                    ) : (
                      "-"
                    )}
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
