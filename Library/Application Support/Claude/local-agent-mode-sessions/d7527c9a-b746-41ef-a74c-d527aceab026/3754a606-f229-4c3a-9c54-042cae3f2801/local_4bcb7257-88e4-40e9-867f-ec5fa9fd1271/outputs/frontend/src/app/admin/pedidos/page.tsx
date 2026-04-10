"use client";

import { useState, useEffect } from "react";

type Pedido = {
  id: string;
  valor_bruto: number;
  desconto: number;
  metodo_pagamento: string;
  status: string;
  created_at: string;
};

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  pago: "bg-green-100 text-green-800",
  entregue: "bg-blue-100 text-blue-800",
  cancelado: "bg-gray-100 text-gray-600",
  reembolsado: "bg-red-100 text-red-800",
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  async function fetchPedidos() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (dataInicio) params.set("data_inicio", dataInicio);
      if (dataFim) params.set("data_fim", dataFim);
      const res = await fetch(`/api/pedidos?${params}`);
      if (!res.ok) throw new Error();
      setPedidos(await res.json());
    } catch {
      setError("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pedidos</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
            <option value="reembolsado">Reembolsado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data Inicio</label>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <button onClick={fetchPedidos} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
          Filtrar
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-right px-4 py-3">Valor Bruto</th>
              <th className="text-right px-4 py-3">Desconto</th>
              <th className="text-left px-4 py-3">Metodo</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8">Nenhum pedido encontrado</td>
              </tr>
            ) : (
              pedidos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50 even:bg-gray-50/50">
                  <td className="px-4 py-2 font-mono text-xs">{p.id.slice(0, 8)}...</td>
                  <td className="px-4 py-2 text-right">R$ {Number(p.valor_bruto).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">R$ {Number(p.desconto).toFixed(2)}</td>
                  <td className="px-4 py-2">{p.metodo_pagamento}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
