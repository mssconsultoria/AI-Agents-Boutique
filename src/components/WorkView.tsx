import type { ActionItem, AgentProfile, ApprovalItem, Artifact, WorkItem } from "../types";

interface WorkViewProps {
  agents: AgentProfile[];
  workItems: WorkItem[];
  artifacts: Artifact[];
  actionItems: ActionItem[];
  approvals: ApprovalItem[];
  onRunWorkCycle: () => void;
  onToggleActionItem: (actionId: string) => void;
}

function queueForAgent(workItems: WorkItem[], actions: ActionItem[], agentId: string) {
  return {
    work: workItems.filter((item) => item.ownerAgentId === agentId),
    actions: actions.filter((item) => item.ownerAgentId === agentId),
  };
}

export function WorkView({
  agents,
  workItems,
  artifacts,
  actionItems,
  approvals,
  onRunWorkCycle,
  onToggleActionItem,
}: WorkViewProps) {
  return (
    <section className="workspace panel-reveal">
      <header className="workspace-header">
        <div>
          <p className="section-kicker">Work loop</p>
          <h2>Execution between rituals</h2>
          <p className="workspace-copy">
            Agents plan, write, review, and surface anything risky into the founder approval queue before it becomes default behavior.
          </p>
        </div>
        <div className="workspace-actions">
          <button className="primary-button" onClick={onRunWorkCycle} type="button">
            Advance the work loop
          </button>
        </div>
      </header>

      <section className="subsection">
        <div className="section-heading">
          <div>
            <p className="section-kicker">By worker</p>
            <h3>Active queues and ritual debt</h3>
          </div>
        </div>
        <div className="work-grid">
          {agents.map((agent) => {
            const queue = queueForAgent(workItems, actionItems, agent.id);
            return (
              <article key={agent.id} className="work-lane">
                <header>
                  <strong>{agent.name}</strong>
                  <span>{agent.role}</span>
                </header>
                <div className="lane-stack">
                  {queue.work.map((item) => (
                    <div key={item.id} className="lane-band">
                      <strong>{item.title}</strong>
                      <p>{item.lastOutcome}</p>
                      <div className="meta-row">
                        <span>{item.status}</span>
                        <span>{item.project}</span>
                      </div>
                      {item.commitments.length > 0 ? (
                        <ul className="quiet-list compact-list">
                          {item.commitments.slice(0, 3).map((commitment) => (
                            <li key={commitment}>{commitment}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                  {queue.actions.map((action) => (
                    <label key={action.id} className="action-row lane-band">
                      <input
                        checked={action.status === "done"}
                        onChange={() => onToggleActionItem(action.id)}
                        type="checkbox"
                      />
                      <div>
                        <strong>{action.title}</strong>
                        <p>{action.dueLabel}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="subsection dual-column">
        <div>
          <div className="section-heading">
            <div>
              <p className="section-kicker">Latest artifacts</p>
              <h3>What agents have produced recently</h3>
            </div>
          </div>
          <div className="list-stack">
            {artifacts.slice(-6).reverse().map((artifact) => (
              <article key={artifact.id} className="list-band">
                <header>
                  <strong>{artifact.type}</strong>
                  <span>{artifact.createdAt.slice(11, 16)}</span>
                </header>
                <p>{artifact.summary}</p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <div className="section-heading">
            <div>
              <p className="section-kicker">Approval posture</p>
              <h3>What still needs the founder</h3>
            </div>
          </div>
          <div className="list-stack">
            {approvals.map((approval) => (
              <article key={approval.id} className="list-band">
                <header>
                  <strong>{approval.title}</strong>
                  <span>{approval.status}</span>
                </header>
                <p>{approval.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
