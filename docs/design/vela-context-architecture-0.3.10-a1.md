# Vela 0.3.10-A1 — Context Taxonomy, Ownership & Lifecycle Contract

Status: A1 design contract recorded; A2–A6 implementation not started.

Baseline: `3619992cce9f51b7667c767b4abd757b32b099a9`; Vela 0.3.9 COMPLETE / SEALED. A0 was delivered as a read-only audit in the originating task, not as a repository file. This document preserves its relevant findings and eleven-question decision ledger with independently inspectable source anchors. A0 reported 11 focused offline suites / 913 assertions PASS; these are historical A0 results, not an A1 rerun or a new full acceptance claim.

Normative precedence: [frozen Agent architecture](vela-agent-architecture.md), especially §§0, 3–9 and 13, remains unchanged. [Canonical roadmap](../VELA_ROADMAP.md) owns sequencing; [project state](../PROJECT_STATE.md) owns implemented behavior; [0.3.9 closure](../reports/vela-0.3.9-c2-closure.md) owns historical acceptance. Architecture amendment: NONE.

## 1. Scope and status vocabulary

**CURRENT** describes code at the baseline. **CONTRACT** defines requirements for subsequent Context work; it does not claim new production behavior. **DEFERRED** identifies an implementation or policy decision not settled here. MUST / MUST NOT below constrain subsequent slices under the frozen architecture.

A1 records taxonomy, ownership, trust, freshness, lifecycle and cross-domain prohibitions. It introduces no ContextManager, Memory, ContextStore, universal Context object, trajectory store, selector, new prompt, conversation runtime or AE capability. Provider messages/capture, Observation behavior, Review/Authority/execution/Verify and reasoning retention remain unchanged. No Observation Window, temporal inference or user-action attribution is designed here.

An owner is the component permitted to produce or advance a domain's canonical state. Being canonical does not grant epistemic or execution authority. Read-only projections may duplicate data without becoming independent sources of truth. Model visibility is a separate allowlist decision, not an automatic consequence of trust or serializability.

## 2. Evidence register and actual path

Links identify files; symbols and baseline line numbers locate the relevant implementation without depending on generated documentation.

| Ref | Source / symbol | Baseline evidence |
| --- | --- | --- |
| E1 | [main.js](../../client/js/main.js), `initializeVelaAgentRuntimeOwner`, Provider `send` (4066, 4294) | Single production Owner/Runtime; message enters Owner.startObjective. |
| E2 | [AgentRuntimeOwner](../../client/js/vela/velaAgentRuntimeOwner.js), `createOwner`, `attachObservationReadPort`, `refreshActiveComposition` | Owns Agent/Driver/Observation runtime; explicit diagnostic refresh also starts a turn. |
| E3 | [AgentRuntime](../../client/js/vela/velaAgentRuntime.js), `createAgent`, `beginTurn`, `dispose` | Session creation; turn increments Agent revision; dispose closes Session. |
| E4 | [AgentObservationRuntime](../../client/js/vela/velaAgentObservationRuntime.js), `beginRefresh` (214), `refresh` (266), snapshot getters (287) | Production capability result is ownership-checked; successful read replaces Observation and Context; getters retain last success after failed refresh. |
| E5 | [ActiveCompositionCapability](../../client/js/vela/velaActiveCompositionCapability.js), `create` (37) | Tier-1 display capture; only active-composition facts and provenance projected. |
| E6 | [AgentDriver](../../client/js/vela/velaAgentDriver.js), `runIteration` (113), `startObjective` (163), `advanceLogicalAfterVerify` (179), `resolveReview` (225) | Objective/cursor/loop ownership; submitted event precedes execution; completion requires verification on mutation paths. |
| E7 | [ProviderController](../../client/js/vela/velaProviderController.js), `send` (291), `summaryFromProjection` (138) | Independent Tier-1 binding plus optional opacity-value read; narrow grounding; current user message only. |
| E8 | [ProviderAdapter](../../client/js/vela/velaProviderAdapter.js), `assembleMessages` (712), `buildRequest` (722), `buildOpenAiBody` (756) | Internal context identity differs from wire messages; immutable request; explicit transport fields. |
| E9 | [ContextBridge](../../client/js/vela/velaContextBridge.js), private records (256), `createPrivateProviderRequestContext` (1525), `compareCaptures` (1603), committed-target ports | Capture provenance, purpose and opaque handles are local; Provider projection does not expose binding authority. |
| E10 | [Host Context](../../host/vela/velaContext.jsx), `reload`, `observeProject`, capture/read functions | Host identity/reload/project boundaries; native targets and observed values. |
| E11 | [Runtime](../../client/js/vela/velaRuntime.js), `captureReviewBarrier`, `continueApprovedReview`, `verifyCommittedAction`, `createAgentDriverRuntimePort`, `resetSession` | Review/continuation identity; logical admission; distinct lifecycle domains; reset is not Agent Session replacement. |
| E12 | [ExecutionPreflight](../../client/js/vela/velaExecutionPreflight.js), `executeStep`, `verifyCommittedValue` (785) | Fresh capture/CAS; already-satisfied skips mutation; opaque execute-time target verification. |
| E13 | [SessionRuntime](../../client/js/vela/velaSessionRuntime.js), `createSessionLog`, `createAuthorityEventAppender`, persistence seams | Append-only typed records; trusted authority provenance is not restored by serialized event shape. |
| E14 | [PresentationModel](../../client/js/vela/velaPresentationModel.js), `begin`, `applyPresentationEvent`, `closeTransientForTerminal`, `reset` | Transcript and transient reasoning have independent ownership; new objective clears old raw reasoning. |
| E15 | [StreamAssembler](../../client/js/vela/velaProviderStreamAssembler.js), `feed`, `finish`; [SurfaceController](../../client/js/vela/velaSurfaceController.js), `send`, `synchronize` | Streaming buffers are presentation/input parsing, not execution context; Surface consumes state. |
| E16 | [AgentCapabilityRuntime](../../client/js/vela/velaAgentCapabilityRuntime.js), `isCurrent`, `invoke`; [HostReadSerializer](../../client/js/vela/velaHostReadSerializer.js), module `tail` | Ownership-gated capability results; module-level serialized host capability reads, not a universal queue for all Bridge callers. |
| E17 | [Protocol](../../client/js/vela/velaProtocol.js), `HARD_LIMITS`; [PlanStore](../../client/js/vela/velaPlan.js), `createPlanStore`; [TaskRun](../../client/js/vela/velaTaskRun.js) | Byte/plan ceilings; replay bookkeeping; process-local executionArmed. |
| E18 | [Known target-continuity issue](../KNOWN_ISSUES.md) — “Vela request-to-Review target continuity” | Request-time proposal is identity-free; Review binds then-current target; no implied fix in A1. |

