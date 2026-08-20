---
tags: []
---

# CUE Real-Time Meeting Copilot

## Product & Technical Specification — Foundation Document

**[[STATUS]]:** Initial specification  
**Purpose:** Foundation for an AI coding/[[Architecture]] agent to [[Design]] the target architecture and an incremental implementation plan.  
**Primary reference implementation:** NexQ — https://github.com/naxhq/NexQ  
**Target platforms:** Windows and macOS  
**Preferred first interface:** Rich Terminal User Interface (TUI)

---

## 1. Executive Summary

The project is a **cross-platform, real-time meeting copilot** that listens to a conversation, understands the evolving context, retrieves information that the user prepared before the meeting, and surfaces useful response suggestions while the conversation is happening.

The product is not primarily an English-learning tool, transcription tool, or meeting summarizer. Its central value proposition is:

> **Bring the user's prepared knowledge into the conversation at exactly the right moment.**

A user should be able to prepare notes, documents, positions, likely questions, arguments, technical references, or previous-meeting context before a meeting. During the meeting, the application should listen to both sides of the conversation, detect meaningful conversational moments, retrieve relevant prepared information, and suggest responses aligned with the user's communication style.

Example:

**Meeting topic:** Event-driven architecture  
**Prepared knowledge:** RabbitMQ vs. Kafka, eventual consistency, outbox pattern, shared-database trade-offs, the user's preferred recommendation.

During the conversation:

> Colleague: "Why don't we just use Kafka for everything?"

The application might surface:

> **Suggested response:**  
> "We could, but I don't think Kafka gives us much value here. We mainly need reliable asynchronous communication rather than replayable event streams, so RabbitMQ would probably keep the architecture simpler."

And optionally:

- Kafka becomes more compelling when replayability is required.
- Multiple independent consumers can benefit from durable event streams.
- Avoid introducing extra operational complexity without a concrete requirement.

The assistant should help the user **continue thinking and speaking**, rather than replace the user.

---

## 2. Product Vision

The application should behave as an intelligent, discreet copilot for technical discussions, interviews, sales calls, planning meetings, negotiations, presentations, or any situation in which the user wants prepared information available during a live conversation.

Long-term, the system should combine:

1. Real-time audio capture.
2. Streaming speech-to-text.
3. Speaker/channel awareness.
4. Conversational turn detection.
5. Context and topic tracking.
6. Retrieval from user-provided knowledge.
7. Intelligent intervention decisions.
8. Low-latency AI response generation.
9. Communication-style personalization.
10. Post-meeting analysis and reusable memory.

The initial product should focus only on the smallest subset required to validate the real-time interaction model.

---

## 3. Core Product Principles

### 3.1 User knowledge first

The system should prefer information explicitly provided or prepared by the user over generic LLM knowledge when preparing meeting suggestions.

The LLM should function primarily as:

- a reasoning layer;
- a summarization layer;
- a conversational phrasing layer;
- a personalization layer.

It should not become an uncontrolled source of invented meeting facts.

### 3.2 Proactive but selective

The application must not generate a suggestion after every sentence.

A core intelligence problem is:

> **Should the assistant intervene now?**

The system should surface information when it detects moments such as:

- a direct question addressed to the user;
- a challenge to the user's argument;
- a decision point;
- a topic strongly matching prepared material;
- a request for explanation;
- a factual discussion for which the knowledge base contains relevant material;
- an extended pause after the user has been addressed.

Silence is a valid assistant action.

### 3.3 Low latency is a first-class feature

The usefulness of the application depends heavily on response timing.

A technically correct suggestion that appears several seconds after the user needed it may be useless.

The system should therefore be designed around:

- streaming;
- incremental processing;
- speculative work;
- overlapping pipeline stages;
- measurable latency budgets.

### 3.4 The app should augment, not impersonate

Suggestions should sound natural for the user, but the application should not attempt to autonomously participate in the meeting.

The user remains responsible for:

- deciding whether to use a suggestion;
- speaking;
- making decisions;
- validating factual claims.

### 3.5 Interface and engine should be decoupled

The first client is expected to be a **rich TUI**, but the core system should not depend on a terminal interface.

