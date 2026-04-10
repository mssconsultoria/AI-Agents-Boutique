type Props = {
  orgao: string;
  banca: string;
  cidade?: string | null;
  estado?: string | null;
  vagas?: number | null;
  salario_min?: number | null;
  salario_max?: number | null;
  data_prova?: string | null;
};

export default function HeroSection(props: Props) {
  const salario =
    props.salario_min && props.salario_max
      ? `R$ ${props.salario_min.toLocaleString("pt-BR")} - ${props.salario_max.toLocaleString("pt-BR")}`
      : null;

  return (
    <section className="bg-blue-900 text-white p-6 rounded-lg">
      <h1 className="text-2xl font-bold">{props.orgao}</h1>
      <p className="text-sm opacity-80 mt-1">
        Banca: {props.banca}
        {props.cidade && ` | ${props.cidade}/${props.estado}`}
        {props.vagas && ` | ${props.vagas} vagas`}
      </p>
      {salario && <p className="text-sm opacity-80">{salario}</p>}
      {props.data_prova && (
        <p className="text-sm mt-2">
          Prova: {new Date(props.data_prova).toLocaleDateString("pt-BR")}
        </p>
      )}
    </section>
  );
}
