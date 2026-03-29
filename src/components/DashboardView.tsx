import type {
  ActionItem,
  AgentProfile,
  AppState,
  ApprovalItem,
  ScheduledRitualPreview,
} from "../types";

interface DashboardViewProps {
  state: AppState;
  selectedAgent: AgentProfile;
  upcomingRituals: ScheduledRitualPreview[];
  approvals: ApprovalItem[];
  onRunWorkCycle: () => void;
  onStartMeeting: (ritualType: ScheduledRitualPreview["ritualType"], targetAgentId?: string) => void;
}

function healthLabel(blockers: number, approvals: number) {
  if (blockers === 0 && approvals <= 1) {
    return "Stable";
  }
  if (blockers <= 2 && approvals <= 3) {
    return "Watchful";
  }
  return "At risk";
}

function agentOpenActions(actionItems: ActionItem[], agentId: string) {
  return actionItems.filter(
    (action) => action.ownerAgentId === agentId && action.status === "open",
  ).length;
}

export function DashboardView({
  state,
  selectedAgent,
  upcomingRituals,
  approvals,
  onRunWorkCycle,
  onStartMeeting,
}: DashboardViewProps) {
  const blockers = state.workItems.flatMap((workItem) => workItem.blockers).length;
  const completedMeetings = state.meetings.length;
  const status = healthLabel(blockers, approvals.length);

  return (
    <section className="workspace panel-reveal">
      <header className="workspace-header">
        <div>
          <p className="section-kicker">Command deck</p>
          <h2>Founder cockpit</h2>
          <p className="workspace-copy">
            One company, one founder, three agent workers, and every decision routed through visible rituals and approvals.
          </p>
        </div>
        <div className="workspace-actions">
          <button className="secondary-button" onClick={onRunWorkCycle} type="button">
            Run work cycle
          </button>
          <button
            className="primary-button"
            onClick={() => onStartMeeting("1:1", selectedAgent.id)}
            type="button"
          >
            Start 1:1 with {selectedAgent.name.split(" ")[0]}
          </button>
        </div>
      </header>

      <section className="signal-grid">
        <article className="signal-band">
          <span>Company pulse</span>
          <strong>{status}</strong>
          <p>{blockers} blockers visible across the current work loop.</p>
        </article>
        <article className="signal-band">
          <span>Pending approvals</span>
          <strong>{approvals.length}</strong>
          <p>Major changes stay gated until the founder clears them.</p>
        </article>
        <article className="signal-band">
          <span>Meetings run</span>
          <strong>{completedMeetings}</strong>
          <p>Ritual history becomes the operating memory of the company.</p>
        </article>
        <article className="signal-band">
          <span>Projects in play</span>
          <strong>{state.company?.projects.length ?? 0}</strong>
          <p>Current scope stays focused on the cockpit, rituals, and memory.</p>
        </article>
      </section>

      <section className="subsection">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Launch rituals</p>
            <h3>Keep structured meetings one tap away</h3>
          </div>
        </div>
        <div className="ritual-launcher">
          {upcomingRituals.map((ritual) => (
            <button
              key={ritual.ritualType}
              className="ritual-launch-button"
              onClick={() =>
                onStartMeeting(
                  ritual.ritualType,
                  ritual.ritualType === "1:1" ? selectedAgent.id : undefined,
                )
              }
              type="button"
            >
              <strong>{ritual.ritualType}</strong>
              <p>{ritual.preview[0]}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="subsection dual-column">
        <div>
          <div className="section-heading">
            <div>
              <p className="section-kicker">Agent pulse</p>
              <h3>Who is carrying what right now</h3>
            </div>
          </div>
          <div className="list-stack">
            {state.agents.map((agent) => (
              <article key={agent.id} className="list-band">
                <header>
                  <strong>{agent.name}</strong>
                  <span>{agent.role}</span>
                </header>
                <p>{agent.currentFocus}</p>
                <div className="meta-row">
                  <span>{agent.status}</span>
                  <span>{agentOpenActions(state.actionItems, agent.id)} open actions</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div>
          <div className="section-heading">
            <div>
              <p className="section-kicker">Recent output</p>
              <h3>Artifacts and decisions worth scanning</h3>
            </div>
          </div>
          <div className="list-stack">
            {state.artifacts.slice(-4).reverse().map((artifact) => (
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
      </section>
    </section>
  );
}