The design should permit future clients such as:

- native desktop UI;
- floating overlay;
- web dashboard;
- mobile companion;
- IDE integration.

The TUI should be a client of the meeting engine, not the meeting engine itself.

---

## 4. Reference Project: NexQ

NexQ is the main reference implementation for this project:

**Repository:** https://github.com/naxhq/NexQ

The project should **study and extract useful engineering patterns from NexQ**, but should not blindly copy its implementation or architecture.

At the time this specification was prepared, NexQ describes itself as an open-source AI meeting assistant and real-time interview copilot.

Relevant NexQ capabilities include:

- simultaneous microphone ("You") and system-audio ("Them") capture;
- real-time transcription;
- streaming AI answers and follow-up suggestions;
- local document RAG;
- multiple STT providers;
- multiple LLM providers;
- local/offline providers;
- meeting recording;
- speaker labeling;
- an always-on-top meeting overlay;
- local meeting persistence.

### 4.1 NexQ technology choices worth studying

The current NexQ repository documents the following stack:

| Layer       | NexQ                                                         |
| ----------- | ------------------------------------------------------------ |
| Desktop     | Tauri 2 / Rust                                               |
| Frontend    | React, TypeScript, Vite                                      |
| State       | Zustand                                                      |
| Styling     | Tailwind CSS / shadcn/ui                                     |
| Audio       | `cpal`, WASAPI loopback on Windows                           |
| STT         | Whisper, ONNX Runtime, Deepgram, Groq, Web Speech and others |
| LLM         | OpenAI, Anthropic, Groq, Ollama, LM Studio, Gemini           |
| Persistence | SQLite                                                       |

Important repository areas to inspect:

```text
NexQ/
├── src/                  # React frontend
├── src-tauri/            # Rust/Tauri native layer
├── src-tauri/src/
│   └── commands/         # Native commands exposed through Tauri IPC
├── src/stores/           # Frontend state
├── src/hooks/            # React hooks / integrations
├── docs/user-guide/
├── CONTRIBUTING.md
├── CHANGELOG.md
└── [[README]].md
```

### 4.2 NexQ design ideas to consider adopting

The architecture agent should explicitly study whether the following patterns are suitable for this project:

#### Separate microphone and system-audio streams

NexQ captures:

```text
Microphone    -> "You"
System audio  -> "Them"
```

This is considered a highly valuable concept because it can simplify:

- turn detection;
- user/remote speech separation;
- question detection;
- [[Notas de la reunión|transcript]] labeling;
- intervention timing;
- determining whether the user is already speaking.

This should be treated as a strong candidate for a core requirement.

#### Provider abstraction

NexQ supports multiple STT and LLM providers.

Our implementation should avoid tightly coupling the application to one STT, LLM, or embedding provider.

The architecture agent should consider interfaces or ports such as:

```text
SpeechToTextProvider
LanguageModelProvider
EmbeddingProvider
KnowledgeRetriever
```

The exact implementation is intentionally left to the architecture phase.

#### Local-first capability

NexQ supports local STT and LLM execution.

The new product should be designed so that privacy-sensitive users can eventually run as much of the stack locally as practical.

Cloud providers should remain supported because they may offer substantially better latency or quality.

#### Streaming UI

NexQ's live meeting model demonstrates that the application should update continuously rather than wait for completed meeting segments.

---

## 5. Product Differentiation from NexQ

The goal is not to rebuild NexQ feature-for-feature.

The planned product should focus more deeply on **conversation intelligence and contextual intervention**.

The key differentiator should be a dedicated conceptual component:

## Conversation Intelligence Engine

Its responsibility is to continuously evaluate the live conversation and answer questions such as:

- Who is speaking?
- Is this conversational turn complete?
- Is a turn likely to end soon?
- Was the user asked a question?
- What is the current topic?
- Has the topic changed?
- Does the user's prepared knowledge contain relevant material?
- Is the information useful enough to surface?
- Should the assistant intervene?
- Should it stay silent?
- Is the user already responding?
- How urgent is the suggestion?

This component should be considered a major research and engineering area of the project.

---

## 6. Target User Flow

### 6.1 Before the meeting

The user creates or selects a meeting workspace.