CURRENT path:

```text
user objective → main → Owner → Driver
  → ObservationRuntime → capability runtime → active-composition display read
  → Runtime.reason({message, endpoint, model})
  → ProviderController independent binding/value reads → narrow grounding
  → Adapter messages / wire body → Provider
  → complete Parser + metadata/profile + Intent Gate admission
  → Driver current intent → Compiler → Policy / local Review / Authority
  → AuthorizedPlan / TaskRun → JIT / Preflight / CAS → Host or already-satisfied
  → fresh Verify → Driver fresh observation / next local step or terminal
```

Driver's Observation is NOT the Provider grounding capture. Current wire messages are system instructions, an assistant JSON string containing `turnResponseContract` and `trustedGrounding`, then the current user message. Internal `{contextId, fingerprint, tier}` is not a standalone wire-body field. Its Tier-1 fingerprint does not represent an atomic digest of an additional property-value capture. No transcript, Session history, previous reasoning or complete trajectory is currently assembled into those messages (E6–E9).

The bounded two-step cursor selects the second intent locally after Verify and a fresh Observation; normal second-step progression does not call Provider. A permitted pre-commit stale retry is bounded and reuses the original message with new grounding, not an injected failure-history prompt. Do not reinterpret these current semantics as missing execution behavior to repair in A1.

## 3. Context domains and ownership matrix

Persistence shorthand: **P0** = process-local, no reload restoration; **H** = Host-owned lifecycle, independent of panel; **F** = future projection only, no store introduced. “Authority-capable: conditional” means only explicitly whitelisted fields through existing trusted owners, never the domain wholesale.

