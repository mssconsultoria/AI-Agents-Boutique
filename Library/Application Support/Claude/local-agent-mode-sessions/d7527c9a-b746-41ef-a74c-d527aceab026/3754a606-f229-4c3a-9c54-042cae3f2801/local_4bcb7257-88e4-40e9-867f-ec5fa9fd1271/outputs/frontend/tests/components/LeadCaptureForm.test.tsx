import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import LeadCaptureForm from "@/app/concurso/[slug]/components/LeadCaptureForm";

afterEach(cleanup);

test("exibe erro para email invalido sem recarregar", async () => {
  render(<LeadCaptureForm concurso_id="123" />);
  const emailInput = screen.getByPlaceholderText("Seu email");
  const nomeInput = screen.getByPlaceholderText("Seu nome");
  const form = screen.getByText("Baixar Simulado").closest("form")!;

  fireEvent.change(nomeInput, { target: { value: "Joao" } });
  fireEvent.change(emailInput, { target: { value: "nao-e-email" } });
  fireEvent.submit(form);

  await waitFor(() => {
    expect(screen.getByText("Email invalido")).toBeDefined();
  });
});
