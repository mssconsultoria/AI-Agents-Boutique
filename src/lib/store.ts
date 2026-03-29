import { createEmptyState } from "./seed";
import type { AppState } from "../types";

const STORAGE_KEY = "foundry-one-state-v1";

export function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyState();
  }

  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.version || parsed.version !== 1) {
      return createEmptyState();
    }

    return parsed;
  } catch {
    return createEmptyState();
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