| Domain | Canonical owner / producer | Allowed consumers | Trust / evidentiary meaning | Authority-capable | Model visibility | Lifecycle / persistence |
| --- | --- | --- | --- | --- | --- | --- |
| D1 live AE / Host state | AE; Host read facade produces samples | Host adapters / Bridge | World state exists independently; only successful reads establish observed facts | No direct authorization | No direct visibility | Continuously mutable; H |
| D2 trusted capture / binding evidence | ContextBridge private records backed by Host reads | Narrow Provider projection port, Review, Preflight, Adapter, Verify | Capture provenance and purpose checked; dependency-specific evidence | Conditional target facts only; capture alone is not permission | Only explicit non-authoritative projection, never native binding/handles | Immutable public samples, private validity lifecycle; P0 plus Host correlation |
| D3 Agent Observation | ObservationRuntime; active-composition capability | Driver, explicit read-only observation consumers | Last accepted observed facts with provenance; not execution-fresh by default | No | CURRENT not consumed by Provider; future explicit selection only | Latest successful snapshot replaces previous; P0 |
| D4 objective / trajectory state | Driver; Agent owns Session/Scope/turn identity | Runtime ports, local planner/compiler intent seam, Surface projections | Local control truth and untrusted user intent; not AE facts | No; TaskPlan never executable | Current objective message only; future selected projection requires policy | One active objective/cursor, bounded loop; P0 |
| D5 Provider invocation context | Runtime owns invocation lifetime; Controller produces grounding; Adapter owns final request construction | Adapter/transport; future read-only A2 evidence consumer | Evidence of selected input and construction, not world freshness or authorization | No | Selected payload only; evidence metadata stays local unless explicitly approved | Immutable per invocation; P0, retention policy deferred |
| D6 Provider/model output | Provider produces; Adapter/Controller own parsing/admission | Parser, Intent Gate, Driver admitted declaration, presentation | Untrusted content; validated syntax does not establish AE facts | No | CURRENT no output-history reinjection; reasoning prohibited | Request-scoped raw/transient and admitted proposal lifecycle; P0 |
| D7 Session canonical records | SessionLog; Driver and narrow Authority appenders produce events | Deterministic projections; evidence resolver only through whitelist/provenance | Canonical occurrence record, not uniformly evidentiary | Conditional trusted authority events only | CURRENT none; future allowlisted projection, never raw log by default | Append-only until close; P0; persistence seams do not restore authority |
| D8 conversation / presentation history | PresentationModel / views currently; conversation record owner unassigned | Surface/TranscriptView | User-visible text/notices/errors/reasoning; prose is not verified AE fact | No | CURRENT none; future policy separate from display retention; raw reasoning excluded | Ordinary items retained in instance; reasoning current objective only; P0 |
| D9 Review / Authority / execution evidence | Review barrier/composer, Authority plane, PlanStore, TaskRun, Preflight, Host each own their part | Existing trusted downstream ports | Reviewed semantics, permission provenance, fresh target facts, execution results remain distinct | Conditional through existing Authority and Spine contracts | No authority/nonce/handle material in model context | Claim/consume/invalidate; armed reset on reload; P0 |
| D10 post-execution verified trajectory | Existing Verify owners produce evidence; future read-only projection consumes it, never owns execution | Driver completion; future A4 projection and explicitly allowed selectors | Separates execution disposition from independently verified result | No new authority; historical verified result cannot restore a live authorization | CURRENT none; future explicitly selected factual projection only | Evidence scoped to verification attempt; immutable historical result, F/P0 |
| D11 future observation-history inputs | Future source-specific observation producers; no history owner/store appointed | Future typed read-only consumers after separate scope approval | Observed transition distinct from inferred user operation | No | No current source; later explicit selection only | F; no temporal window/inference/persistence implemented |

D4 identity is not D9 authority: `executionArmed` remains TaskRun-owned. D9 is deliberately not a merged Review/Authority/execution object. Each existing owner retains its contract; a context projection cannot move responsibilities between them.

### 3.1 currentContext decision — RESOLVED IN A1

`AgentObservationRuntime.currentContext` is a **compatibility/read-only projection** of the canonical accepted Observation, owned by the same ObservationRuntime. It is not a second canonical state, not a reserved future universal context, and is not designated deprecated by A1.

Evidence: production `beginRefresh` creates `currentObservation` and `currentContext` from the same validated facts/provenance and revision (E4, lines 238–239). Repository production search finds the `getContextSnapshot` definition, but no consumer. Owner's Driver port reads `getObservationSnapshot` (E2). Refresh failure retains prior values; dispose clears both.

CONTRACT: no independent mutation, freshness clock, persistence or selection authority may be attached to this projection. The getter means last successful projection, not current execution freshness. A2 MUST NOT adopt it as the Provider's canonical input merely because its name contains Context. Keep the production API unchanged; removal or physical deduplication, if later justified, requires a separate focused implementation decision.

## 4. Trust taxonomy and prohibited crossings

Trust is a classification of origin and permitted use, not one ordered level where “higher” grants every permission.

