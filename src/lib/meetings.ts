import type { ActionItem, AgentProfile, MeetingSession } from "../types";

export interface MeetingActionSummary {
  id: string;
  ownerAgentId: string;
  ownerName: string;
  title: string;
  dueLabel: string;
  status: ActionItem["status"];
}

export function getMeetingActions(
  meeting: Pick<MeetingSession, "actionItemIds">,
  actionItems: ActionItem[],
) {
  const actionsById = new Map(actionItems.map((action) => [action.id, action]));

  return meeting.actionItemIds.flatMap((actionId) => {
    const action = actionsById.get(actionId);
    return action ? [action] : [];
  });
}

export function getMeetingActionSummaries(
  meeting: Pick<MeetingSession, "actionItemIds">,
  actionItems: ActionItem[],
  agents: AgentProfile[],
): MeetingActionSummary[] {
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));

  return getMeetingActions(meeting, actionItems).map((action) => ({
    id: action.id,
    ownerAgentId: action.ownerAgentId,
    ownerName: agentsById.get(action.ownerAgentId)?.name ?? "Assigned worker",
    title: action.title,
    dueLabel: action.dueLabel,
    status: action.status,
  }));
}