Example:

```text
Meeting: Architecture Review

Context:
- architecture.md
- kafka-vs-rabbitmq.md
- decisions.md
- previous-meeting.md

Optional metadata:
- expected participants
- goals
- known disagreements
- likely questions
- user's position
```

The system prepares the information needed for efficient live retrieval.

Expensive indexing or document-processing work should occur before the live meeting whenever possible.

### 6.2 Starting the meeting

A future TUI flow could resemble:

```text
$ copilot start --meeting architecture-review

Loading meeting context...
✓ architecture.md
✓ kafka-vs-rabbitmq.md
✓ decisions.md
✓ previous-meeting.md

Knowledge store: ready
STT: Deepgram
LLM: configured

Audio:
✓ Microphone
✓ System audio

Listening...
```

This syntax is illustrative, not a locked CLI specification.

### 6.3 During the meeting

The system continuously processes:

```text
Audio
  ↓
Streaming transcription
  ↓
Conversation intelligence
  ↓
Relevant moment detected
  ↓
Knowledge retrieval
  ↓
Response generation
  ↓
TUI suggestion
```

The system should expose live transcript information but the primary UX goal is useful contextual assistance.

### 6.4 After the meeting

Post-meeting functionality is not part of the initial MVP, but the architecture should not prevent later addition of:

- meeting summaries;
- decisions;
- action items;
- unanswered questions;
- weak answers;
- reusable meeting knowledge;
- new notes for the user's knowledge base;
- communication-style analysis.

---

## 7. Audio [[Requirements]]

### 7.1 Cross-platform support

Target operating systems:

- Windows
- macOS

Linux may be considered later but is not an initial requirement.

### 7.2 Dual-channel capture

The preferred model is two logical audio streams:

```text
Channel A -> local microphone / user
Channel B -> system/meeting audio / other participants
```

The architecture agent should determine the best cross-platform implementation.

Potential native technologies may include:

**Windows**

- WASAPI loopback

**macOS**

- CoreAudio
- ScreenCaptureKit
- other appropriate native capture APIs

The agent should verify current platform APIs and permission requirements before deciding.

### 7.3 Audio ownership

Native audio capture is expected to remain close to the local client.

Raw meeting audio should not be sent to remote infrastructure unless required by the selected STT provider and explicitly configured.

### 7.4 Meeting recording

Recording the entire meeting is not required for the first milestone.

Live processing must not depend on full-session recording.

---

## 8. Speech-to-Text Requirements

The STT layer should support streaming or near-streaming recognition.

The system should preferably receive:

- partial/interim transcripts;
- final transcripts;
- timestamps;
- confidence when available;
- source channel (`You` / `Them`);
- speaker identifiers when supported.

Provider abstraction is strongly preferred.

Potential providers include:

- Deepgram;
- OpenAI-compatible STT;
- Whisper-based local STT;
- ONNX/local models.

The first implementation should prioritize **latency and reliability** over provider count.

---

## 9. Conversational Turn Detection

Turn detection is one of the main technical challenges.

A naive rule such as:

```text
700 ms silence = end of turn
```

is insufficient because natural speech contains pauses inside incomplete thoughts.

Example:

> "The problem with Kafka is..."  
> [pause]  
> "...that we don't actually need replayability."

The system should eventually consider multiple signals.

### 9.1 Candidate signals

#### Audio signals

- voice activity detection;
- length of silence;
- speech resumption;
- local vs. remote channel activity.

#### Linguistic signals

- syntactic completeness;
- semantic completeness;
- question completion;
- unfinished clauses;
- discourse markers.

#### Conversation signals

- speaker transition;
- another participant starts talking;
- the user begins responding;
- direct address;
- question/answer patterns.

### 9.2 Suggested conceptual state model

An eventual implementation may use states such as:

```text
LISTENING
   ↓
POSSIBLE_END
   ↓
PREPARING
   ↓
TURN_CONFIRMED
   ↓
SURFACE_SUGGESTION
```

During `POSSIBLE_END`, speculative retrieval or generation may begin without showing anything to the user.

A false-positive end-of-turn prediction should therefore be inexpensive.

The architecture agent is free to propose a better state model.

