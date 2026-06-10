# Handoff Report

## Observation
I investigated `backend/app/services/email_lead_agent.py` to verify the core logic and assess the 4 specified bugs.

- **UNSEEN logic**: Verified. Uses `(BODY.PEEK[])` (lines 461, 513) to retain the `\Seen` flag, ensuring stealth mode.
- **Gemini extraction**: Verified. API payload strictly enforces a structured JSON schema including all required extracted fields (lines 101-115).
- **Price calc**: Verified. Correctly applies thresholds and multipliers for dynamic pricing across CZK, EUR, and PLN (lines 334-354).
- **IMAP append**: Verified. Appends replies to the `Sent` folder with `\Seen` (lines 172-177).
- **Bug (a) - Synthetic Hash fallback**: Verified as already implemented. Lines 481-484 fallback to a SHA-256 hash if `msg_id` is missing.
- **Bug (c) - Early commit**: Verified as already correctly implemented. `processed_message_ids` is appended strictly after `send_smtp_reply` executes for both active (line 418) and completed (line 396) conversation states.
- **Bug (b) - Cache query for is_paused**: The code queries `email_lead_conversations` inside the `for e_uid in email_uids:` loop for every email (line 493), leading to O(N) duplicate queries when multiple emails arrive from the same sender in the same batch.
- **Bug (d) - Race condition unpausing**: When an email is skipped due to `is_paused` (lines 496-499), its `msg_id` is not recorded. Because the email remains UNSEEN, if the conversation is unpaused and the process restarts, the agent will incorrectly process this historic email.

## Logic Chain
1. Since (a) and (c) are already present in the source file, no further implementation is required for them.
2. The core workflows (UNSEEN, Gemini, pricing, IMAP) are structurally sound and functioning as requested.
3. For (b), introducing an in-memory dictionary (`conv_cache`) within `check_lead_emails` will store conversation records by `sender_email` upon first encounter. Subsequent emails from the same sender in that batch will use the cache, neutralizing the O(N) query redundancy.
4. For (d), updating the database query to select `id` alongside `is_paused, collected_data, state` enables targeted updates. When an email from a paused conversation is intercepted, appending its `msg_id` to `processed_message_ids` and pushing that update to Supabase ensures that historic messages remain permanently bypassed even if the conversation is unpaused later.

## Caveats
- The cache for (b) will only persist for the duration of a single `check_lead_emails` loop execution (a single polling cycle). This is sufficient for solving O(N) batch redundancy for threads.
- The stealth UNSEEN logic means the `SEARCH` command will return a continuously growing list of historic unseen emails, though `seen_uids` efficiently filters them locally.

## Conclusion
Core mechanics and bugs (a) and (c) are already correct. Implementers should focus solely on bugs (b) and (d):
1. **Fix (b)**: Wrap the DB query on line 493 with an in-memory `conv_cache` dictionary keyed by `sender_email`.
2. **Fix (d)**: Add `id` to the `select()` call on line 493. In the `is_paused` check block (lines 496-499), mutate the `processed_message_ids` array with the current `msg_id` and execute a Supabase `.update()` on that conversation before `skip_email = True`.

## Verification Method
- **(b)**: Add a mock test sending 3 emails from the same sender and assert that the Supabase client mock only registers exactly 1 `select` call for that sender.
- **(d)**: Pause a conversation, send a mock email, unpause the conversation, and restart the agent. Assert that the unpaused agent ignores the mock email and that its `msg_id` is correctly saved in the conversation's `processed_message_ids` in the DB.
