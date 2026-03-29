import { describe, expect, it } from "vitest";
import { createInitialState } from "./seed";
import {
  buildSharedRitualUrl,
  createSharedRitualSnapshot,
  readSharedRitualFromUrl,
  stripSharedRitualFromUrl,
} from "./share";

describe("ritual sharing", () => {
  it("roundtrips a shared ritual recap through the URL payload", () => {
    const state = createInitialState("Northstar Studio", "Marlow");
    const company = state.company;
    const meeting = state.meetings[0];

    expect(company).toBeTruthy();
    expect(meeting).toBeTruthy();

    const snapshot = createSharedRitualSnapshot(
      company!,
      meeting!,
      state.actionItems,
      state.agents,
    );
    const url = buildSharedRitualUrl(snapshot, "https://example.com/app");

    expect(readSharedRitualFromUrl(url)).toEqual(snapshot);
  });

  it("reads older share payloads that did not include action items", () => {
    const state = createInitialState("Northstar Studio", "Marlow");
    const company = state.company;
    const meeting = state.meetings[0];

    expect(company).toBeTruthy();
    expect(meeting).toBeTruthy();

    const legacySnapshot = {
      version: 1 as const,
      shareId: "legacy123",
      companyName: company!.name,
      founderName: company!.founderName,
      meeting: {
        id: meeting!.id,
        ritualType: meeting!.ritualType,
        startedAt: meeting!.startedAt,
        agenda: meeting!.agenda,
        summary: meeting!.summary,
        decisions: meeting!.decisions,
        notes: meeting!.notes,
        transcript: meeting!.transcript.map(({ kind, speakerName, text }) => ({
          kind,
          speakerName,
          text,
        })),
      },
    } as unknown as Parameters<typeof buildSharedRitualUrl>[0];
    const url = buildSharedRitualUrl(legacySnapshot, "https://example.com/app");

    expect(readSharedRitualFromUrl(url)?.meeting.actions).toEqual([]);
  });

  it("removes the share payload from a URL cleanly", () => {
    const url = "https://example.com/app?share=abc123&view=rituals";

    expect(stripSharedRitualFromUrl(url)).toBe("https://example.com/app?view=rituals");
  });
});