---

## 10. Latency Requirements

Latency is considered a primary non-functional requirement.

The target user experience is:

> A useful suggestion should appear quickly enough that the user can naturally incorporate it into the current conversational turn.

The architecture should measure latency per stage.

Candidate metrics:

```text
Audio capture
STT partial latency
STT finalization latency
Turn-detection latency
Retrieval latency
LLM time-to-first-token
Suggestion rendering latency
End-to-end latency
```

### 10.1 Pipeline strategy

The initial architecture should avoid a strictly sequential pipeline such as:

```text
Wait for finished audio
-> transcribe
-> classify
-> retrieve
-> invoke LLM
-> wait for full answer
-> render
```

Instead it should investigate overlapping work:

```text
Remote speaker talking
        ↓
partial transcript
        ↓
topic / intent estimation starts
        ↓
candidate retrieval starts
        ↓
possible end of turn
        ↓
candidate response preparation
        ↓
turn confirmed
        ↓
stream useful suggestion
```

### 10.2 Initial latency objective

The project should aim toward **sub-second to low-single-digit-second perceived response latency** after a relevant turn ends.

The architecture agent should define realistic latency budgets for the first prototype and later phases instead of treating one fixed number as a hard requirement.

---

## 11. Knowledge & Retrieval

The user should be able to prepare meeting-specific knowledge before a call.

Potential source formats:

- Markdown;
- plain text;
- PDF;
- DOCX;
- selected folders;
- eventually Obsidian vault content.

### 11.1 Source of truth vs retrieval layer

A useful conceptual distinction is:

```text
User documents / Obsidian
        ↓
source of truth

Vector / retrieval store
        ↓
optimized query layer
```

Qdrant is a preferred technology candidate because it matches the developer's existing experience, but the architecture agent should validate whether a vector database is necessary in every phase.

### 11.2 Preprocessing

Expensive work should occur before a meeting whenever possible:

```text
Documents
   ↓
parse
   ↓
chunk
   ↓
embed
   ↓
[[index]]
   ↓
ready for meeting
```

Live meeting queries should not repeatedly re-embed the source corpus.

### 11.3 Retrieval inputs

Retrieval should not necessarily use the raw last sentence.

Possible query context may include:

- current remote-speaker turn;
- previous turn;
- detected topic;
- current question;
- meeting goal;
- user's prepared positions;
- recent conversation summary.

The architecture agent should determine the most efficient retrieval strategy.

---

## 12. Personalization & Communication Style

A later-stage feature should allow suggestions to reflect the user's speaking style.

Examples:

- concise vs detailed;
- recommendation-first vs explanation-first;
- technical vs business language;
- preferred terminology;
- use of examples;
- formality level;
- directness;
- vocabulary complexity.

The goal is:

> Generate something the user could plausibly say.

Not:

> Generate polished generic AI prose.

Personalization is not required for the first technical prototype.

---

## 13. TUI Requirements

The first user interface should be a **modern, visually polished Terminal User Interface**.

The exact framework is intentionally not selected in this document.

The architecture agent should evaluate modern Rust and/or TypeScript TUI frameworks and recommend an implementation.

### 13.1 Primary meeting screen

Conceptual example:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ MEETING COPILOT                            ● Listening    00:14:32    │
├───────────────────────────────┬──────────────────────────────────────┤
│ TRANSCRIPT                    │ SUGGESTED RESPONSE                   │
│                               │                                      │
│ THEM                          │ I'd probably avoid Kafka here        │
│ Why wouldn't we use Kafka     │ unless we actually need replay...   │
│ for everything?               │                                      │
│                               │ Supporting points                    │
│ YOU                           │ • RabbitMQ fits this use case        │
│ Well, I think...              │ • Kafka adds complexity             │
│                               │ • Replayability isn't required      │
├───────────────────────────────┴──────────────────────────────────────┤
│ Context: Event-driven architecture                                  │
│ RAG: 3 notes | latency: 612 ms | turn confidence: 94%               │
├──────────────────────────────────────────────────────────────────────┤
│ [Space] Pause  [R] Retrieve  [S] Suggest  [M] Mute  [Q] Quit         │
└──────────────────────────────────────────────────────────────────────┘
```

### 13.2 Keyboard-first interaction

Possible commands:

```text
j / k      navigate
Enter      expand
r          force retrieval
s          force suggestion
p          pause processing
m          mute local audio processing
c          view retrieved context
t          transcript view
d          diagnostics
q          quit
```

These shortcuts are illustrative and may change.

### 13.3 Diagnostic screen

A dedicated developer/diagnostic view is strongly desirable:

```text
STT partial             182 ms
Turn detection           74 ms
Retrieval               121 ms
LLM TTFT                403 ms
Rendering                11 ms
──────────────────────────────
Observed pipeline        791 ms
```

This feature is particularly important because latency optimization is one of the central engineering goals.

---

## 14. Core Engine / Client Separation

The solution should preferably allow:

```text
meeting-copilot-core
        │
        ├── meeting-copilot-tui
        │
        └── meeting-copilot-desktop   # possible future client
