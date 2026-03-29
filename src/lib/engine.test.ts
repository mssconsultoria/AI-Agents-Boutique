import { describe, expect, it } from "vitest";
import {
  getUpcomingRituals,
  reviewApproval,
  runWorkCycle,
  sendFounderMessage,
  startMeeting,
} from "./engine";
import { createInitialState } from "./seed";

describe("agent operating system engine", () => {
  it("seeds one company with product, engineering, and design workers", () => {
    const state = createInitialState("Northstar Studio", "Marlow");

    expect(state.company?.name).toBe("Northstar Studio");
    expect(state.company?.founderName).toBe("Marlow");
    expect(state.agents).toHaveLength(3);
    expect(state.company?.departments).toEqual(["Product", "Engineering", "Design"]);
    expect(getUpcomingRituals(state).length).toBeGreaterThan(0);
  });

  it("grounds direct chat replies in the worker's queue and blockers", () => {
    const state = createInitialState();
    const next = sendFounderMessage(
      state,
      "agent-jonah",
      "What is your biggest blocker right now?",
    );
    const thread = next.threads.find((candidate) => candidate.agentId === "agent-jonah");
    const lastMessage = thread?.messages.at(-1);

    expect(lastMessage?.sender).toBe("agent");
    expect(lastMessage?.text.toLowerCase()).toContain("blocker");
    expect(lastMessage?.text.toLowerCase()).toContain("major change");
  });

  it("creates structured ritual output with actions and memory updates", () => {
    const state = createInitialState();
    const next = startMeeting(state, "daily");
    const latestMeeting = next.meetings.at(-1);

    expect(latestMeeting?.ritualType).toBe("daily");
    expect(latestMeeting?.transcript.length).toBeGreaterThan(3);
    expect(next.actionItems.length).toBeGreaterThan(state.actionItems.length);
    expect(next.memoryEntries.length).toBeGreaterThan(state.memoryEntries.length);
  });

  it("requires and processes founder approval for a major artifact change", () => {
    const state = createInitialState();
    const approved = reviewApproval(state, "approval-design-cockpit", "approved");
    const workItem = approved.workItems.find(
      (candidate) => candidate.id === "work-design-cockpit",
    );
    const approval = approved.approvals.find(
      (candidate) => candidate.id === "approval-design-cockpit",
    );

    expect(approval?.status).toBe("approved");
    expect(workItem?.status).toBe("done");
    expect(workItem?.lastOutcome.toLowerCase()).toContain("approved");
  });

  it("advances the work loop and creates new artifacts or review pressure", () => {
    const state = createInitialState();
    const next = runWorkCycle(state);

    expect(next.artifacts.length).toBeGreaterThanOrEqual(state.artifacts.length);
    expect(next.approvals.length).toBeGreaterThanOrEqual(state.approvals.length);
    expect(next.memoryEntries.length).toBeGreaterThan(state.memoryEntries.length);
  });
});
