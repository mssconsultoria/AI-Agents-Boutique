"use client";

import { useState, useEffect } from "react";

type Concurso = {
  id: string;
  slug: string;
  orgao: string;
  banca: string;
  cidade: string;
  estado: string;
  vagas: number;
  data_prova: string | null;
  ativo: boolean;
};

export default function ConcursosAdminPage() {
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [slug, setSlug] = useState("");
  const [orgao, setOrgao] = useState("");
  const [banca, setBanca] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [vagas, setVagas] = useState("");
  const [salarioMin, setSalarioMin] = useState("");
  const [salarioMax, setSalarioMax] = useState("");
  const [dataProva, setDataProva] = useState("");
  const [dataInscricaoFim, setDataInscricaoFim] = useState("");

  async function fetchConcursos() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/concursos");
      if (!res.ok) throw new Error();
      setConcursos(await res.json());
    } catch {
      setError("Erro ao carregar concursos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConcursos();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/concursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          orgao,
          banca,
          cidade,
          estado,
          vagas: Number(vagas),
          salario_min: Number(salarioMin),
          salario_max: Number(salarioMax),
          data_prova: dataProva || null,
          data_inscricao_fim: dataInscricaoFim || null,
        }),
      });
      if (!res.ok) throw new Error();
      setShowForm(false);
      setSlug("");
      setOrgao("");
      setBanca("");
      setCidade("");
      setEstado("");
      setVagas("");
      setSalarioMin("");
      setSalarioMax("");
      setDataProva("");
      setDataInscricaoFim("");
      fetchConcursos();
    } catch {
      alert("Erro ao criar concurso");
    }
  }

  async function handleDesativar(id: string) {
    if (!confirm("Desativar este concurso?")) return;
    try {
      const res = await fetch(`/api/concursos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchConcursos();
    } catch {
      alert("Erro ao desativar concurso");
    }
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Concursos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          {showForm ? "Cancelar" : "Novo Concurso"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-5 mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
            <input required value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Orgao</label>
            <input required value={orgao} onChange={(e) => setOrgao(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banca</label>
            <input required value={banca} onChange={(e) => setBanca(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
            <input required value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <input required value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" maxLength={2} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vagas</label>
            <input required type="number" value={vagas} onChange={(e) => setVagas(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Salario Min</label>
            <input required type="number" step="0.01" value={salarioMin} onChange={(e) => setSalarioMin(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Salario Max</label>
            <input required type="number" step="0.01" value={salarioMax} onChange={(e) => setSalarioMax(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Prova</label>
            <input type="date" value={dataProva} onChange={(e) => setDataProva(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Inscricao Fim</label>
            <input type="date" value={dataInscricaoFim} onChange={(e) => setDataInscricaoFim(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700">
              Criar Concurso
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-left px-4 py-3">Orgao</th>
              <th className="text-left px-4 py-3">Banca</th>
              <th className="text-left px-4 py-3">Cidade</th>
              <th className="text-right px-4 py-3">Vagas</th>
              <th className="text-left px-4 py-3">Data Prova</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {concursos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-8">Nenhum concurso</td>
              </tr>
            ) : (
              concursos.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50 even:bg-gray-50/50">
                  <td className="px-4 py-2 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-2">{c.orgao}</td>
                  <td className="px-4 py-2">{c.banca}</td>
                  <td className="px-4 py-2">{c.cidade}/{c.estado}</td>
                  <td className="px-4 py-2 text-right">{c.vagas}</td>
                  <td className="px-4 py-2">{c.data_prova ?? "A definir"}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {c.ativo && (
                      <button
                        onClick={() => handleDesativar(c.id)}
                        className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded"
                      >
                        Desativar
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
