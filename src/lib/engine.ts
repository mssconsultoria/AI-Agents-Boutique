import { createInitialState, meetingTemplates } from "./seed";
import type {
  ActionItem,
  AgentProfile,
  AppState,
  ApprovalItem,
  ApprovalKind,
  Artifact,
  ChatMessage,
  MeetingSession,
  MemoryEntry,
  RitualSetting,
  RitualType,
  ScheduledRitualPreview,
  TranscriptTurn,
  WorkItem,
} from "../types";

const RITUAL_INTERVALS_HOURS: Record<RitualType, number> = {
  "1:1": 72,
  daily: 24,
  weekly: 24 * 7,
  retro: 24 * 7,
  "lessons learned": 24 * 10,
};

const RITUAL_LABELS: Record<RitualType, string> = {
  "1:1": "1:1",
  daily: "Daily",
  weekly: "Weekly",
  retro: "Retro",
  "lessons learned": "Lessons learned",
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function summarizeStatus(status: WorkItem["status"]) {
  switch (status) {
    case "planned":
      return "queued";
    case "in_progress":
      return "in motion";
    case "blocked":
      return "blocked";
    case "in_review":
      return "awaiting founder review";
    case "done":
      return "shipped";
  }
}

function findAgent(state: AppState, agentId: string) {
  return state.agents.find((agent) => agent.id === agentId);
}

function getAgentWorkQueue(state: AppState, agentId: string) {
  return state.workItems.filter(
    (workItem) => workItem.ownerAgentId === agentId && workItem.status !== "done",
  );
}

function getPrimaryWorkItem(state: AppState, agentId: string) {
  return getAgentWorkQueue(state, agentId)[0];
}

function getOpenActions(state: AppState, agentId: string) {
  return state.actionItems.filter(
    (action) => action.ownerAgentId === agentId && action.status === "open",
  );
}

function getRecentMeeting(state: AppState, agentId: string) {
  return state.meetings
    .filter((meeting) => meeting.participantIds.includes(agentId))
    .at(-1);
}

function getRecentArtifact(state: AppState, agentId: string) {
  return state.artifacts
    .filter((artifact) => artifact.authorAgentId === agentId)
    .at(-1);
}

function getRecentLesson(state: AppState, agentId: string) {
  return state.memoryEntries
    .filter(
      (memory) =>
        memory.agentId === agentId &&
        (memory.category === "lesson" || memory.category === "meeting"),
    )
    .at(-1);
}

function inferIntent(founderText: string) {
  const text = founderText.toLowerCase();
  if (text.includes("block") || text.includes("risk")) {
    return "blocker";
  }
  if (text.includes("plan") || text.includes("next") || text.includes("priority")) {
    return "plan";
  }
  if (text.includes("approve") || text.includes("review")) {
    return "approval";
  }
  if (text.includes("lesson") || text.includes("retro")) {
    return "lesson";
  }
  if (text.includes("status") || text.includes("update") || text.includes("progress")) {
    return "status";
  }
  return "general";
}

function roleOpening(agent: AgentProfile) {
  switch (agent.department) {
    case "Product":
      return "I’m protecting the company boundary and reducing drift into something you can decide quickly.";
    case "Engineering":
      return "I’m turning the operating model into explicit state so the system stays inspectable under pressure.";
    case "Design":
      return "I’m making the founder surface legible so rituals, chat, and approvals read like one operating rhythm.";
  }
}

function composeAgentReply(
  state: AppState,
  agent: AgentProfile,
  founderText: string,
) {
  const intent = inferIntent(founderText);
  const currentWork = getPrimaryWorkItem(state, agent.id);
  const openActions = getOpenActions(state, agent.id);
  const recentMeeting = getRecentMeeting(state, agent.id);
  const recentArtifact = getRecentArtifact(state, agent.id);
  const recentLesson = getRecentLesson(state, agent.id);
  const pendingApproval = state.approvals.find(
    (approval) =>
      approval.sourceAgentId === agent.id && approval.status === "pending",
  );

  const statusLine = currentWork
    ? `Current focus is "${currentWork.title}" and it is ${summarizeStatus(currentWork.status)}.`
    : "My queue is clear enough that I can pick up new founder direction immediately.";

  if (intent === "blocker") {
    const blocker =
      currentWork?.blockers[0] ??
      "cross-team ambiguity rather than raw execution capacity";
    return `${roleOpening(agent)} ${statusLine} The sharpest blocker right now is ${blocker.toLowerCase()}. ${
      openActions[0]
        ? `I’m holding myself to "${openActions[0].title}" before the next ritual.`
        : "If you want speed, clear the blocker and I can keep momentum."
    }`;
  }

  if (intent === "plan") {
    return `${roleOpening(agent)} ${statusLine} Next I want to ${
      openActions[0]?.title.toLowerCase() ??
      "close the current workstream and convert it into a reusable operating pattern"
    }. ${
      recentMeeting
        ? `The latest ${recentMeeting.ritualType} already pointed me toward ${recentMeeting.decisions[0].toLowerCase()}.`
        : "I can adapt the next move as soon as you sharpen the priority."
    }`;
  }

  if (intent === "approval") {
    return `${roleOpening(agent)} ${
      pendingApproval
        ? `I’m waiting on "${pendingApproval.title}" before I treat this as the new default.`
        : "I do not have anything critical waiting on approval right now."
    } ${
      recentArtifact
        ? `The most relevant artifact is "${recentArtifact.summary}".`
        : "I can package the current thinking into a founder-ready artifact if needed."
    }`;
  }

  if (intent === "lesson") {
    return `${roleOpening(agent)} ${
      recentLesson
        ? `The strongest recent learning is: ${recentLesson.content}`
        : "The main lesson so far is that agents need explicit commitments to stay accountable between rituals."
    } ${
      recentArtifact
        ? `That learning is already shaping the artifact "${recentArtifact.summary}".`
        : "I’ll keep converting new work into repeatable operating rules."
    }`;
  }

  if (intent === "status") {
    return `${roleOpening(agent)} ${statusLine} ${
      openActions.length > 0
        ? `I still owe ${openActions.length} open action item${openActions.length > 1 ? "s" : ""}.`
        : "I do not have action-item debt building up behind me."
    }`;
  }

  return `${roleOpening(agent)} ${statusLine} ${
    recentMeeting
      ? `The last ritual left me with "${recentMeeting.summary}".`
      : "The work is stable and ready for your next question."
  }`;
}

function buildAgenda(
  state: AppState,
  ritualType: RitualType,
  participantIds: string[],
) {
  const template = meetingTemplates.find(
    (candidate) => candidate.ritualType === ritualType,
  );
  const blockers = state.workItems.flatMap((workItem) => workItem.blockers).slice(0, 2);
  const approvals = state.approvals.filter((approval) => approval.status === "pending");
  const goals = state.company?.currentGoals.slice(0, 2) ?? [];

  return [
    ...(template?.agendaStructure ?? []),
    ...goals.slice(0, ritualType === "weekly" ? 1 : 0),
    ...(blockers.length > 0 ? [`review blocker: ${blockers[0]}`] : []),
    ...(approvals.length > 0
      ? [`clear ${approvals.length} pending founder approval${approvals.length > 1 ? "s" : ""}`]
      : []),
    participantIds.length === 1 ? "check the next solo commitment" : "confirm cross-team handoffs",
  ].slice(0, 5);
}

function agentRitualUpdate(
  state: AppState,
  agent: AgentProfile,
  ritualType: RitualType,
) {
  const workItem = getPrimaryWorkItem(state, agent.id);
  const openAction = getOpenActions(state, agent.id)[0];
  const blocker = workItem?.blockers[0];
  const outcome = workItem?.lastOutcome ?? "kept the lane warm and visible";

  switch (ritualType) {
    case "1:1":
      return `Since the last 1:1 I’ve ${outcome.toLowerCase()}. My next commitment is ${
        openAction?.title.toLowerCase() ?? "to close the highest-leverage work item on my board"
      }${blocker ? `, but the main blocker is ${blocker.toLowerCase()}` : ""}.`;
    case "daily":
      return `Yesterday I ${outcome.toLowerCase()}. Today I’m pushing ${
        workItem?.title.toLowerCase() ?? "the next work item in my queue"
      }${blocker ? `. Blocker: ${blocker}` : ". No blocker escalation yet."}`;
    case "weekly":
      return `This week I’m steering ${
        workItem?.title.toLowerCase() ?? "the next priority lane"
      }. The risk I want visible is ${
        blocker?.toLowerCase() ?? "losing approval clarity as more artifacts reach review"
      }.`;
    case "retro":
      return `What worked: ${outcome}. What hurt flow: ${
        blocker?.toLowerCase() ?? "handoffs got fuzzy before being written down"
      }. I want one operating improvement, not a pile of nice-to-haves.`;
    case "lessons learned":
      return `Reusable lesson: ${
        blocker
          ? `turn hidden blockers like "${blocker}" into agenda items before they become drift`
          : "make every meeting end with explicit owner language, not vague intent"
      }. That should become part of the company memory, not just this meeting.`;
  }
}

function buildMeetingNotes(
  state: AppState,
  ritualType: RitualType,
  participantIds: string[],
) {
  const participantNames = participantIds
    .map((participantId) => findAgent(state, participantId)?.name)
    .filter(Boolean)
    .join(", ");
  const approvals = state.approvals.filter((approval) => approval.status === "pending").length;

  return [
    `${RITUAL_LABELS[ritualType]} centered on ${participantNames || "the operating core"}.`,
    approvals > 0
      ? `Founder still has ${approvals} pending approval${approvals > 1 ? "s" : ""} that shape delivery risk.`
      : "Approval pressure is stable right now.",
  ];
}

function buildMeetingDecisions(state: AppState, ritualType: RitualType) {
  const topGoal = state.company?.currentGoals[0] ?? "ship the next company milestone";
  const pendingApprovals = state.approvals.filter(
    (approval) => approval.status === "pending",
  ).length;

  switch (ritualType) {
    case "1:1":
      return [
        "Keep the agent’s focus narrow until the next check-in.",
        pendingApprovals > 0
          ? "Founder should clear the relevant pending approval before the next 1:1."
          : "No additional approvals are needed before the next 1:1.",
      ];
    case "daily":
      return [
        `Maintain momentum on "${topGoal}".`,
        pendingApprovals > 0
          ? "Surface approval debt in the daily until it is cleared."
          : "No approval debt is blocking today’s work loop.",
      ];
    case "weekly":
      return [
        `Anchor the week around "${topGoal}".`,
        "Protect the single-company boundary instead of adding parallel operating modes.",
        "Treat rituals as the source of truth for commitments and escalation.",
      ];
    case "retro":
      return [
        "Reduce handoff ambiguity before the next sprint.",
        "Keep improvement work small enough to finish inside one weekly cycle.",
      ];
    case "lessons learned":
      return [
        "Promote reusable lessons into persistent memory.",
        "Convert incident-specific insight into a durable operating rule.",
      ];
  }
}

function createAction(
  ownerAgentId: string,
  sourceMeetingId: string,
  title: string,
  dueLabel: string,
): ActionItem {
  return {
    id: createId("action"),
    ownerAgentId,
    sourceMeetingId,
    title,
    dueLabel,
    status: "open",
  };
}

function buildActionItems(
  state: AppState,
  ritualType: RitualType,
  participantIds: string[],
  meetingId: string,
) {
  const actions: ActionItem[] = [];

  for (const participantId of participantIds) {
    const agent = findAgent(state, participantId);
    const workItem = getPrimaryWorkItem(state, participantId);
    const blocker = workItem?.blockers[0];
    if (!agent) {
      continue;
    }

    if (ritualType === "1:1") {
      actions.push(
        createAction(
          participantId,
          meetingId,
          blocker
            ? `Resolve blocker: ${blocker}`
            : `Ship the next visible slice of ${workItem?.project ?? "the active lane"}.`,
          "Before next 1:1",
        ),
      );
      continue;
    }

    if (ritualType === "retro") {
      actions.push(
        createAction(
          participantId,
          meetingId,
          `Tighten the handoff around ${workItem?.title.toLowerCase() ?? "the active workstream"}.`,
          "Before next weekly",
        ),
      );
      continue;
    }

    if (ritualType === "lessons learned") {
      actions.push(
        createAction(
          participantId,
          meetingId,
          `Document one reusable rule from ${workItem?.project ?? "this milestone"}.`,
          "Before next lessons learned",
        ),
      );
      continue;
    }

    actions.push(
      createAction(
        participantId,
        meetingId,
        blocker
          ? `Escalate and close blocker: ${blocker}`
          : `Advance ${workItem?.title.toLowerCase() ?? "the next priority"} to the next review point.`,
        ritualType === "daily" ? "Before next daily" : "Before next weekly",
      ),
    );
  }

  return actions.filter((candidate) => {
    const duplicate = state.actionItems.find(
      (action) =>
        action.ownerAgentId === candidate.ownerAgentId &&
        action.title === candidate.title &&
        action.status === "open",
    );

    return !duplicate;
  });
}

function buildSummary(ritualType: RitualType, participantCount: number) {
  const participantLabel = participantCount === 1 ? "one worker" : `${participantCount} workers`;
  return `${RITUAL_LABELS[ritualType]} concluded with ${participantLabel}, explicit notes, and fresh owner actions.`;
}

function buildTranscript(
  state: AppState,
  ritualType: RitualType,
  participantIds: string[],
  agenda: string[],
) {
  const turns: TranscriptTurn[] = [
    {
      id: createId("turn"),
      speakerId: state.facilitator.id,
      speakerName: state.facilitator.name,
      kind: "facilitator",
      text: `Opening ${RITUAL_LABELS[ritualType]}. Agenda: ${agenda.join("; ")}.`,
    },
    {
      id: createId("turn"),
      speakerId: "founder",
      speakerName: state.company?.founderName ?? "Founder",
      kind: "founder",
      text:
        ritualType === "retro"
          ? "Keep this concrete. I want one change we can actually absorb."
          : "Keep this sharp. I want current truth, not polished theater.",
    },
  ];

  for (const participantId of participantIds) {
    const agent = findAgent(state, participantId);
    if (!agent) {
      continue;
    }

    turns.push({
      id: createId("turn"),
      speakerId: state.facilitator.id,
      speakerName: state.facilitator.name,
      kind: "facilitator",
      text:
        ritualType === "1:1"
          ? `${agent.name}, give the founder your current truth on momentum, blockers, and next commitment.`
          : `${agent.name}, give your ${RITUAL_LABELS[ritualType].toLowerCase()} readout.`,
    });
    turns.push({
      id: createId("turn"),
      speakerId: agent.id,
      speakerName: agent.name,
      kind: "agent",
      text: agentRitualUpdate(state, agent, ritualType),
    });
  }

  turns.push({
    id: createId("turn"),
    speakerId: state.facilitator.id,
    speakerName: state.facilitator.name,
    kind: "facilitator",
    text: "Closing with notes, decisions, and owner actions. No commitments leave this room unnamed.",
  });

  return turns;
}

function advanceRitualSettings(
  settings: RitualSetting[],
  ritualType: RitualType,
) {
  return settings.map((setting) => {
    if (setting.ritualType !== ritualType) {
      return setting;
    }

    const base = new Date(setting.nextRunAt).getTime();
    const nextRun = new Date(
      Math.max(base, Date.now()) + RITUAL_INTERVALS_HOURS[ritualType] * 60 * 60 * 1000,
    ).toISOString();

    return {
      ...setting,
      nextRunAt: nextRun,
    };
  });
}

function updateWorkItemCommitments(workItems: WorkItem[], actions: ActionItem[]) {
  return workItems.map((workItem) => {
    const relevantActions = actions
      .filter((action) => action.ownerAgentId === workItem.ownerAgentId)
      .map((action) => action.title);

    if (relevantActions.length === 0) {
      return workItem;
    }

    return {
      ...workItem,
      commitments: [...new Set([...workItem.commitments, ...relevantActions])],
    };
  });
}

function appendMeetingMemories(
  state: AppState,
  ritualType: RitualType,
  participantIds: string[],
  summary: string,
  actions: ActionItem[],
): MemoryEntry[] {
  const entries: MemoryEntry[] = [];

  for (const participantId of participantIds) {
    const action = actions.find((candidate) => candidate.ownerAgentId === participantId);
    entries.push({
      id: createId("memory"),
      agentId: participantId,
      category: ritualType === "lessons learned" ? "lesson" : "meeting",
      source: ritualType,
      timestamp: nowIso(),
      importance: ritualType === "weekly" ? 0.9 : 0.75,
      content: `${summary} ${action ? `Commitment: ${action.title}.` : ""}`.trim(),
    });
  }

  return entries;
}

function artifactSpecForAgent(agent: AgentProfile) {
  switch (agent.department) {
    case "Product":
      return {
        type: "brief" as const,
        summary: "tightened the founder-facing execution map and clarified the next operating decisions",
        kind: "priority_shift" as ApprovalKind,
      };
    case "Engineering":
      return {
        type: "prototype" as const,
        summary: "translated the meeting and memory model into an inspectable workflow slice",
        kind: "scope_change" as ApprovalKind,
      };
    case "Design":
      return {
        type: "design" as const,
        summary: "refined the cockpit layout into a stronger default for chat, rituals, and approvals",
        kind: "artifact_publish" as ApprovalKind,
      };
  }
}

function progressAgentWork(
  state: AppState,
  agent: AgentProfile,
  nextWorkItems: WorkItem[],
  nextArtifacts: Artifact[],
  nextApprovals: ApprovalItem[],
  nextMemories: MemoryEntry[],
  nextAgents: AgentProfile[],
) {
  const workIndex = nextWorkItems.findIndex(
    (workItem) => workItem.ownerAgentId === agent.id && workItem.status !== "done",
  );

  if (workIndex === -1) {
    return;
  }

  const workItem = nextWorkItems[workIndex];
  const agentIndex = nextAgents.findIndex((candidate) => candidate.id === agent.id);

  if (workItem.status === "planned") {
    nextWorkItems[workIndex] = {
      ...workItem,
      status: "in_progress",
      lastOutcome: "Started execution and converted the brief into an active work lane.",
    };
    nextAgents[agentIndex] = {
      ...agent,
      status: "focused",
      currentFocus: workItem.title,
      lastUpdatedAt: nowIso(),
    };
    nextMemories.push({
      id: createId("memory"),
      agentId: agent.id,
      category: "commitment",
      source: "work-cycle",
      timestamp: nowIso(),
      importance: 0.55,
      content: `Started work on "${workItem.title}".`,
    });
    return;
  }

  if (workItem.status === "blocked") {
    nextAgents[agentIndex] = {
      ...agent,
      status: "blocked",
      lastUpdatedAt: nowIso(),
    };
    nextMemories.push({
      id: createId("memory"),
      agentId: agent.id,
      category: "blocker",
      source: "work-cycle",
      timestamp: nowIso(),
      importance: 0.7,
      content: `Still blocked by: ${workItem.blockers[0] ?? "an unresolved founder decision"}.`,
    });
    return;
  }

  if (workItem.status === "in_progress") {
    const spec = artifactSpecForAgent(agent);
    const artifactId = createId("artifact");
    const artifact: Artifact = {
      id: artifactId,
      type: spec.type,
      authorAgentId: agent.id,
      relatedWorkItemId: workItem.id,
      contentRef: `memory://${spec.type}/${artifactId}`,
      summary: `${agent.name} ${spec.summary}.`,
      createdAt: nowIso(),
    };
    const approvalExists = nextApprovals.some(
      (approval) =>
        approval.relatedWorkItemId === workItem.id && approval.status === "pending",
    );

    nextArtifacts.push(artifact);
    nextWorkItems[workIndex] = {
      ...workItem,
      status: "in_review",
      approvalRequired: true,
      linkedArtifactIds: [...workItem.linkedArtifactIds, artifact.id],
      lastOutcome: artifact.summary,
    };
    nextAgents[agentIndex] = {
      ...agent,
      status: "reviewing",
      currentFocus: `Awaiting founder review on ${workItem.project}.`,
      lastUpdatedAt: nowIso(),
    };
    nextMemories.push({
      id: createId("memory"),
      agentId: agent.id,
      category: "artifact",
      source: "work-cycle",
      timestamp: nowIso(),
      importance: 0.8,
      content: artifact.summary,
    });

    if (!approvalExists) {
      nextApprovals.push({
        id: createId("approval"),
        kind: spec.kind,
        title: `Approve ${agent.name}'s update on ${workItem.project}`,
        description: artifact.summary,
        sourceAgentId: agent.id,
        relatedWorkItemId: workItem.id,
        artifactId: artifact.id,
        createdAt: nowIso(),
        status: "pending",
      });
    }

    return;
  }

  if (workItem.status === "in_review") {
    const pendingApproval = nextApprovals.find(
      (approval) =>
        approval.relatedWorkItemId === workItem.id && approval.status === "pending",
    );

    nextWorkItems[workIndex] = {
      ...workItem,
      lastOutcome: pendingApproval
        ? `Waiting on founder approval: ${pendingApproval.title}.`
        : workItem.lastOutcome,
    };
    nextAgents[agentIndex] = {
      ...agent,
      status: "reviewing",
      lastUpdatedAt: nowIso(),
    };
  }
}

export function getUpcomingRituals(state: AppState): ScheduledRitualPreview[] {
  if (!state.company) {
    return [];
  }

  return state.company.ritualSettings
    .map((setting) => ({
      ritualType: setting.ritualType,
      nextRunAt: setting.nextRunAt,
      cadenceLabel: setting.cadenceLabel,
      participantAgentIds: setting.participantAgentIds,
      preview: buildAgenda(state, setting.ritualType, setting.participantAgentIds).slice(0, 3),
    }))
    .sort(
      (left, right) =>
        new Date(left.nextRunAt).getTime() - new Date(right.nextRunAt).getTime(),
    );
}

export function sendFounderMessage(
  state: AppState,
  agentId: string,
  founderText: string,
): AppState {
  const agent = findAgent(state, agentId);
  if (!agent || !founderText.trim()) {
    return state;
  }

  const founderMessage: ChatMessage = {
    id: createId("msg"),
    sender: "founder",
    senderId: "founder",
    createdAt: nowIso(),
    text: founderText.trim(),
  };
  const replyMessage: ChatMessage = {
    id: createId("msg"),
    sender: "agent",
    senderId: agent.id,
    createdAt: nowIso(),
    text: composeAgentReply(state, agent, founderText),
  };

  const threads = state.threads.some((thread) => thread.agentId === agentId)
    ? state.threads.map((thread) =>
        thread.agentId === agentId
          ? { ...thread, messages: [...thread.messages, founderMessage, replyMessage] }
          : thread,
      )
    : [
        ...state.threads,
        {
          id: createId("thread"),
          agentId,
          messages: [founderMessage, replyMessage],
        },
      ];

  return {
    ...state,
    threads,
  };
}

export function startMeeting(
  state: AppState,
  ritualType: RitualType,
  targetAgentId?: string,
): AppState {
  const participantIds =
    ritualType === "1:1"
      ? [targetAgentId ?? state.agents[0]?.id].filter(
          (candidate): candidate is string => Boolean(candidate),
        )
      : state.agents.map((agent) => agent.id);
  const meetingId = createId("meeting");
  const agenda = buildAgenda(state, ritualType, participantIds);
  const transcript = buildTranscript(state, ritualType, participantIds, agenda);
  const decisions = buildMeetingDecisions(state, ritualType);
  const actions = buildActionItems(state, ritualType, participantIds, meetingId);
  const summary = buildSummary(ritualType, participantIds.length);
  const notes = buildMeetingNotes(state, ritualType, participantIds);

  const meeting: MeetingSession = {
    id: meetingId,
    ritualType,
    participantIds,
    startedAt: nowIso(),
    agenda,
    transcript,
    summary,
    decisions,
    actionItemIds: actions.map((action) => action.id),
    notes,
  };

  return {
    ...state,
    meetings: [...state.meetings, meeting],
    actionItems: [...state.actionItems, ...actions],
    memoryEntries: [
      ...state.memoryEntries,
      ...appendMeetingMemories(state, ritualType, participantIds, summary, actions),
    ],
    workItems: updateWorkItemCommitments(state.workItems, actions),
    company: state.company
      ? {
          ...state.company,
          ritualSettings: advanceRitualSettings(state.company.ritualSettings, ritualType),
        }
      : state.company,
  };
}

export function runWorkCycle(state: AppState): AppState {
  const nextWorkItems = [...state.workItems];
  const nextArtifacts = [...state.artifacts];
  const nextApprovals = [...state.approvals];
  const nextMemories = [...state.memoryEntries];
  const nextAgents = [...state.agents];

  for (const agent of state.agents) {
    progressAgentWork(
      state,
      agent,
      nextWorkItems,
      nextArtifacts,
      nextApprovals,
      nextMemories,
      nextAgents,
    );
  }

  return {
    ...state,
    agents: nextAgents,
    workItems: nextWorkItems,
    artifacts: nextArtifacts,
    approvals: nextApprovals,
    memoryEntries: nextMemories,
  };
}

export function reviewApproval(
  state: AppState,
  approvalId: string,
  decision: "approved" | "rejected",
): AppState {
  const approval = state.approvals.find((candidate) => candidate.id === approvalId);
  if (!approval || approval.status !== "pending") {
    return state;
  }

  const approvals = state.approvals.map((candidate) =>
    candidate.id === approvalId ? { ...candidate, status: decision } : candidate,
  );
  const workItems: WorkItem[] = state.workItems.map((workItem) => {
    if (workItem.id !== approval.relatedWorkItemId) {
      return workItem;
    }

    if (decision === "approved") {
      return {
        ...workItem,
        approvalRequired: false,
        status: "done",
        blockers: [],
        lastOutcome: "Founder approved the deliverable and cleared it for use as the new default.",
      };
    }

    return {
      ...workItem,
      approvalRequired: false,
      status: "in_progress",
      lastOutcome: "Founder rejected the change and requested a tighter next iteration.",
    };
  });
  const agents: AgentProfile[] = state.agents.map((agent) => {
    if (agent.id !== approval.sourceAgentId) {
      return agent;
    }

    return {
      ...agent,
      status: decision === "approved" ? "focused" : "reviewing",
      currentFocus:
        decision === "approved"
          ? "Preparing the next operating slice."
          : "Reworking the last deliverable after founder feedback.",
      lastUpdatedAt: nowIso(),
    };
  });
  const memories: MemoryEntry[] = [
    ...state.memoryEntries,
    {
      id: createId("memory"),
      agentId: approval.sourceAgentId,
      category: "commitment",
      source: "approval",
      timestamp: nowIso(),
      importance: 0.92,
      content:
        decision === "approved"
          ? `Founder approved "${approval.title}".`
          : `Founder rejected "${approval.title}" and requested another pass.`,
    },
  ];

  return {
    ...state,
    approvals,
    workItems,
    agents,
    memoryEntries: memories,
  };
}

export function toggleActionItem(state: AppState, actionId: string): AppState {
  return {
    ...state,
    actionItems: state.actionItems.map((action) =>
      action.id === actionId
        ? { ...action, status: action.status === "open" ? "done" : "open" }
        : action,
    ),
  };
}

export const founderChatApi = {
  sendMessage: sendFounderMessage,
};

export const meetingApi = {
  startRitual: startMeeting,
  getAgendaPreview: getUpcomingRituals,
};

export const schedulingApi = {
  getUpcomingRituals,
};

export const workApi = {
  runCycle: runWorkCycle,
  reviewApproval,
  toggleActionItem,
};

export function resetWorkspace(companyName?: string, founderName?: string) {
  return createInitialState(companyName, founderName);
}
