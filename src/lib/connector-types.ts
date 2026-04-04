export type ConnectorId = "codex" | "openclaw" | "hermes";
export type ConnectorMode = "direct" | "terminal";
export type IntegrationIntent =
  | "direct_chat"
  | "1:1"
  | "daily"
  | "weekly"
  | "retro"
  | "lessons learned";

export interface ConnectorStatus {
  id: ConnectorId;
  label: string;
  description: string;
  available: boolean;
  directAvailable: boolean;
  terminalAvailable: boolean;
  detection: string;
  setupHint: string;
}

export interface TerminalBridgeStatus {
  available: boolean;
  appName: string;
  detection: string;
}

export interface ConnectorCatalogResponse {
  connectors: ConnectorStatus[];
  terminal: TerminalBridgeStatus;
}

export interface AgentConnectorAssignment {
  agentId: string;
  connectorId: ConnectorId;
  mode: ConnectorMode;
}

export interface ConnectorConfig {
  version: 1;
  assignments: AgentConnectorAssignment[];
}

export interface ExecuteConnectorRequest {
  connectorId: ConnectorId;
  mode: ConnectorMode;
  prompt: string;
  cwd: string;
  title: string;
}

export interface ExecuteConnectorResponse {
  ok: boolean;
  connectorId: ConnectorId;
  mode: ConnectorMode;
  commandPreview: string;
  launched?: boolean;
  output?: string;
  error?: string;
}
