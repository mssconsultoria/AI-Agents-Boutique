import type {
  ActionItem,
  AgentProfile,
  AppState,
  Company,
  ConversationThread,
  FacilitatorProfile,
  MeetingSession,
  MeetingTemplate,
  MemoryEntry,
  RitualSetting,
  WorkItem,
} from "../types";

const APP_VERSION = 1;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const DEFAULT_COMPANY_NAME = "Foundry One";
export const DEFAULT_FOUNDER_NAME = "Founder";

function futureIso(offsetMs: number) {
  return new Date(Date.now() + offsetMs).toISOString();
}

export const facilitatorProfile: FacilitatorProfile = {
  id: "facilitator-orin",
  name: "Orin Slate",
  title: "Facilitator Agent",
  tone: "calm, exact, and slightly relentless about follow-through",
  responsibilities: [
    "prepare ritual agendas",
    "enforce structured turn-taking",
    "publish concise notes and action items",
  ],
};

export function createEmptyState(): AppState {
  return {
    version: APP_VERSION,
    company: null,
    facilitator: facilitatorProfile,
    agents: [],
    workItems: [],
    artifacts: [],
    meetingTemplates,
    meetings: [],
    actionItems: [],
    memoryEntries: [],
    approvals: [],
    threads: [],
  };
}

export const meetingTemplates: MeetingTemplate[] = [
  {
    ritualType: "1:1",
    participantMode: "solo",
    cadenceLabel: "Every Wednesday, 16:00",
    agendaStructure: [
      "wins since the last touchpoint",
      "current blockers and decision risk",
      "next commitment before the next 1:1",
    ],
    expectedOutputs: ["summary", "owner commitment", "escalation"],
  },
  {
    ritualType: "daily",
    participantMode: "team",
    cadenceLabel: "Weekdays, 09:00",
    agendaStructure: [
      "yesterday, today, blocker",
      "approval queue check",
      "cross-functional handoff risks",
    ],
    expectedOutputs: ["summary", "action items", "blocker callouts"],
  },
  {
    ritualType: "weekly",
    participantMode: "team",
    cadenceLabel: "Mondays, 10:00",
    agendaStructure: [
      "goal alignment",
      "priority tradeoffs",
      "risk review",
    ],
    expectedOutputs: ["decisions", "priority update", "owner actions"],
  },
  {
    ritualType: "retro",
    participantMode: "team",
    cadenceLabel: "Fridays, 15:00",
    agendaStructure: [
      "what worked",
      "what hurt flow",
      "one operating improvement",
    ],
    expectedOutputs: ["summary", "improvement action", "lessons"],
  },
  {
    ritualType: "lessons learned",
    participantMode: "team",
    cadenceLabel: "After milestone or incident",
    agendaStructure: [
      "what happened",
      "what must become reusable knowledge",
      "what rule changes now",
    ],
    expectedOutputs: ["lesson log", "new guardrail", "follow-up action"],
  },
];

function createRitualSettings(agentIds: string[]): RitualSetting[] {
  return [
    {
      ritualType: "daily",
      cadenceLabel: "Weekdays, 09:00",
      nextRunAt: futureIso(14 * HOUR),
      participantMode: "team",
      participantAgentIds: agentIds,
    },
    {
      ritualType: "weekly",
      cadenceLabel: "Mondays, 10:00",
      nextRunAt: futureIso(4 * DAY),
      participantMode: "team",
      participantAgentIds: agentIds,
    },
    {
      ritualType: "retro",
      cadenceLabel: "Fridays, 15:00",
      nextRunAt: futureIso(5 * DAY),
      participantMode: "team",
      participantAgentIds: agentIds,
    },
    {
      ritualType: "lessons learned",
      cadenceLabel: "After milestone or incident",
      nextRunAt: futureIso(6 * DAY),
      participantMode: "team",
      participantAgentIds: agentIds,
    },
    {
      ritualType: "1:1",
      cadenceLabel: "Every Wednesday, 16:00",
      nextRunAt: futureIso(2 * DAY),
      participantMode: "solo",
      participantAgentIds: agentIds,
    },
  ];
}

