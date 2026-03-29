import type {
  ActionItem,
  ApprovalItem,
  MeetingSession,
  ScheduledRitualPreview,
} from "../types";
import { formatDateTime } from "../lib/format";

interface ContextRailProps {
  upcomingRituals: ScheduledRitualPreview[];
  approvals: ApprovalItem[];
  recentMeetings: MeetingSession[];
  actionItems: ActionItem[];
  onReviewApproval: (approvalId: string, decision: "approved" | "rejected") => void;
  onToggleActionItem: (actionId: string) => void;
}

export function ContextRail({
  upcomingRituals,
  approvals,
  recentMeetings,
  actionItems,
  onReviewApproval,
  onToggleActionItem,
}: ContextRailProps) {
  const openActions = actionItems.filter((action) => action.status === "open").slice(0, 4);
  const recentDecisions = recentMeetings.flatMap((meeting) =>
    meeting.decisions.map((decision) => ({
      id: `${meeting.id}-${decision}`,
      ritualType: meeting.ritualType,
      decision,
    })),
  );

  return (
    <aside className="context-rail">
      <section className="context-section panel-reveal">
        <div className="section-heading">
          <p className="section-kicker">Upcoming rituals</p>
          <span>{upcomingRituals.length} queued</span>
        </div>
        <div className="ritual-preview-list">
          {upcomingRituals.map((ritual) => (
            <article key={`${ritual.ritualType}-${ritual.nextRunAt}`} className="rail-band">
              <header>
                <strong>{ritual.ritualType}</strong>
                <time>{formatDateTime(ritual.nextRunAt)}</time>
              </header>
              <p>{ritual.cadenceLabel}</p>
              <ul className="quiet-list">
                {ritual.preview.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="context-section panel-reveal">
        <div className="section-heading">
          <p className="section-kicker">Approval queue</p>
          <span>{approvals.length} pending</span>
        </div>
        <div className="approval-list">
          {approvals.length === 0 ? (
            <p className="empty-copy">No risky changes are waiting on the founder.</p>
          ) : (
            approvals.map((approval) => (
              <article key={approval.id} className="rail-band">
                <header>
                  <strong>{approval.title}</strong>
                  <time>{formatDateTime(approval.createdAt)}</time>
                </header>
                <p>{approval.description}</p>
                <div className="split-actions">
                  <button
                    className="secondary-button"
                    onClick={() => onReviewApproval(approval.id, "rejected")}
                    type="button"
                  >
                    Reject
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => onReviewApproval(approval.id, "approved")}
                    type="button"
                  >
                    Approve
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="context-section panel-reveal">
        <div className="section-heading">
          <p className="section-kicker">Open actions</p>
          <span>{openActions.length} visible</span>
        </div>
        <div className="action-list">
          {openActions.map((action) => (
            <label key={action.id} className="action-row">
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
      </section>

      <section className="context-section panel-reveal">
        <div className="section-heading">
          <p className="section-kicker">Recent decisions</p>
          <span>Latest rituals</span>
        </div>
        <ul className="decision-list">
          {recentDecisions.slice(-6).reverse().map((decision) => (
            <li key={decision.id}>
              <span>{decision.ritualType}</span>
              <p>{decision.decision}</p>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
