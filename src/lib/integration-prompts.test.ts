import { describe, expect, it } from "vitest";
import { buildIntegrationPrompt } from "./integration-prompts";
import { createInitialState } from "./seed";

describe("integration prompt builder", () => {
  it("builds a grounded ritual prompt from company and worker context", () => {
    const state = createInitialState();
    const agent = state.agents[0];
    const prompt = buildIntegrationPrompt({
      intent: "weekly",
      company: state.company!,
      agent,
      founderAsk: "Me diga o maior risco desta semana.",
      workItems: state.workItems,
      actionItems: state.actionItems,
      memoryEntries: state.memoryEntries,
      meetings: state.meetings,
    });

    expect(prompt).toContain(agent.name);
    expect(prompt).toContain(state.company!.name);
    expect(prompt).toContain("Founder ask:");
    expect(prompt).toContain("Me diga o maior risco desta semana.");
    expect(prompt).toContain("Current company goals:");
  });
});
