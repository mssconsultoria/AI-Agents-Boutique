import { startTransition, useEffect, useReducer, useState } from "react";
import { ChatView } from "./components/ChatView";
import { ContextRail } from "./components/ContextRail";
import { DashboardView } from "./components/DashboardView";
import { RitualsView } from "./components/RitualsView";
import { SharedRitualView } from "./components/SharedRitualView";
import { Sidebar } from "./components/Sidebar";
import { WorkView } from "./components/WorkView";
import { trackEvent } from "./lib/analytics";
import {
  getUpcomingRituals,
  resetWorkspace,
  reviewApproval,
  runWorkCycle,
  sendFounderMessage,
  startMeeting,
  toggleActionItem,
} from "./lib/engine";
import { DEFAULT_COMPANY_NAME, DEFAULT_FOUNDER_NAME } from "./lib/seed";
import { readSharedRitualFromUrl, stripSharedRitualFromUrl } from "./lib/share";
import { loadState, saveState } from "./lib/store";
import type { AppState, RitualType, ViewMode } from "./types";

type Action =
  | {
      type: "initialize";
      companyName: string;
      founderName: string;
    }
  | {
      type: "send-message";
      agentId: string;
      text: string;
    }
  | {
      type: "start-meeting";
      ritualType: RitualType;
      targetAgentId?: string;
    }
  | {
      type: "run-work-cycle";
    }
  | {
      type: "review-approval";
      approvalId: string;
      decision: "approved" | "rejected";
    }
  | {
      type: "toggle-action";
      actionId: string;
    };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "initialize":
      return resetWorkspace(action.companyName, action.founderName);
    case "send-message":
      return sendFounderMessage(state, action.agentId, action.text);
    case "start-meeting":
      return startMeeting(state, action.ritualType, action.targetAgentId);
    case "run-work-cycle":
      return runWorkCycle(state);
    case "review-approval":
      return reviewApproval(state, action.approvalId, action.decision);
    case "toggle-action":
      return toggleActionItem(state, action.actionId);
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [selectedView, setSelectedView] = useState<ViewMode>("dashboard");
  const [selectedAgentId, setSelectedAgentId] = useState("agent-mira");
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY_NAME);
  const [founderName, setFounderName] = useState(DEFAULT_FOUNDER_NAME);
  const [sharedRecap, setSharedRecap] = useState(() => readSharedRitualFromUrl());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!state.company) {
      return;
    }

    const selectedStillExists = state.agents.some((agent) => agent.id === selectedAgentId);
    if (!selectedStillExists && state.agents[0]) {
      setSelectedAgentId(state.agents[0].id);
    }
  }, [selectedAgentId, state.agents, state.company]);

  useEffect(() => {
    if (!sharedRecap) {
      return;
    }

    trackEvent("ritual_share_opened", {
      shareId: sharedRecap.shareId,
      meetingId: sharedRecap.meeting.id,
      ritualType: sharedRecap.meeting.ritualType,
    });
  }, [sharedRecap]);

  if (sharedRecap) {
    return (
      <SharedRitualView
        hasWorkspace={Boolean(state.company)}
        onExitShareMode={() => {
          window.history.replaceState({}, document.title, stripSharedRitualFromUrl());
          setSharedRecap(null);
        }}
        recap={sharedRecap}
      />
    );
  }

  if (!state.company) {
    return (
      <main className="launch-shell">
        <section className="launch-copy panel-reveal">
          <p className="eyebrow">Foundry One</p>
          <h1>Spin up a single AI-native company.</h1>
          <p>
            Create one company, seed Product, Engineering, and Design workers, and run the
            whole operation through direct chats, rituals, approvals, and persistent memory.
          </p>
        </section>

        <form
          className="launch-form panel-reveal"
          onSubmit={(event) => {
            event.preventDefault();
            dispatch({
              type: "initialize",
              companyName: companyName.trim() || DEFAULT_COMPANY_NAME,
              founderName: founderName.trim() || DEFAULT_FOUNDER_NAME,
            });
          }}
        >
          <div className="field-row">
            <label htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              onChange={(event) => setCompanyName(event.target.value)}
              value={companyName}
            />
          </div>
          <div className="field-row">
            <label htmlFor="founderName">Founder name</label>
            <input
              id="founderName"
              onChange={(event) => setFounderName(event.target.value)}
              value={founderName}
            />
          </div>
          <button className="primary-button launch-button" type="submit">
            Create company and seed workers
          </button>
        </form>
      </main>
    );
  }

  const selectedAgent =
    state.agents.find((agent) => agent.id === selectedAgentId) ?? state.agents[0];
  const selectedThread = state.threads.find((thread) => thread.agentId === selectedAgent.id);
  const upcomingRituals = getUpcomingRituals(state);
  const pendingApprovals = state.approvals.filter((approval) => approval.status === "pending");
  const actionCountByAgent = Object.fromEntries(
    state.agents.map((agent) => [
      agent.id,
      state.actionItems.filter(
        (action) => action.ownerAgentId === agent.id && action.status === "open",
      ).length,
    ]),
  );

  return (
    <div className="app-shell">
      <Sidebar
        actionCountByAgent={actionCountByAgent}
        agents={state.agents}
        company={state.company}
        onSelectAgent={(agentId) =>
          startTransition(() => {
            setSelectedAgentId(agentId);
          })
        }
        onSelectView={(view) =>
          startTransition(() => {
            setSelectedView(view);
          })
        }
        selectedAgentId={selectedAgent.id}
        selectedView={selectedView}
      />

      <main className="main-stage">
        <header className="global-header panel-reveal">
          <div>
            <p className="section-kicker">Founder</p>
            <h2>{state.company.founderName}</h2>
          </div>
          <div className="header-strip">
            <div>
              <span>Facilitator</span>
              <strong>{state.facilitator.name}</strong>
            </div>
            <div>
              <span>Departments</span>
              <strong>{state.company.departments.join(" / ")}</strong>
            </div>
            <div>
              <span>Projects</span>
              <strong>{state.company.projects.length}</strong>
            </div>
          </div>
        </header>

        {selectedView === "dashboard" ? (
          <DashboardView
            approvals={pendingApprovals}
            onRunWorkCycle={() => dispatch({ type: "run-work-cycle" })}
            onStartMeeting={(ritualType, targetAgentId) =>
              dispatch({ type: "start-meeting", ritualType, targetAgentId })
            }
            selectedAgent={selectedAgent}
            state={state}
            upcomingRituals={upcomingRituals}
          />
        ) : null}

        {selectedView === "chat" ? (
          <ChatView
            actionItems={state.actionItems}
            agent={selectedAgent}
            memoryEntries={state.memoryEntries}
            onSend={(agentId, text) => dispatch({ type: "send-message", agentId, text })}
            thread={selectedThread}
            workItems={state.workItems}
          />
        ) : null}

        {selectedView === "rituals" ? (
          <RitualsView
            actionItems={state.actionItems}
            agents={state.agents}
            company={state.company}
            meetings={state.meetings}
            onStartMeeting={(ritualType, targetAgentId) =>
              dispatch({ type: "start-meeting", ritualType, targetAgentId })
            }
            selectedAgentId={selectedAgent.id}
            upcomingRituals={upcomingRituals}
          />
        ) : null}

        {selectedView === "work" ? (
          <WorkView
            actionItems={state.actionItems}
            agents={state.agents}
            approvals={state.approvals}
            artifacts={state.artifacts}
            onRunWorkCycle={() => dispatch({ type: "run-work-cycle" })}
            onToggleActionItem={(actionId) => dispatch({ type: "toggle-action", actionId })}
            workItems={state.workItems}
          />
        ) : null}
      </main>

      <ContextRail
        actionItems={state.actionItems}
        approvals={pendingApprovals}
        onReviewApproval={(approvalId, decision) =>
          dispatch({ type: "review-approval", approvalId, decision })
        }
        onToggleActionItem={(actionId) => dispatch({ type: "toggle-action", actionId })}
        recentMeetings={state.meetings}
        upcomingRituals={upcomingRituals}
      />
    </div>
  );
}
