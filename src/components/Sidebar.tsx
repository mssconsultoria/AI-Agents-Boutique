import { useDeferredValue, useState } from "react";
import type { AgentProfile, Company, ViewMode } from "../types";
import { formatRelativeEnergy } from "../lib/format";

interface SidebarProps {
  company: Company;
  agents: AgentProfile[];
  selectedView: ViewMode;
  selectedAgentId: string;
  actionCountByAgent: Record<string, number>;
  onSelectView: (view: ViewMode) => void;
  onSelectAgent: (agentId: string) => void;
}

const VIEW_LABELS: Record<ViewMode, string> = {
  dashboard: "Command deck",
  chat: "1:1 lines",
  rituals: "Ritual rooms",
  work: "Work loop",
  integrations: "Live bridge",
};

export function Sidebar({
  company,
  agents,
  selectedView,
  selectedAgentId,
  actionCountByAgent,
  onSelectView,
  onSelectAgent,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredAgents = agents.filter((agent) => {
    const haystack = `${agent.name} ${agent.role} ${agent.department}`.toLowerCase();
    return haystack.includes(deferredQuery.toLowerCase());
  });

  return (
    <aside className="sidebar">
      <div className="brand-lockup panel-reveal">
        <p className="eyebrow">Single-company operating system</p>
        <h1>{company.name}</h1>
        <p className="mission-copy">{company.mission}</p>
      </div>

      <nav className="nav-stack panel-reveal">
        {(
          Object.entries(VIEW_LABELS) as Array<[ViewMode, string]>
        ).map(([view, label]) => (
          <button
            key={view}
            className={`nav-button ${selectedView === view ? "is-active" : ""}`}
            onClick={() => onSelectView(view)}
            type="button"
          >
            <span>{label}</span>
            <small>{view === "chat" ? "Direct founder-to-agent talk" : ""}</small>
          </button>
        ))}
      </nav>

      <section className="goal-strip panel-reveal">
        <p className="section-kicker">Company goals</p>
        <ul className="quiet-list">
          {company.currentGoals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>

      <section className="agent-roster panel-reveal">
        <div className="section-heading">
          <p className="section-kicker">Workers</p>
          <input
            aria-label="Search workers"
            className="search-field"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find an agent"
            value={query}
          />
        </div>

        <div className="roster-list">
          {filteredAgents.map((agent) => (
            <button
              key={agent.id}
              className={`agent-button ${selectedAgentId === agent.id ? "is-selected" : ""}`}
              onClick={() => onSelectAgent(agent.id)}
              type="button"
            >
              <div>
                <strong>{agent.name}</strong>
                <p>{agent.role}</p>
              </div>
              <div className="agent-meta">
                <span className={`status-dot status-${agent.status}`} />
                <small>{formatRelativeEnergy(agent.energy)}</small>
              </div>
              <div className="agent-subrow">
                <span>{agent.department}</span>
                <span>{actionCountByAgent[agent.id] ?? 0} open actions</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