| Class | Meaning | Forbidden inference |
| --- | --- | --- |
| Untrusted content | User/model text, assistant prose, raw reasoning, external textual payload | Text cannot self-declare itself verified or authoritative |
| Validated declaration | Closed schema and metadata/profile/intent checks passed | Validation cannot authorize execution or establish actual AE state |
| Observed fact | Successful local read with provenance and bounded validated output | A past read is not current freshness or proof of who caused a change |
| Local control record | Objective/cursor/Session control occurrence | Control family is not an Authority whitelist |
| Derived/presentation record | Summary, inferred operation, UI projection/notice | Canonical storage or fluent prose cannot turn derivation into evidence |
| Verified outcome | Fresh Verify result tied to the relevant target/attempt and expected value | Verification does not create a reusable permission or prove future state |
| Authority evidence | Explicitly allowed evidence from existing trusted owner/provenance | Serializable shape, copied event or historical grant cannot restore live authority |

CONTRACT prohibitions:

1. Trusted fact does not equal Authority. Observation and invocation snapshots MUST NOT restore execution authority.
2. A serializable context item MUST NOT restore native binding, private capture identity, grant, nonce, reservation, executionArmed or committed-target handle.
3. Session canonical record does not automatically become an evidentiary fact. Fact/control membership is insufficient for Authority consumption.
4. Transcript and assistant prose MUST NOT become verified AE facts. A locally rendered success notice is not a Verify result envelope.
5. Model output, summaries and reasoning MUST NOT produce Authority. Partial structured output is never an execution candidate.
6. Invocation context serves model input and auditing only; it never replaces Review, Preflight, JIT, CAS, Host or Verify.
7. Raw reasoning is prohibited by default from Provider context, Observation, Session evidence, Authority and execution justification. A1 preserves current absence from production Session records and current-objective-only presentation retention. No history selector may silently relax this rule.
8. Payload strings cannot override their local domain/trust metadata. A label such as `trustedGrounding` describes a locally controlled source, not model-supplied authorization.

## 5. Freshness taxonomy

| Class | What it proves | What it does not prove | Owner / validity boundary |
| --- | --- | --- | --- |
| A — last-successful observation | A read succeeded and was accepted under its captured ownership | AE is unchanged now; the sample belongs to the current turn; execution is authorized | Observation owner; retain original provenance even after later read failure |
| B — invocation-selected context | This specific input was selected for this invocation | Provider actually completed/used it; sources were atomic; AE remains unchanged | Controller/Adapter construction, runtime invocation correlation; dispatch/completion status recorded separately |
| C — execution-fresh evidence | The named execution stage freshly checked its declared dependencies | Review freshness carries through later Preflight/JIT, or unrelated targets are fresh | Existing Review/Preflight/JIT/CAS owners; stage and dependency-specific validity |
| D — post-execution verified evidence | Fresh Verify checked outcome after mutation or already-satisfied disposition | A mutation necessarily occurred, the user caused it, or the value will remain true | Verify owner correlated to execution attempt/target; historical evidence only afterward |

No cross-domain `fresh=true` is permitted as a universal claim. Existing API booleans retain their current local semantics; this contract does not rename them. Future projections must include the domain/stage/provenance needed to interpret them. Selected items have class B membership plus their source freshness class: selection never promotes A to C or D. Missing freshness/provenance is explicit unknown, not an inferred success.

| Identity / generation | Meaning; MUST remain independent |
| --- | --- |
| Observation revision | Successful Observation commits, not mutation staleness |
| Agent revision / turn | Agent scope/lifecycle/turn ownership; not conversation identity |
| Provider generation / request id | Provider request correlation and late-result rejection |
| Driver generation | Current objective/retry/cancellation validity |
| Host instance / reload epoch / project generation | Host and project boundary identity, not every AE edit |
| Bridge lifecycle epoch / request generation | Capture lifetime and in-flight request validity |
| Review barrier generation | Review/continuation invalidation |
| Presentation generation / presentationTurnId | Display reconciliation and user-turn anchoring |
| Session seq | Append order within a Session, not world-state revision |

There is no unified `contextGeneration`. A combined audit record may reference multiple identities without making them interchangeable.

## 6. Provider invocation snapshot contract — design only

The logical snapshot is an immutable audit description of one invocation's exact selected input. It may compose explicit multiple sources. It is not a mandatory universal runtime object, storage service, transport schema or new Provider message. A2 chooses the smallest local representation and evidence seam while preserving wire behavior.

Runtime owns the invocation lifetime/correlation. Controller remains producer of current captures/grounding; Adapter remains owner of canonical request and wire construction. An A2 observer may receive a frozen data-only projection, never mutable access to these owners or authority handles. Logical closure occurs once the input is finalized; later dispatch/failure/terminal observations are separate correlated records, not mutation of the selected snapshot.

