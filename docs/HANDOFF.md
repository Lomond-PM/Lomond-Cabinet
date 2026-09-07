# Development Handoff

Current Vela milestone: **0.3.11 — Multi-conversation Foundation**, A1 Conversation Ownership Root COMPLETE / SEALED, offline PASS and targeted real-AE acceptance 5/5 PASS; A2 Conversation-owned Presentation offline and real-AE PASS / COMPLETE / SEALED (Case 6 re-test; response-field UNKNOWN recorded). A3 Source-bound Async & Command Routing is **COMPLETE / SEALED**. Production still has one conversation. The prior **0.3.10 Context Architecture** milestone remains COMPLETE / SEALED.

- [Current project state](PROJECT_STATE.md): implementation defaults, limitations and acceptance status.
- [0.3.11-A3 routing report](reports/vela-0.3.11-a3-source-routing.md): COMPLETE / SEALED, 180/180 offline PASS, 54 focused assertions PASS, six real-AE DevTools cases PASS. Formal seal completed 2026-09-07; exact next dependency: **0.3.11-A4 — Multi-record Runtime Composition** (not started).
- [0.3.11-A2 presentation report](reports/vela-0.3.11-a2-conversation-presentation.md): exact conversation-owned model, Surface injection, 179/179 post-F1 offline suites PASS; six-case real-AE PASS / COMPLETE / SEALED, including Case 6 re-test and its documented evidence limitation. A3 is COMPLETE / SEALED; see the routing report above.
- [0.3.11-A1 ownership report](reports/vela-0.3.11-a1-conversation-ownership.md): exact ownership/lifecycle contract, offline evidence and five-case real-AE PASS / formal seal; no switching, persistence or Presentation migration.
- [Canonical Vela roadmap](VELA_ROADMAP.md): sole current milestone/future-scope authority.
- [Frozen Agent architecture](design/vela-agent-architecture.md): normative boundaries, unchanged; amendment NONE.
- [0.3.9 C2 closure](reports/vela-0.3.9-c2-closure.md): 171/171 offline PASS, user-manual real AE PASS, no correctness blocker. Historical refusal is non-reproduced, not pending acceptance.
- [AGENTS.md](../AGENTS.md): development and validation rules.

Package metadata remains **0.3.6**, latest recorded published tag **v0.3.5**. Feature completion is not a package release. The [0.3.6 closure](design/vela-agent-0.3.6-closure.md) retains that release-preparation history; no release/main/tag operation is authorized by this handoff.

Do not reopen sealed 0.3.9 for provider verbosity, cross-turn history, cards/activity/telemetry or Context implementation. Consult the roadmap for their future ownership. Raw reasoning remains untrusted presentation data and must not become model context, Observation or Authority. Keep historical evidence intact and require separate authorization for commit/push or new implementation work.

A2 acceptance follow-up: [A2-F1 cancellation reasoning reconciliation](reports/vela-0.3.11-a2-f1-cancellation-reasoning.md) repairs a pre-existing terminal-publication ordering defect surfaced by real AE Case 4. F1 offline: 88 focused assertions and 179/179 full suites PASS, 0 skipped. Real-AE 4a–4c, Case 5 and Case 6 re-test PASS. First Case 6 outer-response failure and UNKNOWN rejected field remain documented. A2 and F1 are COMPLETE / SEALED; no further production change was made for the non-reproduced response failure.

A3 seal retains all evidence limits: C1/C2 isolation is offline multi-bundle evidence, not UI switching; Case 5 injected page lifecycle events into actual production handlers, not native close/reopen; real-AE JSON is manually transcribed because raw export was unsupported; trajectory and sealed A2 UNKNOWNs remain; the first cleanup target-mismatch was safely blocked with zero attempts and an uncaptured model value, followed by a verified retry restoring opacity 100. Production code and evidence were unchanged during the documentation seal; the final 180/180 result is reused.
