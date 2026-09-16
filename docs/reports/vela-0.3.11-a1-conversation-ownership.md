# Vela 0.3.11-A1 — Conversation Ownership Root

Status: **COMPLETE / SEALED** (2026-09-06). Full offline regression PASS; targeted real-AE acceptance **5/5 PASS**, confirmed by the user. Package VERSION remains 0.3.6. Frozen architecture amendment: NONE.

## A. Root cause and ownership change

The production composition root previously represented the only conversation implicitly through its current AgentRuntimeOwner, exact Agent Session, Runtime and Surface references. Ready Runtime reuse did not require the committed Core generation to match. An initialized replacement could also reuse an Owner whose Driver/Observation ports only attach once.

[VelaConversationOwnership](../../client/js/vela/velaConversationOwnership.js) now associates an independent product identity with the exact AgentRuntimeOwner, Agent Session and initialized Runtime. [main.js](../../client/js/main.js) retains one private current binding and its panel/Core generation. This is a correlation/lifecycle seam, not an authority owner, conversation manager, execution scheduler or persistence store.

## B. Exact production files

- `client/js/vela/velaConversationOwnership.js`: new thin ownership module.
- `client/js/main.js`: private current binding, transactional creation/publication, Core replacement and shutdown invalidation.
- `client/index.html`: static module load before main; unified frontend cache query updated to `20260906-vela-0.3.11-a1`.

No Runtime, AgentRuntimeOwner, Driver, Provider, Review, Authority, Host or PresentationModel implementation is changed. SurfaceController is disposed/recreated through its existing lifecycle when the entire committed bundle is replaced; PresentationModel remains owned by SurfaceController.

## C. Conversation identity

`conversation_<128-bit random hex>_<module-local serial>` is a new namespace. It does not derive from Session, Agent, Scope, Turn, objective, task, plan, Provider request, generation, reasoning invocation, presentation turn, Review, grant, activation or execution identities.

The random component separates page/module lifetimes; the serial ensures uniqueness within one module even if random bytes repeat. The environment-independent module receives a byte-filler from the trusted composition root; production main uses `window.crypto.getRandomValues`, while tests inject Node entropy. Creation fails closed if randomness is unavailable or the serial is exhausted. It is a correlation id, not a secret or a security capability.

The frozen handle exposes only `conversationId`. A private, module-owned WeakMap associates the handle object with a shallow-frozen bundle. The trusted objects themselves are neither cloned nor recursively frozen. Re-evaluating the browser script preserves the existing module/handle namespace without using or altering CEP CommonJS globals.

## D. Ownership and lifecycle contract

API:

- `createOwnership({agentOwner, session, runtime}, fillRandomValues)`: require the Owner's exact live Session and ready Runtime; returns a new frozen handle. The second argument is the composition root's entropy source. No caller-supplied id or restore option.
- `readBinding(handle)`: returns the same shallow-frozen association while live; throws `CONVERSATION_OWNER_STALE` for unknown/disposed/invalidated handles.
- `isLive(handle)`: false for unknown, disposed, closed-Session, disposed-Owner or disposed-Runtime associations. Observed invalidation is terminal.
- `dispose(handle)`: invalidates the record and drops its bundle reference; idempotent. It does not invoke the underlying Runtime, Agent or any execution operation.

The module verifies exact Owner-to-Session association. Runtime-to-Session construction provenance remains the trusted composition root's responsibility: main passes the very same Session object to `Runtime.createRuntime({exactAgentSession})` and to ownership creation. No new Runtime introspection/authority API is introduced.

Production initialization:

1. Obtain/create the exact AgentRuntimeOwner and Session using existing initialization.
2. Construct Runtime with that Session; await existing Runtime initialization.
3. Revalidate the pending transaction, panel/Core generation and Owner identity.
4. Create the conversation handle; connect the existing Observation/Driver/Review ports.
5. Recheck liveness/generation; publish the sole frozen current conversation binding, then mount the existing Surface.

