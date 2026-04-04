import { useMemo, useState } from "react";
import { executeConnector } from "../lib/integration-client";
import type {
  AgentConnectorAssignment,
  ConnectorCatalogResponse,
  ConnectorId,
  ConnectorMode,
  ExecuteConnectorResponse,
  IntegrationIntent,
} from "../lib/connector-types";
import {
  buildIntegrationPrompt,
  getAssignmentForAgent,
} from "../lib/integration-prompts";
import type {
  ActionItem,
  AgentProfile,
  Company,
  MeetingSession,
  MemoryEntry,
  WorkItem,
} from "../types";

interface IntegrationResult extends ExecuteConnectorResponse {
  agentId: string;
  agentName: string;
}

interface IntegrationsViewProps {
  company: Company;
  agents: AgentProfile[];
  selectedAgentId: string;
  workItems: WorkItem[];
  actionItems: ActionItem[];
  memoryEntries: MemoryEntry[];
  meetings: MeetingSession[];
  connectorCatalog: ConnectorCatalogResponse | null;
  connectorConfig: {
    assignments: AgentConnectorAssignment[];
  };
  isRefreshing: boolean;
  onRefresh: () => void;
  onUpdateAssignment: (agentId: string, connectorId: ConnectorId, mode: ConnectorMode) => void;
}

const INTENT_OPTIONS: Array<{ id: IntegrationIntent; label: string; description: string }> = [
  {
    id: "direct_chat",
    label: "Direct chat",
    description: "One-off founder question to the selected worker.",
  },
  {
    id: "1:1",
    label: "1:1",
    description: "Selected worker responds like a founder 1:1.",
  },
  {
    id: "daily",
    label: "Daily",
    description: "All workers respond in a standup format.",
  },
  {
    id: "weekly",
    label: "Weekly",
    description: "All workers answer with priorities, risks, and asks.",
  },
  {
    id: "retro",
    label: "Retro",
    description: "All workers answer with wins, pain, and improvements.",
  },
  {
    id: "lessons learned",
    label: "Lessons learned",
    description: "All workers extract reusable learning and guardrails.",
  },
];

