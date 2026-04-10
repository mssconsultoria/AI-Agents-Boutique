import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import CountdownTimer from "@/app/concurso/[slug]/components/CountdownTimer";

afterEach(cleanup);

test("exibe countdown quando ativo", () => {
  render(<CountdownTimer countdown_ativo={true} dias_restantes={15} />);
  expect(screen.getByText(/15 dias/)).toBeDefined();
});

test("nao renderiza quando inativo", () => {
  const { container } = render(
    <CountdownTimer countdown_ativo={false} dias_restantes={null} />
  );
  expect(container.innerHTML).toBe("");
});
