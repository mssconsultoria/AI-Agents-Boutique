type Props = {
  nome: string;
  preco: number;
  tipo: string;
  destaque: boolean;
};

export default function ProductCard({ nome, preco, tipo, destaque }: Props) {
  return (
    <div
      className={`border rounded-lg p-4 ${destaque ? "border-green-500 border-2" : "border-gray-200"}`}
    >
      {destaque && (
        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
          MAIS VENDIDO
        </span>
      )}
      <h3 className="font-bold mt-2">{nome}</h3>
      <p className="text-green-600 font-bold text-lg">
        R$ {preco.toFixed(2).replace(".", ",")}
      </p>
    </div>
  );
}