Same-generation ready notifications reuse the same binding/id. Failed or superseded candidates never publish. A stale candidate's late settlement cannot replace the current binding.

On committed Core invalidation/replacement, main first clears and disposes conversation ownership, then disposes the existing Surface controller, Runtime and Agent owner in that order. A replacement gets a fresh Owner, exact Session, Runtime and conversation handle. Panel shutdown likewise revokes ownership before the existing disposal sequence. No old handle can become current again by reassigning an old record.

Surface hiding is not conversation disposal. Runtime `resetSession()` is not a new conversation. There is no second production record, selector, switch operation, history restore or concurrent-objective policy in A1.

Revoking an ownership handle is not a mechanism for revoking previously obtained JavaScript references to trusted Runtime objects. Their existing lifecycle/authority guards remain responsible; main performs actual Runtime/Owner disposal. In particular, calling this module's `dispose` alone must not fabricate cancellation, resolve Review or change TaskRun/Grant state.

## E. Authority boundary

String equality cannot retrieve a bundle: there is no lookup-by-id or restore API, and copied/forged handle objects are absent from the private WeakMap. A new record cannot reuse an old id through caller options. A fresh page cannot recognize a prior page's handle.

The seam never calls Session append, authority event appenders, PlanStore, GrantStore, activation gates, Review resolution, capture builders or TaskRun arming. It does not register conversation identities as Authority evidence. It cannot reconstruct trusted Session identity or recover execution capability. Existing Session/Authority/Plan/Bridge trust registries are unchanged.

The [frozen Agent architecture](../design/vela-agent-architecture.md) remains intact: Surface does not own Agent lifecycle; TaskPlan is not executable; Authority evidence remains separately validated; target binding stays JIT; fresh capture/CAS/Preflight/Verify stay unchanged. The streaming event wire schema and terminal-validation boundary are unchanged.

## F. Focused regression

[test-vela-conversation-ownership.js](../../scripts/test-vela-conversation-ownership.js) covers independent/stable identities, repeated internal ids, exact references, immutable binding, caller-option mutation, disposal, stale and forged handles, no revive-by-id, duplicate browser script loading, foreign/reloaded module handles, randomness failure, actual main initialization/Core replacement, delayed old candidates and failed publication. It also exercises real production JS Owner/Runtime/Session/Review integration over simulated Host/Provider boundaries.

Three immutable sealed-baseline comparisons use git revision `4d2f544`: text objective, approved mutation with Verify, and active Provider cancellation. The entire recorded Provider wire/canonical requests, Host requests, Session events, Driver snapshot, A5 selection evidence and simulated AE state are compared exactly. These are offline fixtures, not real AE evidence.

Executed results: **74 ownership assertions PASS**, including the three immutable baseline comparisons and actual production shutdown-body execution with disposal-order/early-invalidation checks. Existing directly related regressions also passed: Surface bootstrap 31 assertions, Agent production lifecycle 34, AgentRuntimeOwner 70, Runtime 93, AgentRuntime 151, SessionRuntime 92, Runtime status 14 and browser bootstrap 39. All are also covered by the successful full run.

## G. Full regression

`node scripts/run-all-tests.js`: **177/177 runnable suites PASS; 0/177 skipped**. This is the actual A1 execution result, not the previous 176-suite baseline.

The initial full run was 176/177: the unchanged environment-independence test rejected a direct Node crypto dependency in the new module. Entropy was moved to the composition root and injected into the pure module; the test was not weakened. The final full run above passed after that correction and the final focused-test additions.

Syntax checks for all changed/new JavaScript, generated i18n freshness, project consistency, 44 local documentation links and `git diff --check` passed. The generated report needed no update. A unified frontend cache query was retained as required by project consistency.

Vela forward/reverse/forward order verification: **89/89 suites PASS in each of all three rounds**, each suite in a fresh Node process, no failures. This supplements the focused browser duplicate-module/reload tests; it does not claim three live CEP executions. Local ignored execution logs are `.tmp-vela-a1-full-final.log`, `.tmp-vela-a1-order.log` and `.tmp-vela-a1-consistency.log`.