export function IntegrationsView({
  company,
  agents,
  selectedAgentId,
  workItems,
  actionItems,
  memoryEntries,
  meetings,
  connectorCatalog,
  connectorConfig,
  isRefreshing,
  onRefresh,
  onUpdateAssignment,
}: IntegrationsViewProps) {
  const [intent, setIntent] = useState<IntegrationIntent>("direct_chat");
  const [founderAsk, setFounderAsk] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<IntegrationResult[]>([]);
  const statusById = useMemo(
    () =>
      Object.fromEntries(
        (connectorCatalog?.connectors ?? []).map((status) => [status.id, status]),
      ),
    [connectorCatalog],
  );

  const targetAgents =
    intent === "direct_chat" || intent === "1:1"
      ? agents.filter((agent) => agent.id === selectedAgentId)
      : agents;

  async function runScenario(modeOverride?: ConnectorMode) {
    setIsRunning(true);
    const nextResults: IntegrationResult[] = [];

    for (const agent of targetAgents) {
      const assignment = getAssignmentForAgent(connectorConfig.assignments, agent.id);
      if (!assignment) {
        nextResults.push({
          ok: false,
          agentId: agent.id,
          agentName: agent.name,
          connectorId: "codex",
          mode: "direct",
          commandPreview: "",
          error: "No connector assignment configured for this agent.",
        });
        continue;
      }

      const requestMode = modeOverride ?? assignment.mode;
      const prompt = buildIntegrationPrompt({
        intent,
        company,
        agent,
        founderAsk,
        workItems,
        actionItems,
        memoryEntries,
        meetings,
      });

      try {
        const result = await executeConnector({
          connectorId: assignment.connectorId,
          mode: requestMode,
          prompt,
          cwd: ".",
          title: `${company.name} ${intent} - ${agent.name}`,
        });

        nextResults.push({
          ...result,
          agentId: agent.id,
          agentName: agent.name,
        });
      } catch (error) {
        nextResults.push({
          ok: false,
          agentId: agent.id,
          agentName: agent.name,
          connectorId: assignment.connectorId,
          mode: requestMode,
          commandPreview: "",
          error: error instanceof Error ? error.message : "Connector request failed.",
        });
      }
    }

    setResults(nextResults);
    setIsRunning(false);
  }

  return (
    <section className="workspace panel-reveal">
      <header className="workspace-header">
        <div>
          <p className="section-kicker">Live bridge</p>
          <h2>Connect workers to real local agents</h2>
          <p className="workspace-copy">
            Route Product, Engineering, and Design workers into Codex, OpenClaw, Hermes, and Terminal-driven runs on this Mac.
          </p>
        </div>
        <div className="workspace-actions">
          <button className="secondary-button" onClick={onRefresh} type="button">
            {isRefreshing ? "Refreshing..." : "Refresh connectors"}
          </button>
          <button
            className="primary-button"
            disabled={isRunning}
            onClick={() => runScenario()}
            type="button"
          >
            {isRunning ? "Running..." : "Run with assigned mode"}
          </button>
        </div>
      </header>

      <section className="subsection">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Environment</p>
            <h3>Detected connectors on this machine</h3>
          </div>
        </div>
        <div className="signal-grid connector-grid">
          {(connectorCatalog?.connectors ?? []).map((connector) => (
            <article key={connector.id} className="signal-band">
              <span>{connector.label}</span>
              <strong>{connector.available ? "Ready" : "Setup needed"}</strong>
              <p>{connector.detection}</p>
              <p>{connector.setupHint}</p>
              <div className="meta-row">
                <span>Direct: {connector.directAvailable ? "yes" : "no"}</span>
                <span>Terminal: {connector.terminalAvailable ? "yes" : "no"}</span>
              </div>
            </article>
          ))}
          <article className="signal-band">
            <span>Mac terminal bridge</span>
            <strong>{connectorCatalog?.terminal.available ? connectorCatalog.terminal.appName : "Unavailable"}</strong>
            <p>{connectorCatalog?.terminal.detection ?? "Waiting for local API status."}</p>
          </article>
        </div>
      </section>

      <section className="subsection dual-column">
        <div>
          <div className="section-heading">
            <div>
              <p className="section-kicker">Assignments</p>
              <h3>Pick the live runner for each worker</h3>
            </div>
          </div>
          <div className="list-stack">
            {agents.map((agent) => {
              const assignment = getAssignmentForAgent(connectorConfig.assignments, agent.id);
              const connectorStatus = assignment ? statusById[assignment.connectorId] : null;

              return (
                <article key={agent.id} className="list-band">
                  <header>
                    <strong>{agent.name}</strong>
                    <span>{agent.role}</span>
                  </header>
                  <div className="connector-assignment-row">
                    <label className="field-row compact-field">
                      <span>Connector</span>
                      <select
                        onChange={(event) =>
                          onUpdateAssignment(
                            agent.id,
                            event.target.value as ConnectorId,
                            assignment?.mode ?? "direct",
                          )
                        }
                        value={assignment?.connectorId ?? "codex"}
                      >
                        <option value="codex">Codex</option>
                        <option value="openclaw">OpenClaw</option>
                        <option value="hermes">Hermes</option>
                      </select>
                    </label>
                    <label className="field-row compact-field">
                      <span>Mode</span>
                      <select
                        onChange={(event) =>
                          onUpdateAssignment(
                            agent.id,
                            assignment?.connectorId ?? "codex",
                            event.target.value as ConnectorMode,
                          )
                        }
                        value={assignment?.mode ?? "direct"}
                      >
                        <option value="direct">Direct</option>
                        <option value="terminal">Mac terminal</option>
                      </select>
                    </label>
                  </div>
                  <p>
                    {connectorStatus
                      ? `${connectorStatus.label}: ${connectorStatus.setupHint}`
                      : "No connector status yet."}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div>
          <div className="section-heading">
            <div>
              <p className="section-kicker">Scenario runner</p>
              <h3>Drive live rituals with current company context</h3>
            </div>
          </div>
          <div className="list-band live-runner">
            <label className="field-row compact-field">
              <span>Interaction type</span>
              <select
                onChange={(event) => setIntent(event.target.value as IntegrationIntent)}
                value={intent}
              >
                {INTENT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="workspace-copy">
              {INTENT_OPTIONS.find((option) => option.id === intent)?.description}
            </p>
            <p className="workspace-copy">
              Target:{" "}
              {targetAgents.length === 1
                ? targetAgents[0]?.name
                : `${targetAgents.length} workers in parallel`}
            </p>
            <label className="field-row">
              <span>Founder ask</span>
              <textarea
                onChange={(event) => setFounderAsk(event.target.value)}
                placeholder="Add a specific founder question, risk, or decision request."
                rows={5}
                value={founderAsk}
              />
            </label>
            <div className="workspace-actions">
              <button
                className="secondary-button"
                disabled={isRunning}
                onClick={() => runScenario("terminal")}
                type="button"
              >
                Open in Mac terminal
              </button>
              <button
                className="primary-button"
                disabled={isRunning}
                onClick={() => runScenario()}
                type="button"
              >
                {isRunning ? "Running..." : "Run live now"}
              </button>
            </div>
          </div>

          <div className="section-heading top-space">
            <div>
              <p className="section-kicker">Results</p>
              <h3>Latest live outputs</h3>
            </div>
          </div>
          <div className="list-stack">
            {results.length === 0 ? (
              <p className="empty-copy">
                No live runs yet. Pick a ritual or chat scenario and dispatch it.
              </p>
            ) : (
              results.map((result, index) => (
                <article
                  key={`${result.agentId}-${result.connectorId}-${result.mode}-${index}`}
                  className="list-band"
                >
                  <header>
                    <strong>{result.agentName}</strong>
                    <span>
                      {result.connectorId} / {result.mode}
                    </span>
                  </header>
                  <p>{result.ok ? result.output ?? "Command launched." : result.error}</p>
                  {result.commandPreview ? (
                    <pre className="command-preview">{result.commandPreview}</pre>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