export function createInitialState(
  companyName = DEFAULT_COMPANY_NAME,
  founderName = DEFAULT_FOUNDER_NAME,
): AppState {
  const agents: AgentProfile[] = [
    {
      id: "agent-mira",
      name: "Mira Vale",
      role: "Product Strategist",
      department: "Product",
      persona: "scope guard who compresses ambiguity into decisions",
      capabilities: ["roadmap design", "brief writing", "retro synthesis"],
      manager: "founder",
      goals: [
        "keep the company single-purpose",
        "protect approval gates for risky changes",
      ],
      currentFocus: "Turn the operating charter into a practical work loop.",
      status: "focused",
      energy: 86,
      lastUpdatedAt: futureIso(-2 * HOUR),
    },
    {
      id: "agent-jonah",
      name: "Jonah Quill",
      role: "Systems Engineer",
      department: "Engineering",
      persona: "deliberate builder who turns rituals into durable systems",
      capabilities: ["workflow design", "memory systems", "artifact review"],
      manager: "founder",
      goals: [
        "ship a reliable ritual engine",
        "keep approvals visible and reversible",
      ],
      currentFocus: "Model the work loop and meeting state without overbuilding.",
      status: "blocked",
      energy: 77,
      lastUpdatedAt: futureIso(-90 * 60 * 1000),
    },
    {
      id: "agent-sora",
      name: "Sora Dune",
      role: "Product Designer",
      department: "Design",
      persona: "clarity-first designer who makes operating context feel calm",
      capabilities: ["interaction design", "workspace systems", "narrative UI"],
      manager: "founder",
      goals: [
        "make rituals readable at a glance",
        "keep the founder cockpit dense but calm",
      ],
      currentFocus: "Shape the dashboard, agent chat, and ritual rooms into one flow.",
      status: "reviewing",
      energy: 91,
      lastUpdatedAt: futureIso(-45 * 60 * 1000),
    },
  ];

  const company: Company = {
    id: "company-foundry",
    name: companyName,
    founderName,
    mission: "Operate one AI-native company where agents work, report, and learn in public rituals.",
    currentGoals: [
      "Ship the founder cockpit MVP.",
      "Keep every major change behind explicit human approval.",
      "Turn rituals into reusable operating memory.",
    ],
    departments: ["Product", "Engineering", "Design"],
    projects: [
      "Founder cockpit",
      "Ritual engine",
      "Memory ledger",
    ],
    ritualSettings: createRitualSettings(agents.map((agent) => agent.id)),
  };

  const workItems: WorkItem[] = [
    {
      id: "work-product-charter",
      ownerAgentId: "agent-mira",
      title: "Condense the operating charter into a founder-facing execution map.",
      project: "Founder cockpit",
      status: "in_progress",
      priority: "high",
      blockers: [],
      linkedArtifactIds: ["artifact-charter-map"],
      approvalRequired: false,
      dueLabel: "Before next weekly",
      lastOutcome: "Reframed the company goals into a tighter execution sequence.",
      commitments: ["Translate the charter into visible work lanes."],
    },
    {
      id: "work-engine-meeting-engine",
      ownerAgentId: "agent-jonah",
      title: "Model meeting sessions, approvals, and memory handoffs.",
      project: "Ritual engine",
      status: "blocked",
      priority: "high",
      blockers: ["Need founder confirmation on what counts as a major change."],
      linkedArtifactIds: [],
      approvalRequired: false,
      dueLabel: "Before next daily",
      lastOutcome: "Defined the state boundaries but paused before locking approval rules.",
      commitments: ["Keep the engine local-first and easy to inspect."],
    },
    {
      id: "work-design-cockpit",
      ownerAgentId: "agent-sora",
      title: "Shape a calm cockpit for chats, rituals, and approval review.",
      project: "Founder cockpit",
      status: "in_review",
      priority: "medium",
      blockers: [],
      linkedArtifactIds: ["artifact-cockpit-layout"],
      approvalRequired: true,
      dueLabel: "Before next founder review",
      lastOutcome: "Prepared a layout direction that merges rituals, chat, and approvals.",
      commitments: ["Keep the interface dense, calm, and easy to scan."],
    },
  ];

  const memories: MemoryEntry[] = [
    {
      id: "memory-mira-profile",
      agentId: "agent-mira",
      category: "profile",
      source: "seed",
      timestamp: futureIso(-12 * HOUR),
      importance: 0.95,
      content: "Mira protects scope, dislikes meeting drift, and prefers decisions over options.",
    },
    {
      id: "memory-jonah-profile",
      agentId: "agent-jonah",
      category: "profile",
      source: "seed",
      timestamp: futureIso(-12 * HOUR),
      importance: 0.95,
      content: "Jonah optimizes for explicit state, reversible decisions, and visible failure modes.",
    },
    {
      id: "memory-sora-profile",
      agentId: "agent-sora",
      category: "profile",
      source: "seed",
      timestamp: futureIso(-12 * HOUR),
      importance: 0.95,
      content: "Sora values dense clarity, avoids noisy chrome, and wants each ritual to feel legible.",
    },
  ];

  const kickoffMeeting: MeetingSession = {
    id: "meeting-kickoff-weekly",
    ritualType: "weekly",
    participantIds: agents.map((agent) => agent.id),
    startedAt: futureIso(-8 * HOUR),
    agenda: [
      "Confirm single-company scope.",
      "Define approval gates for risky changes.",
      "Assign the first cockpit deliverables.",
    ],
    transcript: [
      {
        id: "turn-kickoff-1",
        speakerId: facilitatorProfile.id,
        speakerName: facilitatorProfile.name,
        kind: "facilitator",
        text: "We are keeping this company single-purpose: one founder, one company, one visible operating system.",
      },
      {
        id: "turn-kickoff-2",
        speakerId: "founder",
        speakerName: founderName,
        kind: "founder",
        text: "I want every agent to work independently but still be easy to interrogate in meetings.",
      },
      {
        id: "turn-kickoff-3",
        speakerId: "agent-mira",
        speakerName: "Mira Vale",
        kind: "agent",
        text: "Then the product boundary is simple: one company view, explicit approval gates, and ritual outputs as the operating record.",
      },
      {
        id: "turn-kickoff-4",
        speakerId: "agent-jonah",
        speakerName: "Jonah Quill",
        kind: "agent",
        text: "I will keep the state local-first so you can inspect memory, approvals, and every meeting artifact without guessing.",
      },
      {
        id: "turn-kickoff-5",
        speakerId: "agent-sora",
        speakerName: "Sora Dune",
        kind: "agent",
        text: "The workspace should feel like a command deck, not a pile of cards. Chats, rituals, and approvals can share one calm surface.",
      },
    ],
    summary: "Kickoff aligned the company around a single-founder cockpit with visible approvals and structured rituals.",
    decisions: [
      "Keep scope to one company only.",
      "Require founder approval for major task changes, priority shifts, and publication-ready artifacts.",
      "Use a facilitator agent to moderate all group rituals.",
    ],
    actionItemIds: [
      "action-product-map",
      "action-engine-approval",
      "action-design-cockpit",
    ],
    notes: [
      "The company record lives in notes, actions, and decisions rather than raw transcript alone.",
      "Agents should feel accountable in ritual rooms, not just helpful in chat.",
    ],
  };

  const actionItems: ActionItem[] = [
    {
      id: "action-product-map",
      ownerAgentId: "agent-mira",
      sourceMeetingId: kickoffMeeting.id,
      title: "Turn kickoff decisions into a visible execution map.",
      dueLabel: "Before next weekly",
      status: "open",
    },
    {
      id: "action-engine-approval",
      ownerAgentId: "agent-jonah",
      sourceMeetingId: kickoffMeeting.id,
      title: "Encode approval gates for scope, priority, and publish-ready artifacts.",
      dueLabel: "Before next daily",
      status: "open",
    },
    {
      id: "action-design-cockpit",
      ownerAgentId: "agent-sora",
      sourceMeetingId: kickoffMeeting.id,
      title: "Refine the cockpit so chat, rituals, and approvals live in one rhythm.",
      dueLabel: "Before next founder review",
      status: "open",
    },
  ];

  const threads: ConversationThread[] = [
    {
      id: "thread-mira",
      agentId: "agent-mira",
      messages: [
        {
          id: "msg-mira-hello",
          sender: "agent",
          senderId: "agent-mira",
          createdAt: futureIso(-6 * HOUR),
          text: "I’ve translated the kickoff into a product boundary: one company, visible approvals, ritual-first accountability.",
        },
      ],
    },
    {
      id: "thread-jonah",
      agentId: "agent-jonah",
      messages: [
        {
          id: "msg-jonah-hello",
          sender: "agent",
          senderId: "agent-jonah",
          createdAt: futureIso(-5 * HOUR),
          text: "The biggest engineering risk is hidden state. I’m keeping memory, approvals, and meeting artifacts inspectable from day one.",
        },
      ],
    },
    {
      id: "thread-sora",
      agentId: "agent-sora",
      messages: [
        {
          id: "msg-sora-hello",
          sender: "agent",
          senderId: "agent-sora",
          createdAt: futureIso(-4 * HOUR),
          text: "I’m shaping the workspace like a command deck: clear hierarchy, low chrome, and strong ritual visibility.",
        },
      ],
    },
  ];

  return {
    version: APP_VERSION,
    company,
    facilitator: facilitatorProfile,
    agents,
    workItems,
    artifacts: [
      {
        id: "artifact-charter-map",
        type: "brief",
        authorAgentId: "agent-mira",
        relatedWorkItemId: "work-product-charter",
        contentRef: "memory://brief/charter-map",
        summary: "Condensed the company mission and approval model into a founder-facing execution map.",
        createdAt: futureIso(-3 * HOUR),
      },
      {
        id: "artifact-cockpit-layout",
        type: "design",
        authorAgentId: "agent-sora",
        relatedWorkItemId: "work-design-cockpit",
        contentRef: "memory://design/cockpit-layout",
        summary: "Outlined a three-pane cockpit for agents, rituals, and approval review.",
        createdAt: futureIso(-2 * HOUR),
      },
    ],
    meetingTemplates,
    meetings: [kickoffMeeting],
    actionItems,
    memoryEntries: memories,
    approvals: [
      {
        id: "approval-design-cockpit",
        kind: "artifact_publish",
        title: "Approve the cockpit layout direction",
        description: "Sora is ready to treat the three-pane cockpit as the canonical interaction model.",
        sourceAgentId: "agent-sora",
        relatedWorkItemId: "work-design-cockpit",
        artifactId: "artifact-cockpit-layout",
        createdAt: futureIso(-90 * 60 * 1000),
        status: "pending",
      },
    ],
    threads,
  };
}
