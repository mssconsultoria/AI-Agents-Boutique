"use client";

import { useState, useEffect } from "react";

type TesteAB = {
  id: string;
  nome: string;
  metrica_primaria: string;
  variante_a: string;
  variante_b: string;
  status: string;
  vencedor: string | null;
};

type TesteDetalhe = TesteAB & {
  stats?: Record<string, unknown>;
};

export default function TestesABPage() {
  const [testes, setTestes] = useState<TesteAB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [detalhe, setDetalhe] = useState<TesteDetalhe | null>(null);

  const [nome, setNome] = useState("");
  const [metrica, setMetrica] = useState("ctr");
  const [varianteA, setVarianteA] = useState("");
  const [varianteB, setVarianteB] = useState("");

  async function fetchTestes() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/testes-ab");
      if (!res.ok) throw new Error();
      setTestes(await res.json());
    } catch {
      setError("Erro ao carregar testes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTestes();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/testes-ab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          metrica_primaria: metrica,
          variante_a: varianteA,
          variante_b: varianteB,
        }),
      });
      if (!res.ok) throw new Error();
      setShowForm(false);
      setNome("");
      setVarianteA("");
      setVarianteB("");
      fetchTestes();
    } catch {
      alert("Erro ao criar teste");
    }
  }

  async function handleDetalhe(id: string) {
    try {
      const res = await fetch(`/api/testes-ab/${id}`);
      if (!res.ok) throw new Error();
      setDetalhe(await res.json());
    } catch {
      alert("Erro ao carregar detalhes");
    }
  }

  async function handleEncerrar(id: string) {
    try {
      const res = await fetch(`/api/testes-ab/${id}/encerrar`, { method: "PUT" });
      if (!res.ok) throw new Error();
      setDetalhe(null);
      fetchTestes();
    } catch {
      alert("Erro ao encerrar teste");
    }
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Testes A/B</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          {showForm ? "Cancelar" : "Novo Teste"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-5 mb-6 grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Metrica Primaria</label>
            <select value={metrica} onChange={(e) => setMetrica(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="ctr">CTR</option>
              <option value="cpl">CPL</option>
              <option value="cpa">CPA</option>
              <option value="roas">ROAS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Variante A</label>
            <input required value={varianteA} onChange={(e) => setVarianteA(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Variante B</label>
            <input required value={varianteB} onChange={(e) => setVarianteB(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700">
              Criar Teste
            </button>
          </div>
        </form>
      )}

      {detalhe && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{detalhe.nome}</h2>
            <button onClick={() => setDetalhe(null)} className="text-sm text-gray-500 hover:text-gray-700">Fechar</button>
          </div>
          <p className="text-sm text-gray-600 mb-1">Metrica: {detalhe.metrica_primaria}</p>
          <p className="text-sm text-gray-600 mb-1">Variante A: {detalhe.variante_a} | Variante B: {detalhe.variante_b}</p>
          <p className="text-sm text-gray-600 mb-1">Status: {detalhe.status}</p>
          {detalhe.vencedor && <p className="text-sm text-green-700 font-medium">Vencedor: {detalhe.vencedor}</p>}
          {detalhe.stats && (
            <pre className="mt-3 bg-gray-50 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(detalhe.stats, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Metrica</th>
              <th className="text-left px-4 py-3">Variante A</th>
              <th className="text-left px-4 py-3">Variante B</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Vencedor</th>
              <th className="text-left px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {testes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">Nenhum teste</td>
              </tr>
            ) : (
              testes.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50 even:bg-gray-50/50">
                  <td className="px-4 py-2">
                    <button onClick={() => handleDetalhe(t.id)} className="text-blue-600 hover:underline">
                      {t.nome}
                    </button>
                  </td>
                  <td className="px-4 py-2">{t.metrica_primaria}</td>
                  <td className="px-4 py-2">{t.variante_a}</td>
                  <td className="px-4 py-2">{t.variante_b}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${t.status === "ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{t.vencedor ?? "-"}</td>
                  <td className="px-4 py-2">
                    {t.status === "ativo" && (
                      <button
                        onClick={() => handleEncerrar(t.id)}
                        className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded"
                      >
                        Encerrar
                      </button>
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