## H. Remaining UNKNOWNs

No unresolved A1 acceptance blocker remains. Real CEP initialization, crypto availability, normal objectives, Review/Execute/Verify, streaming cancellation and panel close/reopen were exercised successfully.

Private conversation handles and exact object identity were not exposed through new AE diagnostics. Their invariants are established by the focused offline tests and composition-root implementation; real AE confirms fresh page/Runtime initialization and non-restoration of prior Review/authority/continuation. This is not a claim that private handle values were directly inspected.

Multiple conversations, switching, memory limits, background work, persistence and cross-turn reasoning retention remain unimplemented and outside A1. Real A5 private selection evidence was not read: A5 coverage uses existing offline PASS, unchanged source and actual Provider wire inspection, without a private diagnostics/read seam.

## I. Targeted real-AE acceptance — PASS

Executed on 2026-09-06 on `codex/vela-0.3.11-a1-conversation-ownership`, using the actual CEP panel through in-app browser DevTools on port 8088, with local Provider `http://127.0.0.1:1234`, model `qwen3.8-27b`. The loaded ownership revision was `vela-conversation-ownership-0.3.11-a1-v1`, frontend cache query `20260906-vela-0.3.11-a1`, Runtime ready and `window.crypto.getRandomValues` available. This is targeted acceptance, not model qualification.

Panel operations used existing UI events and public Runtime/Active Composition/trajectory diagnostics. Temporary Console expressions through `CSInterface.evalScript` read layer values only; mutations used the ordinary Review chain. The user prepared layers, closed/reopened the native AE panel and changed selection. No production debug seam, private read API, transport patch or second Runtime was added. Evidence is the observed DevTools outputs and user confirmation in the acceptance task; no complete raw-log archive is claimed.

| Case | Result | Actual evidence |
| --- | --- | --- |
| 1 — normal objective | PASS | Real text-only request returned the requested `A1-C1-OK` marker; Provider and Agent completed. Reasoning remained a presentation surface marked stream-ended. No bootstrap/ownership/crypto error. |
| 2 — Review execution | PASS | Before approval, selected layer 2 was 100 and layer 1 was 60. Review displayed 100 → 50. One Host commit; fresh committed-target Verify matched 50; one completed/verified step. Readback: layer 2 = 50, layer 1 unchanged at 60. |
| 3 — cancel | PASS | Cancel during observed reasoning streaming: Provider `cancelled / PROVIDER_REQUEST_ABORTED`, Agent `cancelled / AGENT_DRIVER_CANCELLED`. Next objective completed with `A1-C3-NEXT-OK`, no old stream/proposal pollution or `LIFECYCLE_BLOCKED`. |
| 4 — panel/Core reopen | PASS | Pending Review 50 → 60 was not approved. Native close destroyed the old CEP target; reopen created a new page/ready Runtime and ownership composition. Prior Review, authorization and execution continuation did not restore; approve was disabled and trajectory empty. Layer 2 remained 50. Session-only Provider enablement cleared and was re-enabled through Settings. New ordinary objective completed; new Review 50 → 60 produced one Host commit and fresh Verify match, then completed. |
| 5 — Context regression | PASS | Refresh → objective safely discarded obsolete diagnostics while the new objective completed; later diagnostics recovered. Objective → refresh kept Observation and Review on `turn_6`. Actual request wire contained only system instructions, current response contract/grounding and current user input, with no transcript/history/raw reasoning. After selection changed from layer 2 to layer 1, old approval was blocked by `CONTEXT_STALE`, execution/Host invocation both false. Agent requested a new Review, which was rejected; both layers remained 60. |

Distinct Provider request evidence:

- Case 1: `req_046d5edd29021de1c4d1f66675dddf25433e7f9f07e94611151a442ae3295bd2`.
- Case 2: `req_d9be711f35f6af1c729051e3e22f337982c260d3fc2873442fc0714c831ef592`; Verify `req_25c1ae34e5bb5b4d4874bf94c98c5ccf1a09e6824dec6272d9e0f137a72aa285`.
- Case 3 cancelled: `req_591c534868839ac703d98b46ac1c65ec342e7054b922412d1ee7d79e14a67edd`; next completed: `req_26b70db9aedcd11c08ed2775f26eb56f61318e84b56ed37fddb076cd7a85300a`.
- Case 4 prior pending Review: `req_d325da3e27619ada61e6ea89c0787dfc1f29bcf5f0413f93f2f5ccb2b686c399`; fresh text: `req_d2c25f2d671fde6b998522cca100ef23e0be853d3d0b820467db86f07c8e2ed8`; fresh mutation: `req_ae4508ecbfd0ab73e660e73509129a6079c4574eacacb0bba045bd8a2603cc88`; Verify `req_fb845699180b70f1bc5f521fae13133c8c8c4b9c013ee325dc05f95f3b810650`.
- Case 5 wire: `req_1121317467f85e93a829266fcbd46b6eedebae846a42963fdbe1c2aa6b74988d`; drift: `req_036b53260a65ccf9144fb27efc35ac196c8a4f042dfcc8321af1581f238c4586`.

Case 4 CEP target changed from `1A66ECFC879877368628F35061DBD3EA` to `1BE9949604983A0D6FB03B65C140899C`; page time origin changed from `1788702711794.9` to `1788703492398.4`. These identify page lifetimes, not conversation ids. Module-local `session_1` restarting is not evidence of session restoration.

Final state: Runtime ready, no active objective, no pending Review, authorization inactive, Active Composition diagnostics error fields null, both test layers opacity 60. Final diagnostics provenance was `turn_8`, invocation `inv_1_8`, Host reload epoch 2. The drift objective ended `rejected / REVIEW_REJECTED` after its replacement Review was rejected; neither drift attempt invoked Host.

Console: no production errors. One retained `OBSERVATION_RESULT_STALE` warning is the already accepted 0.3.10 obsolete-diagnostics outcome; subsequent reads succeeded. Before reopen, one operator Console expression had a quoting SyntaxError and executed no Host operation; it is not a production defect. A4 real trajectory was normal and bounded. A5 retains offline PASS and unchanged source; the actual wire was checked without adding private diagnostics.

## J. Explicit scope confirmation

Production retains exactly one current live conversation binding. Multiple records are created only in offline unit tests to prove uniqueness/isolation. No second-conversation production creation flow, list, switch, concurrent objectives, PresentationModel ownership migration, persistence, history input, Review suspend/revive, Authority restore or new capability is implemented.

## K. Formal seal conclusion

Formal seal verification on 2026-09-06: `node scripts/run-all-tests.js` again passed **177/177 suites, 0 skipped**, including all 89 Vela suites and the focused ownership/Context/safety regressions. Log: `.tmp-vela-a1-seal-full.log`. Project consistency, generated i18n freshness, syntax for the four A1 changed/new JavaScript files, 44 local documentation links (including anchors), and final diff checks passed. Production files, A1 test files and frozen architecture hashes were unchanged during seal reconciliation. The prior forward/reverse/forward results remain valid; documentation-only sealing did not change loader/order semantics.

**0.3.11-A1 Conversation Ownership Root is COMPLETE / SEALED.** Targeted real-AE acceptance is 5/5 PASS, with no conflict against the A1 lifecycle/authority contract. Production still has exactly one conversation; A1 implements no switching, persistence or Presentation migration. Frozen architecture amendment = **NONE**. Package VERSION remains 0.3.6.

The exact next dependency is **0.3.11-A2 Conversation-owned Presentation**. A2 has not started in this seal reconciliation. The overall 0.3.11 milestone remains IN PROGRESS. No commit, push or merge is part of this seal.