| Required semantic field | Contract |
| --- | --- |
| Invocation correlation | Identify the exact request and owning runtime lifetime; objective/session/turn links where supplied by a trusted owner. Missing links are explicitly unavailable, not guessed from display order. |
| Source / domain | Explicit source category and producing symbol/component; do not call all inputs Observation. |
| Source identity / provenance | Local capture/invocation/revision references and source-specific provenance; references are evidence labels, not recoverable bindings. |
| Sampling boundary | Identify separate reads and their ordering if known. Timestamp is optional/unknown when not supplied; never invent one or claim atomicity. |
| Trust class | Local taxonomy classification, independent of source payload text. |
| Freshness class | Invocation-selected plus source class and stage/dependencies where applicable. Selection does not refresh the source. |
| Selection reason | Explain current deterministic inclusion/profile/grounding construction; A2 does not implement a new selector. |
| Scope / objective correlation | State known owner scope and objective relation; reused historical material must preserve original provenance, never rewrite it as current. |
| Budget cost | Known byte cost or explicit estimate with unit/method; unknown token cost/capacity stays unknown. A2 must not add token selection. |
| Omission / unavailability | Distinguish not selected, budget omission, upstream unavailable, cancelled/failed source, and not collected. Exact omitted count when known; unknown is not zero. |
| Actual selected representation | Identify the exact content/portion used, or an unambiguous local immutable reference with defined lifetime. A digest alone must not falsely imply recoverable content. |

Composite example (semantic illustration, not a new API): a current invocation may cite Tier-1 capture X for selection/type and property-value capture Y for opacity. These are two samples. The current internal Tier-1 fingerprint cannot be labeled a digest of X+Y, and the preceding Agent Observation Z is not “used by the model” unless actually selected. Capture failure/unavailable grounding retains its actual disposition; no synthetic AE fact is created.

CURRENT messages remain system + assistant contract/grounding + current user. No Session log, transcript, prior reasoning or verified trajectory is added in A1/A2. Capability model visibility remains the frozen minimal projection; no risk/grant/binding internals are exposed. Snapshot metadata is local evidence by default, not prompt content. Request construction does not prove network delivery, and delivery does not prove model attention.

## 7. History-domain separation and verified trajectory

| History domain | Canonical meaning | Reconstruction restriction |
| --- | --- | --- |
| Presentation history | User-visible user/assistant/reasoning/notice/error composition owned by presentation | May omit tool evidence; current reasoning is cleared at new objective; not a complete Session replay |
| Agent / Session canonical record | Typed runtime/control/fact/derived occurrences with seq and provenance | Does not currently contain a complete chat transcript or generic verified-result payload |
| Verified trajectory | Future read-only projection of explicitly differentiated attempt/disposition/verification/completion evidence | Must not infer outcomes from UI strings, model claims, `fact` family or event kind alone |

CURRENT E6 records `agent/action-performed` with phase `submitted` before execution and `tool/result {committed:true}` before final Verify. The confirmed already-satisfied route also reaches this Driver record despite no Host mutation. E12 has richer actual value/digest/matches evidence; Driver post-action events are narrower. These are evidence-projection limitations, not authorization bypass claims or a reopening of sealed 0.3.9. A4 must handle the information loss explicitly, rather than asserting that existing logs can reconstruct missing facts.

Future minimum result semantics are orthogonal dimensions, NOT one enum that overwrites earlier outcomes:

| Semantic state | Minimum interpretation |
| --- | --- |
| submitted | Intent dispatched; no mutation or success claim |
| mutated | Local execution evidence establishes actual mutation; verification may still be pending/failed |
| already-satisfied | Fresh local check found desired value; no unnecessary mutation/Undo; fresh Verify still required |
| verified | Independent fresh Verify matched expected result; preserves mutated versus already-satisfied disposition |
| verification-failed / unverified | Distinguish observed mismatch from unavailable/incomplete verification and preserve stable failure reason; no automatic retry of committed mutation |
| rejected | Review rejected; no permission from that review; prior verified steps remain recorded |
| cancelled | Objective/attempt cancelled; does not assert rollback or that no mutation occurred; unknown commit status remains unknown |
| partial completion | Objective closed with some verified steps completed and remaining steps incomplete; retain counts/step identity and terminal reason |

A4's future projection must correlate objective, logical step, attempt and verification source; preserve known/unknown mutation disposition and verification status; carry provenance adequate for the stated fact without exporting native authority. It cannot retrospectively upgrade sparse historical events. No trajectory store or new Session event schema is implemented by A1.

## 8. Lifecycle / invalidation contract

Vocabulary: **R retain** preserves meaning/provenance, not live permission; **I invalidate** removes eligibility for active use, not necessarily physical bytes; **X replace** creates a newly owned value and invalidates active use of its predecessor; **P presentation-retain-only** allows existing UI retention rules only, no active evidence use; **N not applicable** means no direct lifecycle action/no implemented object. Physical cleanup, retention duration and ordering are separate implementation decisions.