```

This is a conceptual requirement, not a mandated repository structure.

The architecture agent should decide:

- process boundaries;
- IPC strategy;
- whether audio capture belongs in the core or client;
- whether the engine runs locally or partly remotely;
- what should be exposed as interfaces or events.

---

## 15. Backend / Service Preferences

NestJS is a preferred backend technology because this project is also intended to develop practical experience with:

- streaming;
- WebSockets;
- event-driven systems;
- clean service boundaries;
- dependency injection;
- queues;
- observability;
- AI orchestration.

However, the architecture agent should **not force NestJS into components where a local Rust implementation is technically superior**.

The architecture should explicitly decide which responsibilities belong in:

- Rust/native layer;
- TUI/client;
- NestJS backend;
- external AI services;
- local AI providers.

A hybrid architecture is acceptable.

---

## 16. Event-Driven Architecture

Event-driven design is a learning objective, but the project must not introduce RabbitMQ, Kafka, or another broker without a real reason.

The first implementation should prefer the simplest reliable communication mechanism.

A broker should be introduced only when it solves a concrete requirement such as:

- independent asynchronous workloads;
- durable background jobs;
- fan-out;
- retry semantics;
- service decoupling;
- recording/post-processing workloads;
- distributed scaling.

The architecture plan should state **when and why** messaging becomes useful.

---

## 17. [[Security]] & Privacy Requirements

Meeting audio and transcripts are sensitive.

The system should eventually provide clear data-flow transparency.

Users should be able to understand:

- whether audio stays local;
- whether audio is sent to an STT provider;
- whether transcripts are sent to an LLM;
- whether documents are sent to a cloud model;
- what is persisted;
- how to delete stored meetings and indexes.

### 17.1 Secrets

API keys must not be stored in plaintext configuration files.

The architecture agent should use platform-appropriate secure storage where practical.

### 17.2 Local-first mode

A future local-only mode should be possible using combinations such as:

```text
Local audio
+ local STT
+ local retrieval
+ local LLM
```

Cloud-first MVPs are acceptable if they dramatically simplify validation, but local capability must not be architecturally impossible.

### 17.3 Explicit consent

The application must respect operating-system permission models for:

- microphone;
- system audio / screen capture;
- files.

---

## 18. Observability

The system should expose detailed technical metrics during development.

Minimum desired measurements:

- audio chunk timings;
- STT interim/final timing;
- dropped audio chunks;
- STT confidence;
- turn-state transitions;
- retrieval duration;
- retrieved document IDs;
- relevance scores;
- intervention decisions;
- LLM TTFT;
- total suggestion latency;
- errors/retries.

Logs should make the live pipeline understandable without exposing sensitive content by default.

---

## 19. Failure Handling

The app should degrade gracefully.

Examples:

### STT unavailable

- preserve audio pipeline if possible;
- show clear status;
- allow provider restart/switch.

### LLM unavailable

- transcription should continue;
- retrieval may continue;
- no meeting should be lost because generation fails.

### Retrieval unavailable

- optionally produce generic suggestions;
- clearly indicate that prepared context was not used.

### System-audio capture unavailable

- continue with microphone capture if useful;
- show the missing channel clearly.

### High latency

- display diagnostic state;
- avoid showing stale suggestions after the conversation has moved on.

---

## 20. Non-Goals for Initial Prototype

The first technical prototype should **not** attempt to deliver all of the following:

- perfect diarization;
- enterprise authentication;
- multi-user collaboration;
- calendar integration;
- CRM integration;
- mobile clients;
- meeting bots that join calls;
- automatic speaking;
- full meeting analytics;
- advanced personalization;
- every STT provider;
- every LLM provider;
- Linux support;
- enterprise deployment;
- production-grade distributed scalability.

These can be revisited after validating the core live-assistance loop.

---

## 21. First Capability to Validate

Before introducing RAG, LLM generation, brokers, or advanced AI logic, the project should validate the hardest foundational pipeline:

```text
Cross-platform native audio capture
        ↓
