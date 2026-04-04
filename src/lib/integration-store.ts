import type {
  AgentConnectorAssignment,
  ConnectorConfig,
  ConnectorId,
  ConnectorMode,
} from "./connector-types";
import type { AgentProfile } from "../types";

const STORAGE_KEY = "foundry-one-connectors-v1";

function defaultConnectorForRole(role: string): ConnectorId {
  if (role.toLowerCase().includes("product")) {
    return "openclaw";
  }

  if (role.toLowerCase().includes("engineer")) {
    return "codex";
  }

  return "hermes";
}

function defaultModeForConnector(connectorId: ConnectorId): ConnectorMode {
  return connectorId === "codex" ? "direct" : "terminal";
}

function createDefaultAssignments(agents: AgentProfile[]): AgentConnectorAssignment[] {
  return agents.map((agent) => {
    const connectorId = defaultConnectorForRole(agent.role);

    return {
      agentId: agent.id,
      connectorId,
      mode: defaultModeForConnector(connectorId),
    };
  });
}

function normalizeConfig(config: ConnectorConfig | null, agents: AgentProfile[]): ConnectorConfig {
  const defaults = createDefaultAssignments(agents);
  if (!config || config.version !== 1) {
    return {
      version: 1,
      assignments: defaults,
    };
  }

  const assignments = agents.map((agent) => {
    const existing = config.assignments.find((assignment) => assignment.agentId === agent.id);
    return existing ?? defaults.find((assignment) => assignment.agentId === agent.id)!;
  });

  return {
    version: 1,
    assignments,
  };
}

export function loadConnectorConfig(agents: AgentProfile[]): ConnectorConfig {
  if (typeof window === "undefined") {
    return normalizeConfig(null, agents);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return normalizeConfig(null, agents);
    }

    const parsed = JSON.parse(raw) as ConnectorConfig;
    return normalizeConfig(parsed, agents);
  } catch {
    return normalizeConfig(null, agents);
  }
}

export function saveConnectorConfig(config: ConnectorConfig) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
