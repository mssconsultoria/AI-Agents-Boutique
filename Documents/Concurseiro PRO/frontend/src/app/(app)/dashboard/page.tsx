'use client';

import TrialBanner from '@/components/TrialBanner';

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
      {sub && (
        <span className="text-sm text-on-surface-variant">{sub}</span>
      )}
    </div>
  );
}

const STATS: StatCardProps[] = [
  { label: 'Questões Hoje', value: '3/5', sub: '60% da meta diária' },
  { label: 'Acertos', value: '78%', sub: 'Últimas 30 questões' },
  { label: 'Sequência', value: '12 dias', sub: 'Sem parar estudando' },
  { label: 'Concursos', value: '3 ativos', sub: 'Acompanhando editais' },
];

const RECENT_ACTIVITY = [
  { id: 1, text: 'Respondeu 5 questões de Direito Constitucional', time: 'Há 2 horas' },
  { id: 2, text: 'Novo edital detectado: TJSP 2026', time: 'Há 5 horas' },
  { id: 3, text: 'Meta diária atingida ontem', time: 'Ontem às 22:14' },
  { id: 4, text: 'Iniciou simulado de Língua Portuguesa', time: 'Há 2 dias' },
];

const CONCURSOS = [
  { id: 1, name: 'TJSP — Escrevente Técnico', deadline: 'Inscrições até 30/05/2026', status: 'Edital publicado' },
  { id: 2, name: 'INSS — Técnico do Seguro Social', deadline: 'Prova em 15/06/2026', status: 'Inscrições abertas' },
  { id: 3, name: 'Polícia Federal — Agente', deadline: 'Edital previsto: jun/2026', status: 'Aguardando edital' },
];

export default function DashboardPage() {
  return (
    <>
      <TrialBanner daysRemaining={5} />

      <main className="pt-24 px-6 md:px-12 pb-12 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold italic text-on-surface">
            Seu Painel
          </h1>
          <p className="text-on-surface-variant mt-1">
            Bem-vindo de volta. Aqui está seu progresso de hoje.
          </p>
        </div>

        {/* Stat cards grid */}
        <section aria-label="Estatísticas" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Atividade Recente */}
          <section aria-label="Atividade Recente" className="lg:col-span-2">
            <h2 className="font-headline text-xl font-bold text-on-surface mb-4">
              Atividade Recente
            </h2>
            <div className="card-base divide-y divide-surface-container-high">
              {RECENT_ACTIVITY.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-4 px-5 first:pt-5 last:pb-5">
                  <p className="text-sm text-on-surface leading-snug">{item.text}</p>
                  <span className="text-xs text-on-surface-variant whitespace-nowrap shrink-0">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Seus Concursos */}
          <section aria-label="Seus Concursos">
            <h2 className="font-headline text-xl font-bold text-on-surface mb-4">
              Seus Concursos
            </h2>
            <div className="flex flex-col gap-3">
              {CONCURSOS.map((concurso) => (
                <div key={concurso.id} className="card-elevated p-4 flex flex-col gap-1">
                  <span className="text-sm font-semibold text-on-surface leading-snug">
                    {concurso.name}
                  </span>
                  <span className="text-xs text-on-surface-variant">{concurso.deadline}</span>
                  <span className="text-xs text-primary font-medium mt-1">{concurso.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