The matrices define future consumer eligibility, not a claim that every existing owner already implements centralized invalidation. Historical canonical events remain historical after I of their live evidence. P never extends current reasoning retention. For D10/D11, these are constraints on future projections, not implemented stores.

### 8.1 Objective and Runtime events

| Domain | Objective terminal | New objective | Cancel | Suspend | Resume | Runtime reset |
| --- | --- | --- | --- | --- | --- | --- |
| D1 live Host state | N | N | N | N | N | N |
| D2 capture/binding | I for completed operation | X when freshly captured | I for cancelled operation | I active use | X before fresh-dependent use | I |
| D3 Observation / currentContext | R as last-successful | R as last-successful; X on refresh | R last success; I cancelled refresh | R last success; I active read | R; X on explicit successful refresh | R historical; no execution freshness |
| D4 objective/cursor | R terminal projection; I continuation | X | I continuation; R outcome | I affected in-flight eligibility | No automatic mutation resume; R outcome | I old execution continuation; not new Agent Session |
| D5 invocation snapshot | R audit only | X active invocation; old R audit only | I in-flight; R constructed input evidence | I in-flight; R evidence | X on new invocation | I in-flight; R evidence only |
| D6 model output/admission | I active admission; P rendered output | X admission; P rendered output | I admission; P rendered output | I active use | X before any new admission | I active use |
| D7 Session records | R | R | R plus actual control events | R | R | R; Session not replaced by this API |
| D8 presentation | P under current rules | R ordinary items; X reasoning domain | P | P | P | N automatic conversation reset |
| D9 Review/Authority/execution | I completed task/operation evidence for reuse | X new operation; no inherited permission | I affected live permission/continuation | I live activation | No automatic restoration; X new valid activation | I live execution state |
| D10 verified trajectory | R historical result | R historical; new attempts distinct | R prior results and cancellation truth | R historical | R historical | R historical; no authority restoration |
| D11 future observation inputs | R provenance only | R provenance only | I pending source; R accepted history | I pending source; R history | New source checks required | I active eligibility; historical provenance unchanged |

D9 rules are scoped to the operation/task whose lifecycle ended. They do not invent global grant revocation on every chat objective or change existing explicit grant lifetime/budget semantics. Read-only historical evidence cannot activate a new task.

### 8.2 Owner / Host / future conversation events

| Domain | Agent dispose | Panel reload | Host reload | Project generation change | Future conversation switch |
| --- | --- | --- | --- | --- | --- |
| D1 live Host state | N | N; Host may survive | X Host identity | X project scope | N |
| D2 capture/binding | I owner access | I old client handles | I old Host evidence | I dependent old project evidence | I cross-owner active reuse |
| D3 Observation / currentContext | I; dispose clears | X fresh runtime, no restore | R last-successful only; I current eligibility | R last-successful only; I current eligibility | I cross-owner use; original provenance retained |
| D4 objective/cursor | I | X; no old armed task | I dependent execution continuation | I dependent execution continuation | I cross-owner continuation; switching policy deferred |
| D5 invocation snapshot | I active; audit lifetime ends with owner unless separately designed | X; no restore in current product | R exact input evidence; no promotion to freshness | R exact input evidence; no promotion to freshness | I cross-conversation reuse without explicit selection |
| D6 model output/admission | I | X | I as evidence of current Host; text remains untrusted | I as evidence of current project | I cross-owner admission |
| D7 Session records | R closed log while referenced | X new in-memory Session | R historical | R historical | R within original owner; canonical owner decision deferred |
| D8 presentation | N separate presentation owner | X | P | P | I display-owner mixing; retention policy deferred |
| D9 Review/Authority/execution | I owner permission | I; armed false | I stale Host-dependent evidence | I stale project-dependent evidence | I inherited active authority; exact switch policy deferred |
| D10 verified trajectory | R only within defined projection lifetime | N durable restore; not implemented | R historical, never current freshness | R historical with original project provenance | I implicit cross-conversation selection |
| D11 future observation inputs | I source owner active use | N durable restore | I old source active eligibility | I old project active eligibility | I implicit cross-owner mixing |

Host/project changes are recognized through existing read/validation boundaries; this matrix does not claim a new immediate push invalidation listener. An old immutable sample may remain useful evidence of the past but cannot satisfy a current dependency check.

CURRENT lifecycle caveats: Runtime.resetSession resets Bridge/Review/plan/grant execution-related state, not Agent Session or presentation. Observation getters keep last success after failures. Runtime logical admission and Driver cursor have separate owners/cleanup paths. Suspend/resume does not mean conversation switch or automatic autonomous task resumption. A6 must verify adapters against these distinctions before claiming conformance; A1 changes no runtime methods.