Microphone + system audio separation
        ↓
Streaming transport
        ↓
Streaming transcription
        ↓
TUI transcript with You / Them labels
        ↓
Measured latency
```

Success means:

- the application works reliably on Windows;
- the design supports macOS without a rewrite;
- both audio streams are identifiable;
- transcript updates are usable in real time;
- latency is instrumented.

The architecture agent may modify this milestone if it identifies a stronger sequencing strategy, but it should explain the trade-off.

---

## 22. Architecture Questions the Next Agent Must Answer

The next architecture/design agent should explicitly answer the following.

### Process model

1. What executable/processes exist?
2. Which process owns audio capture?
3. Which process owns the TUI?
4. Does the NestJS backend run locally, remotely, or both?
5. How do the components communicate?

### Audio

6. What is the best Windows capture implementation?
7. What is the best macOS implementation?
8. Can one Rust abstraction hide the OS-specific details cleanly?
9. What audio format and chunk size should be used?
10. How is backpressure handled?

### Streaming

11. WebSocket, gRPC, IPC, QUIC, or another transport?
12. How are interim and final transcript events represented?
13. How does the system recover from connection interruptions?

### Turn detection

14. What is the minimum viable turn detector?
15. Which parts should be deterministic vs model-based?
16. When should speculative retrieval start?
17. How are false end-of-turn detections cancelled?

### Intervention

18. How is `shouldIntervene` calculated?
19. What rules prevent suggestion spam?
20. How is a stale suggestion detected and cancelled?

### Retrieval

21. Is Qdrant justified for the first RAG phase?
22. Should a local vector store be used first?
23. What should be indexed before the meeting?
24. What information forms the live retrieval query?
25. How should meeting-specific and global knowledge interact?

### AI providers

26. What STT provider should be used first?
27. Which provider offers the best latency/cost/quality trade-off?
28. Should local Whisper be introduced initially or later?
29. Which LLM should be used for the first live suggestion experiment?
30. Should LLM output be streamed?

### TUI

31. Rust-native TUI or Node/TypeScript TUI?
32. Which framework best supports rich, high-refresh streaming interfaces?
33. How should terminal rendering be decoupled from engine state?

### Persistence

34. What must be persisted in the MVP?
35. SQLite, files, or another local store?
36. What data should never be persisted by default?

### Security

37. How should credentials be stored on Windows and macOS?
38. What cloud-data disclosures should appear in configuration?
39. How can a local-only mode be supported later?

### Event-driven evolution

40. At what phase, if any, does RabbitMQ become justified?
41. Which events are business/domain events vs transient streaming messages?
42. Where would asynchronous processing genuinely improve the design?

### Testing

43. How can live audio behavior be tested reproducibly?
44. How can recorded fixtures simulate meetings?
45. How will turn-detection quality be benchmarked?
46. How will end-to-end latency be benchmarked?

---

## 23. Deliverables Expected from the Architecture Agent

Using this specification as input, the next AI agent should produce:

### A. Architecture proposal

Including:

- high-level architecture diagram;
- process/component boundaries;
- responsibilities;
- communication protocols;
- data flows;
- deployment/local-execution model;
- technology choices;
- rejected alternatives and rationale.

### B. Repository structure

Proposed monorepo or multi-repository organization, including clear boundaries between:

- native/core code;
- TUI;
- NestJS;
- shared contracts;
- tests;
- infrastructure.

### C. Domain/event model

Including:

- key commands;
- streaming messages;
- internal events;
- persisted entities;
- transient state.

### D. Latency strategy

Including explicit budgets and optimization points for:

- audio;
- STT;
- turn detection;
- retrieval;
- LLM;
- UI.

### E. Phased implementation plan

Each phase should:

- produce something runnable;
- add only a small number of new concepts;
- have explicit acceptance criteria;
- include tests;
- state what the developer is expected to learn;
- avoid introducing infrastructure before it is needed.

### F. Risk register

At minimum:

- cross-platform audio;
- permissions;
- STT latency;
- turn-detection accuracy;
- suggestion timing;
- cloud cost;
- privacy;
- model/provider dependency;
- TUI usability.

### G. NexQ code-reading plan

The agent should identify which NexQ modules/files are worth studying for each phase rather than attempting to study the entire repository first.

---

## 24. Guidance for Using NexQ as a Reference

The agent should follow these rules:

1. **Understand before copying.**
2. Prefer concepts and patterns over code duplication.
3. Check NexQ's current implementation before assuming README behavior matches source behavior.
4. Respect the NexQ MIT license and preserve required attribution if code is reused.
5. Note areas where NexQ is optimized for its own product and may not fit this one.
6. Prioritize our requirements over architectural similarity.
7. Keep a running list:

```text
NexQ pattern                 Decision
--------------------------------------------------------
Dual audio streams           Adopt / Adapt / Reject
Tauri frontend               Adopt / Adapt / Reject
Provider abstraction         Adopt / Adapt / Reject
SQLite persistence           Adopt / Adapt / Reject
Local RAG                    Adopt / Adapt / Reject
Overlay UI                   Reject initially (TUI)
...
```

---

## 25. Repository References

### Primary

- NexQ repository: https://github.com/naxhq/NexQ
- NexQ README: https://github.com/naxhq/NexQ/blob/main/README.md
- NexQ source tree: https://github.com/naxhq/NexQ/tree/main/src
- NexQ native/Tauri source: https://github.com/naxhq/NexQ/tree/main/src-tauri
- NexQ contributing guide: https://github.com/naxhq/NexQ/blob/main/CONTRIBUTING.md
- NexQ changelog: https://github.com/naxhq/NexQ/blob/main/CHANGELOG.md

### Areas specifically worth inspecting

- `src-tauri/src/commands/`
- audio capture implementation under `src-tauri/`
- STT routing/provider implementation
- transcript/event propagation
- RAG implementation
- configuration/state synchronization
- provider abstractions
- meeting lifecycle
- latency-related fixes in `CHANGELOG.md`

The repository evolves quickly, so exact filenames should be discovered from the current `main` branch rather than hardcoded from this specification.

---

## 26. Definition of Product Success

The project will be considered technically successful when a user can:

1. launch the application on Windows or macOS;
2. select prepared meeting context;
3. start listening;
4. see accurate live `You` / `Them` transcription;
5. receive relevant suggestions at meaningful conversational moments;
6. see those suggestions soon enough to use naturally;
7. understand which prepared information informed the suggestion;
8. use the application without sending private data to cloud providers unless explicitly configured to do so.

The defining product question is not:

> "Can the AI answer the question?"

It is:

> **"Can the system recognize the right moment, retrieve the right knowledge, and surface a useful response quickly enough that the user can actually use it in a live conversation?"**

That question should guide every architectural and implementation decision.

---

## 27. Initial Design Position

The current working hypothesis is:

```text
Native cross-platform audio layer
        +
Rich TUI as first client
        +
Streaming STT
        +
Conversation Intelligence Engine
        +
Prepared knowledge retrieval
        +
Streaming LLM suggestions
```

with strong interest in:

- Rust for native audio and possibly the TUI;
- NestJS for AI/backend orchestration where justified;
- Qdrant for later knowledge retrieval;
- provider abstraction;
- local-first privacy;
- measurable latency;
- eventual event-driven architecture when real requirements justify it.

These are **design preferences, not immutable architecture decisions**.

The architecture agent is expected to challenge them where appropriate and document the reasoning.

---

# End of Specification
