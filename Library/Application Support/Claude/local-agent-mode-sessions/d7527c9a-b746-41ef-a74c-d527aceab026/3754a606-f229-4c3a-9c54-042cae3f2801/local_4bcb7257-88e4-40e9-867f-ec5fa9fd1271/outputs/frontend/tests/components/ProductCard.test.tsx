import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import ProductCard from "@/app/concurso/[slug]/components/ProductCard";

afterEach(cleanup);

test("exibe badge mais vendido quando destaque=true", () => {
  render(<ProductCard nome="Pacote" preco={97} tipo="pacote" destaque={true} />);
  expect(screen.getByText("MAIS VENDIDO")).toBeDefined();
});

test("nao exibe badge quando destaque=false", () => {
  render(<ProductCard nome="Ebook" preco={37} tipo="ebook" destaque={false} />);
  expect(screen.queryByText("MAIS VENDIDO")).toBeNull();
});

test("formata preco em reais", () => {
  render(<ProductCard nome="Ebook" preco={37} tipo="ebook" destaque={false} />);
  expect(screen.getByText("R$ 37,00")).toBeDefined();
});