## 9. Budget ownership matrix

| Budget domain | Current / contract owner | A1 decision / deferred work |
| --- | --- | --- |
| Transport/request byte ceiling | Protocol hard ceilings; Adapter body validation; transport resource enforcement | Keep current limits: request 64 KiB, message 16 KiB subject to other existing validators, response/canonical JSON 256 KiB, stream 4 MiB. These are ceilings, not guaranteed accepted payload sizes or long-context management. |
| Provider input token/context budget | Future invocation assembly policy under Runtime/Provider input ownership | No selector now. Cost estimates must state unit/method; A3 owns capacity policy. Unknown model capacity is unresolved input, never assumed unlimited or zero. |
| Output/generation reserve | Adapter generation policy | Preserve current exact model/profile mapping; A3 defines interaction with input capacity before behavior changes. |
| Reasoning generation budget | Adapter/model-specific generation policy | Distinct from reasoning display retention; currently shares total generation allowance. No A1 tuning or default change. |
| Presentation retention | PresentationModel/view owner | Current ordinary items grow, reasoning resets next objective. UI memory and history retention are not Provider budgets; no A1 truncation change. |
| Session/verified-history retention | Session owner; future verified projection owner constrained by provenance | Current append-only in-memory Session has no unified item cap; A4/A5 define projections, A6 tests growth. Canonical retention cannot silently become selector compaction. |
| Replay/security bookkeeping retention | PlanStore, Bridge, Authority/Guard owners | Preserve replay/lifetime guarantees. A context byte/token policy MUST NOT delete security records to meet a prompt budget. Safe lifecycle cleanup requires its own evidence. |

No A1 token selector, compactor or universal budget manager is introduced. Budget omission is distinct from unavailable upstream data. A future summary is derived, must be smaller with deterministic fallback under frozen §10, and must not gain authority; A1 does not introduce summaries.

## 10. Future conversation boundary — 0.3.11 inheritance

Conversation identity is not Agent revision, Session seq, Provider generation, objectiveId or presentationTurnId. Identifiers must be interpreted within their owner/lifetime; module counters are not durable global conversation keys.

PresentationModel, Session, Driver, Bridge and the module-level serializer cannot be declared isolated merely by adding conversationId. D5 needs explicit invocation ownership; D9 still needs independent trusted authority and fresh execution evidence. A global Host scheduler, if retained, is shared infrastructure, not shared conversation truth.

0.3.11 owns conversation canonical-record ownership, switch scheduling, cancellation-versus-suspension policy and cross-conversation presentation behavior. A1 mandates no implicit cross-owner context/authority reuse; it does not implement concurrent conversations, a conversation store, durable restoration or switch handlers.

## 11. Deferred decision ledger — all eleven A0 unknowns

Each row has one primary disposition. A resolved classification can still require later implementation verification; no runtime evidence is fabricated by a design decision.

| A0 unknown | Primary disposition | A1 resolution / remaining decision |
| --- | --- | --- |
| U1 Provider independent AE read versus Observation projection | DEFER TO A2 | Preserve independent capture in A2; evidence seam must identify actual sources. Any later source substitution remains separately reviewed, not implicit in A2. |
| U2 currentContext role | RESOLVED IN A1 | Compatibility/read-only projection; no independent canonical state, deletion or reserved universal role (§3.1). |
| U3 last-successful snapshot invalidation | RESOLVED IN A1 | A/B/C/D freshness and consumer eligibility defined (§§5, 8). Getter behavior unchanged; A6 verifies lifecycle conformance, not an implied new freshness envelope. |
| U4 request-to-Review continuity | DEFER TO A6 | Preserve known behavior; A6 gathers continuity evidence and produces an explicit design decision. No target lock/new rejection policy authorized by A1/A2. If changing semantics is needed, scope separately. |
| U5 minimum verified-result evidence | DEFER TO A4 | State dimensions fixed in §7; exact projection schema and availability of source evidence require A4 design. Missing historical evidence remains unknown. |
| U6 conversation canonical owner | DEFER TO 0.3.11 | Session, presentation and verified trajectory are separate; no reconstruction equivalence. |
| U7 cross-objective Provider context selection | DEFER TO A5 | Current input unchanged; future allowlist/order/conflict/staleness rules need design. Raw reasoning remains excluded. |
| U8 unknown model capacity | DEFER TO A3 | Unresolved input explicitly represented; no guessed capacity or implicit unlimited default. |
| U9 long-term retention versus security | DEFER TO A6 | Budget ownership separated in §9; growth measurements/cleanup guarantees not established. A3/A4/A5 may define their own local policies but cannot prune replay truth. |
| U10 conversation scheduling/identity isolation | DEFER TO 0.3.11 | Inheritance constraints fixed in §10; no parallel conversation runtime in 0.3.10. |
| U11 real AE contention/long-running cost | DEFER TO A6 | Requires real AE evidence under a separately scheduled acceptance pass. A0/A1 did not operate AE or prove real-provider/Host concurrency performance. |

