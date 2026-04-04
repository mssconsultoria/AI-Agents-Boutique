import type { AgentConnectorAssignment, IntegrationIntent } from "./connector-types";
import type {
  ActionItem,
  AgentProfile,
  Company,
  MeetingSession,
  MemoryEntry,
  WorkItem,
} from "../types";

interface BuildIntegrationPromptInput {
  intent: IntegrationIntent;
  company: Company;
  agent: AgentProfile;
  founderAsk: string;
  workItems: WorkItem[];
  actionItems: ActionItem[];
  memoryEntries: MemoryEntry[];
  meetings: MeetingSession[];
}

function getAgentWork(workItems: WorkItem[], agentId: string) {
  return workItems.filter((item) => item.ownerAgentId === agentId && item.status !== "done");
}

function getAgentActions(actionItems: ActionItem[], agentId: string) {
  return actionItems.filter((item) => item.ownerAgentId === agentId && item.status === "open");
}

function getAgentMemories(memoryEntries: MemoryEntry[], agentId: string) {
  return memoryEntries.filter((entry) => entry.agentId === agentId).slice(-3);
}

function getRecentMeeting(meetings: MeetingSession[], agentId: string) {
  return meetings.filter((meeting) => meeting.participantIds.includes(agentId)).at(-1);
}

function intentInstruction(intent: IntegrationIntent) {
  switch (intent) {
    case "direct_chat":
      return "Respond as this worker in a direct founder chat. Be concise, concrete, and accountable.";
    case "1:1":
      return "Respond as this worker during a founder 1:1. Cover wins, blockers, risks, and the next commitment.";
    case "daily":
      return "Respond as this worker during the daily. Use the structure: yesterday, today, blockers.";
    case "weekly":
      return "Respond as this worker during the weekly. Cover priorities, risks, decisions needed, and next commitments.";
    case "retro":
      return "Respond as this worker during the retro. Cover what worked, what failed, and one improvement.";
    case "lessons learned":
      return "Respond as this worker in a lessons learned ritual. Extract reusable lessons, guardrails, and follow-up actions.";
  }
}

export function buildIntegrationPrompt({
  intent,
  company,
  agent,
  founderAsk,
  workItems,
  actionItems,
  memoryEntries,
  meetings,
}: BuildIntegrationPromptInput) {
  const activeWork = getAgentWork(workItems, agent.id);
  const openActions = getAgentActions(actionItems, agent.id);
  const recentMemories = getAgentMemories(memoryEntries, agent.id);
  const recentMeeting = getRecentMeeting(meetings, agent.id);

  return [
    `You are ${agent.name}, ${agent.role} for ${company.name}.`,
    `Department: ${agent.department}. Persona: ${agent.persona}.`,
    `Founder: ${company.founderName}. Company mission: ${company.mission}`,
    intentInstruction(intent),
    "",
    "Current company goals:",
    ...company.currentGoals.map((goal) => `- ${goal}`),
    "",
    "Your current work queue:",
    ...(activeWork.length > 0
      ? activeWork.map(
          (item) =>
            `- ${item.title} | status=${item.status} | project=${item.project} | outcome=${item.lastOutcome}${item.blockers[0] ? ` | blocker=${item.blockers[0]}` : ""}`,
        )
      : ["- No active work items."]),
    "",
    "Your open ritual actions:",
    ...(openActions.length > 0
      ? openActions.map((action) => `- ${action.title} | due=${action.dueLabel}`)
      : ["- No open actions."]),
    "",
    "Recent memory:",
    ...(recentMemories.length > 0
      ? recentMemories.map((entry) => `- [${entry.category}] ${entry.content}`)
      : ["- No recent memory entries."]),
    "",
    "Most recent ritual context:",
    recentMeeting
      ? `- ${recentMeeting.ritualType} summary: ${recentMeeting.summary}`
      : "- No recent ritual context.",
    "",
    "Founder ask:",
    founderAsk.trim() || "Give the most useful current update for this ritual.",
    "",
    "Rules:",
    "- Stay in character as the assigned worker.",
    "- Speak in first person.",
    "- Be specific about blockers, commitments, and decisions.",
    "- Do not describe yourself as an AI assistant.",
  ].join("\n");
}

export function getAssignmentForAgent(
  assignments: AgentConnectorAssignment[],
  agentId: string,
) {
  return assignments.find((assignment) => assignment.agentId === agentId) ?? null;
}
