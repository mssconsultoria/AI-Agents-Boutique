# Case Study

## Product framing

`AI Agents Boutique` explores a simple question: what if AI agents behaved less like isolated assistants and more like a small company with operating rituals, visible ownership, and human approval at the right moments?

Instead of aiming for breadth, the product stays narrow and opinionated:

- one company
- one founder
- three specialist workers
- one facilitator agent
- one shared operating memory

That constraint gives the prototype a strong point of view and makes the interaction model easy to understand in a portfolio review.

## Experience design

The app is built around four complementary surfaces:

1. `Command deck` gives the founder a fast operational read on the business.
2. `1:1 lines` supports direct coaching and status checks with each worker.
3. `Ritual rooms` turn meetings into reusable product objects instead of throwaway text.
4. `Work loop` shows what happens between rituals, including artifacts, approvals, and action debt.

The persistent context rail keeps the system feeling alive by exposing upcoming rituals, approval pressure, open actions, and recent decisions at all times.

## Implementation choices

### 1. Explicit domain state

The core state is modeled with first-class types for:

- agents
- work items
- artifacts
- meetings
- approvals
- action items
- memory entries

This keeps the prototype legible and makes it feel closer to a product system than a collection of ad hoc components.

### 2. Reducer plus domain engine

UI interactions dispatch actions into a reducer, and the reducer delegates meaningful transitions to the engine layer in `src/lib/engine.ts`.

That separation helps the codebase read well in a portfolio context:

- components stay focused on interface concerns
- state transitions stay centralized
- business rules stay testable

### 3. Shareable ritual recaps without a backend

One of the strongest product details is the ability to open a ritual recap in a read-only mode directly from a URL payload. It is a small feature, but it communicates product maturity:

- meetings become artifacts
- artifacts become shareable
- share mode is resilient to older payloads

### 4. Self-contained demoability

The app stores state in `localStorage` and runs without any external API. That makes it unusually easy for reviewers to clone, run, and understand the project quickly.

## What I would build next

- Replace seeded simulation with real agent execution and tool orchestration.
- Add timeline playback so a founder can scrub through decisions over time.
- Introduce multi-company support without losing the clarity of the current single-company model.
- Add richer analytics around ritual quality, approval latency, and action closure rate.

## What this repo now optimizes for

- fast first impression on GitHub
- clear product narrative
- clean project hygiene
- easy local setup
- visible engineering quality through tests and CI
