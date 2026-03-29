import { formatDateTime } from "../lib/format";
import type { SharedRitualSnapshot } from "../lib/share";

interface SharedRitualViewProps {
  recap: SharedRitualSnapshot;
  hasWorkspace: boolean;
  onExitShareMode: () => void;
}

export function SharedRitualView({
  recap,
  hasWorkspace,
  onExitShareMode,
}: SharedRitualViewProps) {
  return (
    <main className="launch-shell shared-shell">
      <section className="launch-copy panel-reveal">
        <p className="eyebrow">Shared ritual recap</p>
        <h1>{recap.companyName} runs its company in public rituals.</h1>
        <p>
          {recap.founderName} shared a read-only {recap.meeting.ritualType} recap with
          the meeting summary, decisions, action items, and transcript that shaped the next work
          loop.
        </p>

        <div className="shared-meta">
          <div className="signal-band">
            <span>Ritual</span>
            <strong>{recap.meeting.ritualType}</strong>
            <p>Structured operating cadence, not a one-off demo.</p>
          </div>
          <div className="signal-band">
            <span>Started</span>
            <strong>{formatDateTime(recap.meeting.startedAt)}</strong>
            <p>{recap.meeting.summary}</p>
          </div>
        </div>

        <div className="workspace-actions top-space">
          <button className="primary-button" onClick={onExitShareMode} type="button">
            {hasWorkspace ? "Open my workspace" : "Start my own company"}
          </button>
        </div>
      </section>

      <section className="workspace panel-reveal shared-recap-panel">
        <header className="workspace-header">
          <div>
            <p className="section-kicker">Meeting summary</p>
            <h2>{recap.meeting.summary}</h2>
          </div>
        </header>

        <section className="subsection dual-column">
          <div>
            <div className="section-heading">
              <div>
                <p className="section-kicker">Agenda</p>
                <h3>What the room was trying to resolve</h3>
              </div>
            </div>
            <ul className="quiet-list">
              {recap.meeting.agenda.map((agendaItem) => (
                <li key={agendaItem}>{agendaItem}</li>
              ))}
            </ul>

            <div className="section-heading top-space">
              <div>
                <p className="section-kicker">Decisions</p>
                <h3>What changed after the ritual</h3>
              </div>
            </div>
            <ul className="quiet-list">
              {recap.meeting.decisions.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>

            <div className="section-heading top-space">
              <div>
                <p className="section-kicker">Action items</p>
                <h3>What the ritual assigned next</h3>
              </div>
            </div>
            {recap.meeting.actions.length > 0 ? (
              <div className="list-stack">
                {recap.meeting.actions.map((action) => (
                  <article key={action.id} className="list-band">
                    <header>
                      <strong>{action.title}</strong>
                      <span>{action.status}</span>
                    </header>
                    <p>{action.ownerName}</p>
                    <div className="meta-row">
                      <span>{action.dueLabel}</span>
                      <span>{action.status === "done" ? "Completed" : "Open"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-copy">No follow-up actions were captured in this recap.</p>
            )}
          </div>

          <div>
            <div className="section-heading">
              <div>
                <p className="section-kicker">Notes</p>
                <h3>Operating memory captured</h3>
              </div>
            </div>
            <ul className="quiet-list">
              {recap.meeting.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="subsection">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Transcript</p>
              <h3>Turn-by-turn ritual output</h3>
            </div>
          </div>
          <div className="transcript-list">
            {recap.meeting.transcript.map((turn, index) => (
              <article key={`${turn.speakerName}-${index}`} className={`transcript-turn ${turn.kind}`}>
                <span>{turn.speakerName}</span>
                <p>{turn.text}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
