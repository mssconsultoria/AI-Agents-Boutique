export type AnalyticsEventName = "ritual_share_clicked" | "ritual_share_opened";

interface AnalyticsEvent {
  id: string;
  name: AnalyticsEventName;
  createdAt: string;
  properties: Record<string, string>;
}

const STORAGE_KEY = "foundry-one-events-v1";
const MAX_EVENTS = 100;

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as AnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function trackEvent(
  name: AnalyticsEventName,
  properties: Record<string, string | number | boolean> = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  const event: AnalyticsEvent = {
    id: createEventId(),
    name,
    createdAt: new Date().toISOString(),
    properties: Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [key, String(value)]),
    ),
  };

  try {
    const nextEvents = [...readEvents(), event].slice(-MAX_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
  } catch {
    // Ignore persistence failures so tracking never blocks the product flow.
  }

  if (typeof CustomEvent !== "undefined") {
    window.dispatchEvent(new CustomEvent("foundry:event", { detail: event }));
  }
}
