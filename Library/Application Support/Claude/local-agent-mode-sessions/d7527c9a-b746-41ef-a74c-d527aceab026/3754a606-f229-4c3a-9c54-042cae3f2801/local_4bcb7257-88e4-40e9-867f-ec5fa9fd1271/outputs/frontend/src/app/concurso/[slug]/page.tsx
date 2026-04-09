import HeroSection from "./components/HeroSection";
import CountdownTimer from "./components/CountdownTimer";
import ProductCard from "./components/ProductCard";
import LeadCaptureForm from "./components/LeadCaptureForm";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  tipo: string;
  destaque: boolean;
};

async function getConcurso(slug: string) {
  const res = await fetch(`${BACKEND_URL}/api/v1/concursos/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ConcursoPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await getConcurso(params.slug);
  if (!data) {
    return <div className="p-8 text-center">Concurso nao encontrado</div>;
  }

  return (
    <main className="max-w-lg mx-auto p-4 space-y-4">
      <HeroSection
        orgao={data.orgao}
        banca={data.banca}
        cidade={data.cidade}
        estado={data.estado}
        vagas={data.vagas}
        salario_min={data.salario_min}
        salario_max={data.salario_max}
        data_prova={data.data_prova}
      />
      <CountdownTimer
        countdown_ativo={data.countdown_ativo}
        dias_restantes={data.dias_restantes}
      />
      {data.produtos.map((p: Produto) => (
        <ProductCard
          key={p.id}
          nome={p.nome}
          preco={p.preco}
          tipo={p.tipo}
          destaque={p.destaque}
        />
      ))}
      <LeadCaptureForm concurso_id={data.id} />
    </main>
  );
}
