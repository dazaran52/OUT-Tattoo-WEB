# Orchestrator Handoff: Milestone 2 Backend Pause Logic

## Milestone State
- **Milestone 2 (Backend Pause Logic)**: IN-PROGRESS.
- Iteration 2 has failed. We are moving to Iteration 3.

## Active Subagents
- None. All subagents from Iteration 2 have completed.

## Pending Decisions & Key Constraints
- **CRITICAL**: The user's original requirement (R1) explicitly states that processed emails MUST remain `UNSEEN`. Several Reviewers and Challengers have flagged this as an "infinite polling loop" because IMAP will keep returning them in `search(None, "UNSEEN")`. The Auditor cleared the code because it complies with the user requirement. The successor **MUST NOT** instruct workers to mark emails as `SEEN`. The infinite header polling is an acceptable tradeoff for the manual interception feature.
- **Bugs to fix in Iteration 3**:
  1. Emails without a `Message-ID` crash the skip logic and cause an infinite AI reply loop. A synthetic hash (Date + From + Subject) must be used as a fallback `Message-ID`.
  2. The Worker in Iteration 2 put the Supabase query inside the loop (causing O(N) queries). The query for `is_paused` and `collected_data` MUST happen ONCE before the email loop.
  3. Early commit of `processed_message_ids`: If the ID is added to DB before Gemini/SMTP succeeds, a transient failure causes the email to be dropped permanently. The ID should be committed only after a successful reply, OR a robust retry queue is needed. Since we only want a simple fix: append to DB *after* `send_smtp_reply`.
  4. Race condition upon unpausing: Paused emails must have their `Message-ID` saved to `processed_message_ids` when they are skipped during the pause. This prevents them from all being processed concurrently when the conversation is unpaused.

## Remaining Work
1. Start Iteration 3 by spawning Explorers to address the 4 bugs listed above.
2. Dispatch a Worker with the resulting strategy.
3. Dispatch Verifiers to ensure the fixes are robust and no integrity violations occur.
4. If passing, conclude Milestone 2.

## Key Artifacts
- `/home/dazaran/Загрузки/OUT Tattoo WEB/.agents/sub_orch_m2/SCOPE.md`
- `/home/dazaran/Загрузки/OUT Tattoo WEB/.agents/sub_orch_m2/BRIEFING.md`
- `/home/dazaran/Загрузки/OUT Tattoo WEB/.agents/sub_orch_m2/progress.md`