## 12. Updated focused slices A2–A6

| Slice | Scope / owner boundary | Acceptance evidence | Explicit exclusions |
| --- | --- | --- | --- |
| A2 — Provider Context Assembly Evidence Seam | Minimal local immutable projection of CURRENT Controller/Adapter input construction; actual capture/provenance/correlation, selected representation, unavailable/omission status, known byte costs | Compare existing request bodies/profile/schema before and after; distinguish multiple reads; failure/cancel/late-result evidence cannot alter admission; no reasoning in snapshot | No capture substitution, new prompt/history, token selector, execution or Authority change |
| A3 — Context Budget Contract and Policy | Resolve capacity input and input/output/reasoning budget relationship under Adapter/assembly ownership; stage explicit behavior choices after design | Known/unknown capacity cases, byte versus estimated-token accounting, reserves, fail/omission disposition; exact model behavior changes separately reviewed | No universal budget object, capability expansion, silent prompt truncation, security pruning |
| A4 — Verified Trajectory Evidence Projection | Read-only projection from existing local execution and Verify owners; explicit attempt/disposition/verification/partial-completion provenance | Submitted is not mutated; no-op plus Verify distinguished; mismatch/unavailable/cancel-after-commit retain truth; sparse history remains unknown | No trajectory store, retroactive fact invention, altered Verify/Review/Authority semantics |
| A5 — Bounded Context Selection | After explicit policy review, select allowed objective and factual projections with provenance, ordering, conflicts and omission evidence; compose through A2 and A3 | Exact selected input assertions, stale-source handling, cross-objective negative cases, reasoning exclusion, current user remains edit-parameter source | No raw log/transcript injection by default, temporal inference, multi-conversation, implied authority from history |
| A6 — Lifecycle, Retention and Boundary Acceptance | Verify §§8–10 contracts across owners; inspect long-session growth and real AE read contention; document request-to-Review continuity disposition | New objective/cancel/reset/reload/Host/project and multi-step late-result tests; real AE evidence separately identified; security retention remains intact | No automatic semantic fixes, no claiming real AE PASS from mocks, no conversation implementation |

These slices are proposed focused definitions, not implementation completion. A2 can proceed using this contract without resolving all future history/retention decisions. Any implementation change outside a slice's exclusions requires a new focused scope; irreconcilable frozen-architecture conflict must be reported and stopped under its amendment process, not silently implemented.

## 13. Verification anchors and document acceptance

Existing tests supporting CURRENT behavior (not new A1 tests):

| Test | Evidence relevant to contract |
| --- | --- |
| [Agent observation context](../../scripts/test-vela-agent-observation-context.js) and [active composition observation](../../scripts/test-vela-active-composition-observation.js) | Immutable snapshots, stale ownership rejection; production composition projection distinct from generic historical provider fixture |
| [Agent driver](../../scripts/test-vela-agent-driver.js) | Objective/review identity, finite loop, verification/terminal and late settlement |
| [Provider production E2E](../../scripts/test-vela-provider-production-e2e.js) | Execute-time target verification (around 216–225), reasoning exclusion (452–481), multistep/no-op/partial completion (600–647) |
| [Session runtime](../../scripts/test-vela-session-runtime.js) | Typed canonical records, authority provenance and in-memory semantics |
| [JIT binding](../../scripts/test-vela-jit-binding.js) | Fresh dependency binding, no durable target authorization |
| [Stream publication](../../scripts/test-vela-provider-stream-publication.js) and [stream lifecycle](../../scripts/test-vela-provider-stream-lifecycle.js) | Publication/cancellation correlation separate from terminal admission |
| [Presentation streaming](../../scripts/test-vela-presentation-model-streaming.js) and [transcript reasoning](../../scripts/test-vela-transcript-reasoning.js) | Transient presentation separation and retention rules |
| [Response budget](../../scripts/test-vela-response-budget.js) | Byte/resource and existing generation-policy boundaries, not long-context selection |

A1 acceptance is documentation-only: project consistency, generated i18n report freshness, internal-link target checks and diff checks. No production/test files or frozen architecture are changed, no new tests are needed to restate existing behavior, and no full offline/real AE requalification is implied. Validation command results belong to the task handoff; future slices must report their own evidence.
