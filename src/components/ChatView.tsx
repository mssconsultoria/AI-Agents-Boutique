import { useEffect, useRef, useState } from "react";
import type { ActionItem, AgentProfile, ConversationThread, MemoryEntry, WorkItem } from "../types";

interface ChatViewProps {
  agent: AgentProfile;
  thread: ConversationThread | undefined;
  workItems: WorkItem[];
  actionItems: ActionItem[];
  memoryEntries: MemoryEntry[];
  onSend: (agentId: string, text: string) => void;
}

export function ChatView({
  agent,
  thread,
  workItems,
  actionItems,
  memoryEntries,
  onSend,
}: ChatViewProps) {
  const [draft, setDraft] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const activeWork = workItems.filter(
    (workItem) => workItem.ownerAgentId === agent.id && workItem.status !== "done",
  );
  const openActions = actionItems.filter(
    (action) => action.ownerAgentId === agent.id && action.status === "open",
  );
  const recentMemory = memoryEntries
    .filter((memory) => memory.agentId === agent.id)
    .slice(-3)
    .reverse();

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  return (
    <section className="workspace panel-reveal">
      <header className="workspace-header">
        <div>
          <p className="section-kicker">Direct founder line</p>
          <h2>{agent.name}</h2>
          <p className="workspace-copy">
            {agent.role} in {agent.department}. Persona: {agent.persona}.
          </p>
        </div>
      </header>

      <section className="subsection dual-column">
        <div className="chat-column">
          <div className="chat-stream">
            {thread?.messages.map((message) => (
              <article
                key={message.id}
                className={`message-bubble ${message.sender === "founder" ? "is-founder" : "is-agent"}`}
              >
                <span>{message.sender === "founder" ? "Founder" : agent.name}</span>
                <p>{message.text}</p>
              </article>
            ))}
            <div ref={messageEndRef} />
          </div>

          <form
            className="chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) {
                return;
              }

              onSend(agent.id, draft);
              setDraft("");
            }}
          >
            <textarea
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Ask ${agent.name.split(" ")[0]} about status, blockers, plan, approvals, or lessons learned.`}
              rows={4}
              value={draft}
            />
            <button className="primary-button" type="submit">
              Send to {agent.name.split(" ")[0]}
            </button>
          </form>
        </div>

        <div className="context-column">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Current queue</p>
              <h3>What this worker is carrying</h3>
            </div>
          </div>
          <div className="list-stack">
            {activeWork.map((workItem) => (
              <article key={workItem.id} className="list-band">
                <header>
                  <strong>{workItem.title}</strong>
                  <span>{workItem.status}</span>
                </header>
                <p>{workItem.lastOutcome}</p>
                {workItem.blockers[0] ? <p>Blocker: {workItem.blockers[0]}</p> : null}
              </article>
            ))}
          </div>

          <div className="section-heading top-space">
            <div>
              <p className="section-kicker">Open actions</p>
              <h3>Commitments from recent rituals</h3>
            </div>
          </div>
          <ul className="quiet-list">
            {openActions.map((action) => (
              <li key={action.id}>{action.title}</li>
            ))}
          </ul>

          <div className="section-heading top-space">
            <div>
              <p className="section-kicker">Recent memory</p>
              <h3>Continuity for future meetings</h3>
            </div>
          </div>
          <div className="list-stack">
            {recentMemory.map((memory) => (
              <article key={memory.id} className="list-band">
                <header>
                  <strong>{memory.category}</strong>
                  <span>{memory.source}</span>
                </header>
                <p>{memory.content}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
