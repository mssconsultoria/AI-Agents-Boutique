"use client";

type Props = {
  countdown_ativo: boolean;
  dias_restantes: number | null;
};

export default function CountdownTimer({ countdown_ativo, dias_restantes }: Props) {
  if (!countdown_ativo || dias_restantes === null) return null;

  return (
    <div className="bg-red-600 text-white text-center py-2 px-4 rounded-md text-sm font-semibold">
      Faltam {dias_restantes} dias para encerramento das inscricoes
    </div>
  );
}
