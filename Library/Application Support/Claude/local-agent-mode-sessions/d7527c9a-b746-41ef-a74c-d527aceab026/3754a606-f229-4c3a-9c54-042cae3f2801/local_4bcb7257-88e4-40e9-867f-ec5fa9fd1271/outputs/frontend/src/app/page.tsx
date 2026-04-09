const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

type Concurso = {
  id: string;
  slug: string;
  orgao: string;
  banca: string;
  cidade: string;
  estado: string;
  vagas: number;
  salario_min: number;
  salario_max: number;
  data_prova: string | null;
  countdown_ativo: boolean;
  dias_restantes: number | null;
};

async function getConcursosAtivos(): Promise<Concurso[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/concursos/ativos`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "A definir";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}

export default async function Home() {
  const concursos = await getConcursosAtivos();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Concurseiro Virtual
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Sua plataforma de preparacao para concursos publicos. Materiais
            exclusivos, simulados e acompanhamento personalizado.
          </p>
          <a
            href="#concursos"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Ver Concursos Disponiveis
          </a>
        </div>
      </section>

      {/* Concursos Ativos */}
      <section id="concursos" className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Concursos Ativos
          </h2>
          {concursos.length === 0 ? (
            <p className="text-center text-gray-500">
              Nenhum concurso ativo no momento.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {concursos.map((c) => (
                <a
                  key={c.id}
                  href={`/concurso/${c.slug}`}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 block"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {c.orgao}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {c.banca} &middot; {c.cidade}/{c.estado}
                  </p>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Vagas:</span> {c.vagas}
                    </p>
                    <p>
                      <span className="font-medium">Salario:</span>{" "}
                      {formatCurrency(c.salario_min)} a{" "}
                      {formatCurrency(c.salario_max)}
                    </p>
                    <p>
                      <span className="font-medium">Prova:</span>{" "}
                      {formatDate(c.data_prova)}
                    </p>
                  </div>
                  {c.countdown_ativo && c.dias_restantes != null && (
                    <div className="mt-3 inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                      {c.dias_restantes} dias restantes
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-10">
            Como Funciona
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: "1",
                title: "Escolha seu concurso",
                desc: "Navegue pelos concursos disponiveis e encontre o ideal para voce.",
              },
              {
                icon: "2",
                title: "Baixe o simulado gratis",
                desc: "Teste seus conhecimentos sem custo e descubra seu nivel.",
              },
              {
                icon: "3",
                title: "Estude e passe",
                desc: "Use nossos materiais exclusivos para garantir sua aprovacao.",
              },
            ].map((step) => (
              <div key={step.icon} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mb-4">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Depoimentos
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Maria S.",
                badge: "Aprovada CRAISA 2025",
                text: "O material foi essencial para minha aprovacao. Questoes muito parecidas com a prova real!",
              },
              {
                name: "Carlos R.",
                badge: "1o lugar Pref. Santo Andre",
                text: "Os simulados me ajudaram a entender o estilo da banca. Recomendo demais!",
              },
              {
                name: "Ana P.",
                badge: "Aprovada VUNESP 2025",
                text: "Recomendo para todos que querem passar em concurso. Material completo e atualizado.",
              },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-700 text-sm mb-4">
                  &ldquo;{t.text}&rdquo;
                </p>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-blue-600">{t.badge}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">
            Comece a estudar agora
          </h2>
          <p className="text-blue-100 mb-8">
            Nao perca tempo. Escolha seu concurso e comece sua preparacao hoje
            mesmo.
          </p>
          <a
            href="#concursos"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Ver Concursos
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-2">
          <p className="text-white font-semibold">Concurseiro Virtual</p>
          <p className="text-sm">
            Produtos digitais para concursos publicos
          </p>
          <p className="text-sm">contato@concurseirovirtual.com.br</p>
          <p className="text-xs mt-4">
            &copy; 2026 Concurseiro Virtual. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
