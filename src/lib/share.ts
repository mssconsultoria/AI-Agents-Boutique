import { getMeetingActionSummaries } from "./meetings";
import type {
  ActionItem,
  AgentProfile,
  Company,
  MeetingSession,
  RitualType,
  TranscriptTurn,
} from "../types";

interface SharedMeetingAction {
  id: string;
  ownerName: string;
  title: string;
  dueLabel: string;
  status: "open" | "done";
}

export interface SharedRitualSnapshot {
  version: 1;
  shareId: string;
  companyName: string;
  founderName: string;
  meeting: {
    id: string;
    ritualType: RitualType;
    startedAt: string;
    agenda: string[];
    summary: string;
    decisions: string[];
    notes: string[];
    actions: SharedMeetingAction[];
    transcript: Array<Pick<TranscriptTurn, "kind" | "speakerName" | "text">>;
  };
}

type SharedRitualSnapshotInput = Omit<SharedRitualSnapshot, "meeting"> & {
  meeting: Omit<SharedRitualSnapshot["meeting"], "actions"> & {
    actions?: SharedMeetingAction[];
  };
};

const SHARE_QUERY_PARAM = "share";

function createShareId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(16).slice(2, 10);
}

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function isTranscriptTurn(
  candidate: unknown,
): candidate is SharedRitualSnapshot["meeting"]["transcript"][number] {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const entry = candidate as Record<string, unknown>;

  return (
    typeof entry.kind === "string" &&
    typeof entry.speakerName === "string" &&
    typeof entry.text === "string"
  );
}

function isSharedMeetingAction(candidate: unknown): candidate is SharedMeetingAction {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const action = candidate as Record<string, unknown>;

  return (
    typeof action.id === "string" &&
    typeof action.ownerName === "string" &&
    typeof action.title === "string" &&
    typeof action.dueLabel === "string" &&
    (action.status === "open" || action.status === "done")
  );
}

function isSharedRitualSnapshot(candidate: unknown): candidate is SharedRitualSnapshotInput {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const snapshot = candidate as Record<string, unknown>;
  const meeting = snapshot.meeting as Record<string, unknown> | undefined;

  return (
    snapshot.version === 1 &&
    typeof snapshot.shareId === "string" &&
    typeof snapshot.companyName === "string" &&
    typeof snapshot.founderName === "string" &&
    Boolean(meeting) &&
    typeof meeting?.id === "string" &&
    typeof meeting?.ritualType === "string" &&
    typeof meeting?.startedAt === "string" &&
    Array.isArray(meeting?.agenda) &&
    Array.isArray(meeting?.decisions) &&
    Array.isArray(meeting?.notes) &&
    (meeting.actions === undefined ||
      (Array.isArray(meeting.actions) && meeting.actions.every(isSharedMeetingAction))) &&
    Array.isArray(meeting?.transcript) &&
    meeting.transcript.every(isTranscriptTurn) &&
    typeof meeting.summary === "string"
  );
}

function normalizeSharedRitualSnapshot(
  snapshot: SharedRitualSnapshotInput,
): SharedRitualSnapshot {
  return {
    ...snapshot,
    meeting: {
      ...snapshot.meeting,
      actions: snapshot.meeting.actions ?? [],
    },
  };
}

export function createSharedRitualSnapshot(
  company: Pick<Company, "name" | "founderName">,
  meeting: MeetingSession,
  actionItems: ActionItem[],
  agents: AgentProfile[],
): SharedRitualSnapshot {
  return {
    version: 1,
    shareId: createShareId(),
    companyName: company.name,
    founderName: company.founderName,
    meeting: {
      id: meeting.id,
      ritualType: meeting.ritualType,
      startedAt: meeting.startedAt,
      agenda: meeting.agenda,
      summary: meeting.summary,
      decisions: meeting.decisions,
      notes: meeting.notes,
      actions: getMeetingActionSummaries(meeting, actionItems, agents).map(
        ({ id, ownerName, title, dueLabel, status }) => ({
          id,
          ownerName,
          title,
          dueLabel,
          status,
        }),
      ),
      transcript: meeting.transcript.map(({ kind, speakerName, text }) => ({
        kind,
        speakerName,
        text,
      })),
    },
  };
}

export function buildSharedRitualUrl(
  snapshot: SharedRitualSnapshot,
  baseUrl = window.location.href,
) {
  const url = new URL(baseUrl);
  url.searchParams.set(SHARE_QUERY_PARAM, encodeBase64Url(JSON.stringify(snapshot)));

  return url.toString();
}

export function readSharedRitualFromUrl(
  href = typeof window === "undefined" ? "https://foundry.one" : window.location.href,
) {
  try {
    const url = new URL(href);
    const encoded = url.searchParams.get(SHARE_QUERY_PARAM);
    if (!encoded) {
      return null;
    }

    const parsed = JSON.parse(decodeBase64Url(encoded)) as unknown;
    return isSharedRitualSnapshot(parsed) ? normalizeSharedRitualSnapshot(parsed) : null;
  } catch {
    return null;
  }
}

export function stripSharedRitualFromUrl(
  href = typeof window === "undefined" ? "https://foundry.one" : window.location.href,
) {
  const url = new URL(href);
  url.searchParams.delete(SHARE_QUERY_PARAM);
  return url.toString();
}
