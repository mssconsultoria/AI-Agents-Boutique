'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

// Mock: hardcoded to "gratis" to trigger paywall. Swap with real plan data later.
const userPlan: string = 'gratis';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="card-elevated flex flex-col gap-1 p-6">
      <span className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold">
        {label}
      </span>
      <span className="font-headline text-3xl font-bold text-on-surface">{value}</span>
      {sub && <span className="text-sm text-on-surface-variant">{sub}</span>}
    </div>
  );
}

const ANALYTICS_STATS: StatCardProps[] = [
  { label: 'Taxa de Acerto', value: '74%', sub: 'Média geral' },
  { label: 'Tempo Médio', value: '1m 42s', sub: 'Por questão' },
  { label: 'Questões/Dia', value: '8.3', sub: 'Média nos últimos 30 dias' },
  { label: 'Ranking', value: '#128', sub: 'Entre todos os usuários' },
];

const MATERIAS = [
  { name: 'Direito Constitucional', pct: 82 },
  { name: 'Língua Portuguesa', pct: 68 },
  { name: 'Raciocínio Lógico', pct: 75 },
  { name: 'Direito Administrativo', pct: 60 },
  { name: 'Informática', pct: 90 },
];

function PaywallOverlay() {
  const router = useRouter();

  return (
    <div className="min-h-screen glass-panel flex items-center justify-center px-6">
      <div className="card-elevated max-w-md w-full flex flex-col items-center gap-6 p-12 text-center">
        <span className="text-6xl" role="img" aria-label="Cadeado">
          🔒
        </span>
        <h1 className="font-headline text-4xl font-bold italic text-on-surface">
          Analytics PRO
        </h1>
        <p className="text-on-surface-variant leading-relaxed">
          Desbloqueie insights avançados sobre seu desempenho — veja em quais matérias você mais
          evolui, seu histórico semanal e onde concentrar seus estudos.
        </p>
        <button
          onClick={() => router.push('/pricing')}
          aria-label="Ver planos disponíveis"
          className="bg-primary text-on-primary editorial-gradient px-8 py-3 rounded-sm text-base font-semibold w-full transition-opacity hover:opacity-90"
        >
          Ver Planos
        </button>
      </div>
    </div>
  );
}

function AnalyticsDashboard() {
  return (
    <main className="px-6 md:px-12 py-12 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold italic text-on-surface">
          Analytics PRO
        </h1>
        <p className="text-on-surface-variant mt-1">
          Insights avançados sobre seu desempenho nos estudos.
        </p>
      </div>

      {/* Stat cards */}
      <section aria-label="Métricas principais" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {ANALYTICS_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Desempenho por Matéria */}
        <section aria-label="Desempenho por Matéria">
          <h2 className="font-headline text-xl font-bold text-on-surface mb-4">
            Desempenho por Matéria
          </h2>
          <div className="card-base p-6 flex flex-col gap-5">
            {MATERIAS.map((m) => (
              <div key={m.name} className="flex flex-col gap-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-on-surface">{m.name}</span>
                  <span className="text-sm font-semibold text-on-surface">{m.pct}%</span>
                </div>
                <div
                  className="h-2 rounded-full bg-surface-container-high overflow-hidden"
                  role="progressbar"
                  aria-valuenow={m.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${m.name}: ${m.pct}%`}
                >
                  <div
                    className="h-full bg-primary editorial-gradient transition-all duration-500"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Evolução Semanal */}
        <section aria-label="Evolução Semanal">
          <h2 className="font-headline text-xl font-bold text-on-surface mb-4">
            Evolução Semanal
          </h2>
          <div className="card-base p-6 h-64 flex flex-col justify-end gap-2">
            {/* Placeholder chart bars */}
            <div className="flex items-end justify-between gap-2 flex-1">
              {[40, 65, 50, 80, 70, 90, 60].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary editorial-gradient rounded-sm opacity-80"
                    style={{ height: `${h}%` }}
                    role="img"
                    aria-label={`Dia ${i + 1}: ${h}% de aproveitamento`}
                  />
                </div>
              ))}
            </div>
            {/* Day labels */}
            <div className="flex justify-between gap-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                <span key={day} className="flex-1 text-center text-xs text-on-surface-variant">
                  {day}
                </span>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant text-center mt-1">
              Aproveitamento diário — última semana (placeholder)
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AnalyticsPage() {
  // Auth hook available; plan check uses mock userPlan variable above.
  useAuth();

  const hasAccess = userPlan === 'premium' || userPlan === 'essencial';

  if (!hasAccess) {
    return <PaywallOverlay />;
  }

  return <AnalyticsDashboard />;
}
