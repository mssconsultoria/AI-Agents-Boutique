export type Department = "Product" | "Engineering" | "Design";
export type RitualType =
  | "1:1"
  | "daily"
  | "weekly"
  | "retro"
  | "lessons learned";
export type WorkStatus =
  | "planned"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done";
export type ApprovalKind =
  | "priority_shift"
  | "scope_change"
  | "artifact_publish";
export type ViewMode = "dashboard" | "chat" | "rituals" | "work";

export interface Company {
  id: string;
  name: string;
  founderName: string;
  mission: string;
  currentGoals: string[];
  departments: Department[];
  projects: string[];
  ritualSettings: RitualSetting[];
}

export interface RitualSetting {
  ritualType: RitualType;
  cadenceLabel: string;
  nextRunAt: string;
  participantMode: "solo" | "team";
  participantAgentIds: string[];
}

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  department: Department;
  persona: string;
  capabilities: string[];
  manager: "founder";
  goals: string[];
  currentFocus: string;
  status: "focused" | "blocked" | "reviewing";
  energy: number;
  lastUpdatedAt: string;
}

export interface FacilitatorProfile {
  id: string;
  name: string;
  title: string;
  tone: string;
  responsibilities: string[];
}

export interface WorkItem {
  id: string;
  title: string;
  ownerAgentId: string;
  project: string;
  status: WorkStatus;
  priority: "high" | "medium" | "low";
  blockers: string[];
  linkedArtifactIds: string[];
  approvalRequired: boolean;
  dueLabel: string;
  lastOutcome: string;
  commitments: string[];
}

export interface Artifact {
  id: string;
  type: "brief" | "spec" | "design" | "prototype" | "review" | "decision";
  authorAgentId: string;
  relatedWorkItemId: string;
  contentRef: string;
  summary: string;
  createdAt: string;
}

export interface MeetingTemplate {
  ritualType: RitualType;
  participantMode: "solo" | "team";
  agendaStructure: string[];
  cadenceLabel: string;
  expectedOutputs: string[];
}

export interface TranscriptTurn {
  id: string;
  speakerId: string;
  speakerName: string;
  kind: "facilitator" | "founder" | "agent";
  text: string;
}

export interface MeetingSession {
  id: string;
  ritualType: RitualType;
  participantIds: string[];
  startedAt: string;
  agenda: string[];
  transcript: TranscriptTurn[];
  summary: string;
  decisions: string[];
  actionItemIds: string[];
  notes: string[];
}

export interface ActionItem {
  id: string;
  ownerAgentId: string;
  sourceMeetingId: string;
  title: string;
  dueLabel: string;
  status: "open" | "done";
}

export interface MemoryEntry {
  id: string;
  agentId: string;
  category: "profile" | "meeting" | "artifact" | "commitment" | "blocker" | "lesson";
  source: string;
  timestamp: string;
  importance: number;
  content: string;
}

export interface ChatMessage {
  id: string;
  sender: "founder" | "agent";
  senderId: string;
  createdAt: string;
  text: string;
}

export interface ConversationThread {
  id: string;
  agentId: string;
  messages: ChatMessage[];
}

export interface ApprovalItem {
  id: string;
  kind: ApprovalKind;
  title: string;
  description: string;
  sourceAgentId: string;
  relatedWorkItemId: string;
  artifactId?: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

export interface ScheduledRitualPreview {
  ritualType: RitualType;
  nextRunAt: string;
  cadenceLabel: string;
  participantAgentIds: string[];
  preview: string[];
}

export interface AppState {
  version: number;
  company: Company | null;
  facilitator: FacilitatorProfile;
  agents: AgentProfile[];
  workItems: WorkItem[];
  artifacts: Artifact[];
  meetingTemplates: MeetingTemplate[];
  meetings: MeetingSession[];
  actionItems: ActionItem[];
  memoryEntries: MemoryEntry[];
  approvals: ApprovalItem[];
  threads: ConversationThread[];
}
