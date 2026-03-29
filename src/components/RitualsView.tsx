import { useDeferredValue, useEffect, useState } from "react";
import { getMeetingActionSummaries } from "../lib/meetings";
import type {
  ActionItem,
  AgentProfile,
  Company,
  MeetingSession,
  RitualType,
  ScheduledRitualPreview,
} from "../types";
import { trackEvent } from "../lib/analytics";
import { formatDateTime } from "../lib/format";
import { buildSharedRitualUrl, createSharedRitualSnapshot } from "../lib/share";

interface RitualsViewProps {
  actionItems: ActionItem[];
  company: Company;
  agents: AgentProfile[];
  selectedAgentId: string;
  upcomingRituals: ScheduledRitualPreview[];
  meetings: MeetingSession[];
  onStartMeeting: (ritualType: RitualType, targetAgentId?: string) => void;
}

type ShareState =
  | {
      status: "idle";
      meetingId: null;
      link: "";
      message: "";
    }
  | {
      status: "success" | "error";
      meetingId: string;
      link: string;
      message: string;
    };

export function RitualsView({
  actionItems,
  company,
  agents,
  selectedAgentId,
  upcomingRituals,
  meetings,
  onStartMeeting,
}: RitualsViewProps) {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(
    meetings.at(-1)?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [shareState, setShareState] = useState<ShareState>({
    status: "idle",
    meetingId: null,
    link: "",
    message: "",
  });
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredMeetings = meetings.filter((meeting) => {
    if (!normalizedQuery) {
      return true;
    }

    const participants = meeting.participantIds
      .map((participantId) => agents.find((agent) => agent.id === participantId)?.name)
      .filter(Boolean)
      .join(" ");
    const actions = getMeetingActionSummaries(meeting, actionItems, agents)
      .map((action) => `${action.ownerName} ${action.title} ${action.dueLabel} ${action.status}`)
      .join(" ");
    const haystack = [
      meeting.ritualType,
      participants,
      meeting.summary,
      ...meeting.agenda,
      ...meeting.decisions,
      ...meeting.notes,
      actions,
      ...meeting.transcript.map((turn) => `${turn.speakerName} ${turn.text}`),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
  const filteredMeetingSignature = filteredMeetings.map((meeting) => meeting.id).join("|");

  useEffect(() => {
    setActiveMeetingId(meetings.at(-1)?.id ?? null);
  }, [meetings]);

  useEffect(() => {
    if (!filteredMeetings.some((meeting) => meeting.id === activeMeetingId)) {
      setActiveMeetingId(filteredMeetings.at(-1)?.id ?? null);
    }
  }, [activeMeetingId, filteredMeetingSignature, filteredMeetings]);

  const activeMeeting =
    filteredMeetings.find((meeting) => meeting.id === activeMeetingId) ?? filteredMeetings.at(-1);
  const activeMeetingActions = activeMeeting
    ? getMeetingActionSummaries(activeMeeting, actionItems, agents)
    : [];
  const activeShare =
    shareState.status === "idle" || shareState.meetingId !== activeMeeting?.id ? null : shareState;

  async function handleShare(meeting: MeetingSession) {
    const snapshot = createSharedRitualSnapshot(company, meeting, actionItems, agents);
    const link = buildSharedRitualUrl(snapshot);
    const currentNavigator = typeof navigator === "undefined" ? undefined : navigator;
    const supportsShare = typeof currentNavigator?.share === "function";
    const supportsClipboard = typeof currentNavigator?.clipboard?.writeText === "function";
    const channel = supportsShare ? "system_share" : "clipboard";

    trackEvent("ritual_share_clicked", {
      shareId: snapshot.shareId,
      meetingId: meeting.id,
      ritualType: meeting.ritualType,
      channel,
    });

    try {
      if (supportsShare && currentNavigator) {
        await currentNavigator.share({
          title: `${company.name} ${meeting.ritualType} recap`,
          text: meeting.summary,
          url: link,
        });

        setShareState({
          status: "success",
          meetingId: meeting.id,
          link,
          message: "Recap shared. Anyone with the link gets a read-only ritual view.",
        });
        return;
      }

      if (supportsClipboard && currentNavigator) {
        await currentNavigator.clipboard.writeText(link);

        setShareState({
          status: "success",
          meetingId: meeting.id,
          link,
          message: "Recap link copied. It opens a read-only ritual view.",
        });
        return;
      }

      setShareState({
        status: "error",
        meetingId: meeting.id,
        link,
        message: "Clipboard access is unavailable here. Copy the link manually.",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setShareState({
        status: "error",
        meetingId: meeting.id,
        link,
        message: "Share failed, but the recap link is ready to copy manually.",
      });
    }
  }

  return (
    <section className="workspace panel-reveal">
      <header className="workspace-header">
        <div>
          <p className="section-kicker">Ritual rooms</p>
          <h2>Facilitated operating cadence</h2>
          <p className="workspace-copy">
            Every meeting is turn-based, summarized, and pushed back into company memory with explicit owners.
          </p>
        </div>
      </header>

      <section className="subsection">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Start now</p>
            <h3>Run any ritual on demand</h3>
          </div>
        </div>
        <div className="ritual-launcher">
          {upcomingRituals.map((ritual) => (
            <article key={ritual.ritualType} className="ritual-room">
              <div>
                <strong>{ritual.ritualType}</strong>
                <p>{ritual.cadenceLabel}</p>
                <ul className="quiet-list">
                  {ritual.preview.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              {ritual.ritualType === "1:1" ? (
                <div className="one-on-one-controls">
                  <div className="agent-pill-row">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        className={`pill-button ${selectedAgentId === agent.id ? "is-selected" : ""}`}
                        onClick={() => onStartMeeting("1:1", agent.id)}
                        type="button"
                      >
                        {agent.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  className="primary-button"
                  onClick={() => onStartMeeting(ritual.ritualType)}
                  type="button"
                >
                  Start {ritual.ritualType}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="subsection dual-column">
        <div>
          <div className="section-heading">
            <div>
              <p className="section-kicker">History</p>
              <h3>Recent ritual sessions</h3>
            </div>
            <input
              aria-label="Search ritual history"
              className="search-field"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transcripts, decisions, notes, or follow-ups"
              value={query}
            />
          </div>
          <div className="list-stack">
            {filteredMeetings.length > 0 ? (
              filteredMeetings.slice().reverse().map((meeting) => (
                <button
                  key={meeting.id}
                  className={`list-band selectable-band ${activeMeeting?.id === meeting.id ? "is-selected" : ""}`}
                  onClick={() => setActiveMeetingId(meeting.id)}
                  type="button"
                >
                  <header>
                    <strong>{meeting.ritualType}</strong>
                    <span>{formatDateTime(meeting.startedAt)}</span>
                  </header>
                  <p>{meeting.summary}</p>
                  <div className="meta-row">
                    <span>{meeting.decisions.length} decisions</span>
                    <span>{meeting.actionItemIds.length} action items</span>
                  </div>
                </button>
              ))
            ) : (
              <p className="empty-copy">
                No rituals match this search yet. Try a broader term or clear the filter.
              </p>
            )}
          </div>
        </div>

        <div>
          {activeMeeting ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Transcript</p>
                  <h3>{activeMeeting.ritualType} details</h3>
                </div>
              </div>
              <div className="transcript-list">
                {activeMeeting.transcript.map((turn) => (
                  <article key={turn.id} className={`transcript-turn ${turn.kind}`}>
                    <span>{turn.speakerName}</span>
                    <p>{turn.text}</p>
                  </article>
                ))}
              </div>

              <div className="section-heading top-space">
                <div>
                  <p className="section-kicker">Outputs</p>
                  <h3>Decisions, follow-ups, and notes</h3>
                </div>
              </div>
              <section className="dual-column">
                <div>
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">Decisions</p>
                      <h3>What changed in the room</h3>
                    </div>
                  </div>
                  <ul className="quiet-list">
                    {activeMeeting.decisions.map((decision) => (
                      <li key={decision}>{decision}</li>
                    ))}
                  </ul>

                  <div className="section-heading top-space">
                    <div>
                      <p className="section-kicker">Action items</p>
                      <h3>Who owes what next</h3>
                    </div>
                  </div>
                  {activeMeetingActions.length > 0 ? (
                    <div className="list-stack">
                      {activeMeetingActions.map((action) => (
                        <article key={action.id} className="list-band">
                          <header>
                            <strong>{action.title}</strong>
                            <span>{action.status}</span>
                          </header>
                          <p>{action.ownerName}</p>
                          <div className="meta-row">
                            <span>{action.dueLabel}</span>
                            <span>
                              {action.status === "done" ? "Marked complete" : "Still open"}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-copy">No follow-up actions were captured for this ritual.</p>
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
                    {activeMeeting.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="share-strip top-space">
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">Share recap</p>
                    <h3>Let someone inspect this ritual in one click</h3>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => handleShare(activeMeeting)}
                    type="button"
                  >
                    Share this recap
                  </button>
                </div>
                <p className="workspace-copy">
                  Generate a read-only link with the summary, decisions, action items, notes, and
                  transcript for this ritual.
                </p>

                {activeShare ? (
                  <div
                    className={`share-feedback ${activeShare.status === "error" ? "is-error" : "is-success"}`}
                  >
                    <p>{activeShare.message}</p>
                    <input
                      aria-label="Share recap link"
                      className="share-link-field"
                      readOnly
                      value={activeShare.link}
                    />
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <p className="empty-copy">
              Pick a ritual from the history to inspect its transcript and outputs.
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
