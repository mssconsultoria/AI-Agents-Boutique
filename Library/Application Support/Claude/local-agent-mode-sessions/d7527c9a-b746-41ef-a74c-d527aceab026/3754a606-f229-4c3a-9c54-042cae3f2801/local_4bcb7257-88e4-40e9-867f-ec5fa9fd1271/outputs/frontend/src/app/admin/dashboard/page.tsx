import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function fetchWithAuth(path: string) {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1${path}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default async function DashboardPage() {
  const [receitaData, leads, pedidos, alertas, metricas] = await Promise.all([
    fetchWithAuth("/metricas/receita-liquida"),
    fetchWithAuth("/leads"),
    fetchWithAuth("/pedidos"),
    fetchWithAuth("/alertas"),
    fetchWithAuth("/metricas"),
  ]);

  const receita = receitaData?.receita_liquida ?? 0;
  const totalLeads = Array.isArray(leads) ? leads.length : 0;
  const totalPedidos = Array.isArray(pedidos) ? pedidos.length : 0;
  const totalAlertas = Array.isArray(alertas) ? alertas.length : 0;
  const metricasList = Array.isArray(metricas) ? metricas.slice(0, 10) : [];

  const kpis = [
    { label: "Receita Liquida", value: formatCurrency(receita), color: "border-green-500", bg: "bg-green-50" },
    { label: "Total Leads", value: totalLeads.toString(), color: "border-blue-500", bg: "bg-blue-50" },
    { label: "Total Pedidos", value: totalPedidos.toString(), color: "border-purple-500", bg: "bg-purple-50" },
    { label: "Alertas Ativos", value: totalAlertas.toString(), color: "border-red-500", bg: "bg-red-50" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-white rounded-lg shadow p-5 border-t-4 ${kpi.color}`}
          >
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Metricas Recentes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Campanha</th>
                <th className="text-right px-4 py-3">Gasto</th>
                <th className="text-right px-4 py-3">Cliques</th>
                <th className="text-right px-4 py-3">CTR</th>
                <th className="text-right px-4 py-3">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {metricasList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-8">
                    Nenhuma metrica disponivel
                  </td>
                </tr>
              ) : (
                metricasList.map((m: Record<string, unknown>, i: number) => (
                  <tr
                    key={i}
                    className="border-t hover:bg-gray-50 even:bg-gray-50/50"
                  >
                    <td className="px-4 py-2">{String(m.data ?? "")}</td>
                    <td className="px-4 py-2">{String(m.campanha ?? "")}</td>
                    <td className="px-4 py-2 text-right">
                      R$ {Number(m.gasto ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {String(m.cliques ?? 0)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {Number(m.ctr ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-2 text-right">
                      {Number(m.roas ?? 0).toFixed(2)}x
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
